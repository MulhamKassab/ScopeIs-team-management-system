import "server-only";
import { bookingRepository } from "@/modules/outsourcing/repositories";
import { monthDays } from "./calendar-dates";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, employeeProfiles, locations, projects, scheduleAssignments as a, schedulePeriods as p, users } from "@/db/schema";
import { resolveCurrentActor, resolveScope } from "@/modules/authorization/current-actor";
import { SchedulingDomainError } from "./domain-error";

export type TimetableEntry = {
  id: string; periodId: string; employeeId: string; employeeName: string;
  projectId: string; clientId: string; clientName: string; projectName: string; locationName: string;
  date: string; start: string; end: string; instruction: string | null;
  status: "DRAFT" | "PROPOSED" | "PUBLISHED";
  bookingId?: string;
};

/** Read current authority before projecting the minimal calendar payload. */
export async function getTimetable(actor: { id: string }, month: string, planning = false): Promise<TimetableEntry[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new SchedulingDomainError("VALIDATION_ERROR");
  const current = await resolveCurrentActor(actor);
  if (!current) throw new SchedulingDomainError("FORBIDDEN");
  const scope = resolveScope(current);
  const conditions = [sql`${a.omittedAt} is null`, eq(p.planningMonth, `${month}-01`), current.role === "SUPER_ADMIN" && planning
    ? inArray(p.status, ["DRAFT", "PROPOSED"])
    : and(eq(p.status, "PUBLISHED"), eq(p.isCurrent, true))!];
  if (current.role === "EMPLOYEE") conditions.push(eq(a.employeeUserId, current.id));
  if (current.role === "ADMIN") {
    const operational = [scope.clientIds.length ? inArray(p.clientId, scope.clientIds) : sql`false`, scope.projectIds.length ? inArray(a.projectId, scope.projectIds) : sql`false`, scope.locationIds.length ? inArray(a.locationId, scope.locationIds) : sql`false`];
    conditions.push(scope.teams.length ? inArray(employeeProfiles.team, scope.teams) : sql`false`, or(...operational)!);
  }
  const rows = await db.select({ id: a.id, periodId: p.id, employeeId: users.id, employeeName: users.displayName,
    projectId: projects.id, clientId: clients.id, clientName: clients.companyName, projectName: projects.name, locationName: locations.name,
    date: a.assignmentDate, start: a.startTime, end: a.endTime, instruction: a.sharedInstruction, status: p.status })
    .from(a).innerJoin(p, eq(a.schedulePeriodId, p.id)).innerJoin(users, eq(a.employeeUserId, users.id))
    .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).innerJoin(clients, eq(p.clientId, clients.id))
    .innerJoin(projects, eq(a.projectId, projects.id)).innerJoin(locations, eq(a.locationId, locations.id))
    .where(and(...conditions)).orderBy(asc(a.assignmentDate), asc(a.startTime), asc(users.displayName), asc(a.id));
  const days = monthDays(month);
  const bookings = await bookingRepository.visible(db, current, { start: days[0]!, end: days.at(-1)! });
  const bookingEntries: TimetableEntry[] = bookings.flatMap(({ booking, employeeName, clientName }) => days.filter((day) => day >= booking.startDate && day <= booking.endDate).map((day) => ({
    id: `booking:${booking.id}:${day}`, bookingId: booking.id, periodId: "", projectId: "", employeeId: booking.employeeUserId, employeeName,
    clientId: booking.clientId, clientName, projectName: clientName, locationName: "Outsourced to client", date: day,
    start: "00:00", end: "24:00", instruction: booking.note, status: "PUBLISHED" as const,
  })));
  return [...rows.map((row) => ({ ...row, start: row.start.slice(0, 5), end: row.end.slice(0, 5) })), ...bookingEntries].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.employeeName.localeCompare(b.employeeName));
}
