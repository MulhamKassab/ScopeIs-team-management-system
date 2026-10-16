import "server-only";
import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { clientBookings, clients, employeeProfiles, scheduleAssignments, schedulePeriods, users } from "@/db/schema";
import type { CurrentActor } from "@/modules/authorization/current-actor";

export type BookingTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type BookingExecutor = typeof db | BookingTransaction;
export const bookingRepository = {
  scheduledConflict(executor: BookingExecutor, employeeId: string, start: string, end: string) {
    return executor.select({ date: scheduleAssignments.assignmentDate }).from(scheduleAssignments).innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(eq(scheduleAssignments.employeeUserId, employeeId), isNull(scheduleAssignments.omittedAt), gte(scheduleAssignments.assignmentDate, start), lte(scheduleAssignments.assignmentDate, end), or(inArray(schedulePeriods.status, ["DRAFT", "PROPOSED"]), and(eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true))))).limit(1).then(([row]) => row);
  },
  overlapping(executor: BookingExecutor, employeeId: string, start: string, end: string) {
    return executor.select({ id: clientBookings.id, clientId: clientBookings.clientId, clientName: clients.companyName, startDate: clientBookings.startDate, endDate: clientBookings.endDate })
      .from(clientBookings).innerJoin(clients, eq(clients.id, clientBookings.clientId))
      .where(and(eq(clientBookings.employeeUserId, employeeId), isNull(clientBookings.cancelledAt), lte(clientBookings.startDate, end), gte(clientBookings.endDate, start))).orderBy(asc(clientBookings.startDate));
  },
  visible(executor: BookingExecutor, actor: CurrentActor, range?: { start: string; end: string }, clientId?: string) {
    const teams = actor.scopes.filter((s) => s.type === "TEAM").map((s) => s.reference);
    const clientIds = actor.scopes.filter((s) => s.type === "CLIENT").map((s) => s.reference);
    return executor.select({ booking: clientBookings, employeeName: users.displayName, clientName: clients.companyName })
      .from(clientBookings).innerJoin(users, eq(users.id, clientBookings.employeeUserId)).innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).innerJoin(clients, eq(clients.id, clientBookings.clientId))
      .where(and(isNull(clientBookings.cancelledAt), clientId ? eq(clientBookings.clientId, clientId) : undefined,
        range ? and(lte(clientBookings.startDate, range.end), gte(clientBookings.endDate, range.start)) : undefined,
        actor.role === "EMPLOYEE" ? eq(clientBookings.employeeUserId, actor.id) : actor.role === "ADMIN" ? and(teams.length ? inArray(employeeProfiles.team, teams) : sql`false`, clientIds.length ? inArray(clientBookings.clientId, clientIds) : sql`false`) : undefined))
      .orderBy(asc(clientBookings.startDate), asc(users.displayName));
  },
};
