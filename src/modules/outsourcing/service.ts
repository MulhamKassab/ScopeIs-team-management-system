import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { adminScopeGrants, clientBookings, clients, employeeProfiles, users } from "@/db/schema";
import { resolveCurrentActor, type CurrentActor } from "@/modules/authorization/current-actor";
import { leaveRepository } from "@/modules/leave/repositories";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import { bookingRepository, type BookingTransaction } from "./repositories";

export class BookingError extends Error {}
const date = z.iso.date().refine((value) => value >= "2000-01-01" && value <= "2100-12-31");
const bookingSchema = z.object({ clientId: z.uuid(), employeeIds: z.array(z.string().min(1).max(200)).min(1).max(100), startDate: date, endDate: date, note: z.string().trim().max(1000).default("") })
  .refine((value) => value.endDate >= value.startDate && (Date.parse(value.endDate) - Date.parse(value.startDate)) / 86400000 < 366, { message: "Choose an end date on or after the start, with no more than 366 days per booking." });

async function manager(tx: BookingTransaction, actor: AuthenticatedActor) {
  const [current] = await tx.select().from(users).where(eq(users.id, actor.id)).for("share");
  if (!current?.active || current.sessionVersion !== actor.sessionVersion || !["SUPER_ADMIN", "ADMIN"].includes(current.role)) throw new BookingError("You do not have permission to manage client bookings.");
  const grants = await tx.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, actor.id), eq(adminScopeGrants.active, true))).for("share");
  return { ...actor, role: current.role, scopes: grants.map((g) => ({ type: g.scopeType, reference: g.scopeReference })) };
}
function clientAllowed(actor: CurrentActor, clientId: string) { return actor.role === "SUPER_ADMIN" || actor.role === "ADMIN" && actor.scopes.some((s) => s.type === "CLIENT" && s.reference === clientId); }
function employeeAllowed(actor: CurrentActor, team: string | null) { return actor.role === "SUPER_ADMIN" || actor.role === "ADMIN" && team !== null && actor.scopes.some((s) => s.type === "TEAM" && s.reference === team); }
export function bookingDates(start: string, end: string) {
  const dates: string[] = [];
  for (let timestamp = Date.parse(start); timestamp <= Date.parse(end); timestamp += 86400000) dates.push(new Date(timestamp).toISOString().slice(0, 10));
  return dates;
}
export const outsourcingService = {
  async options(actor: AuthenticatedActor) {
    const current = await resolveCurrentActor(actor);
    if (!current || current.role === "EMPLOYEE") throw new BookingError("You do not have permission to manage client bookings.");
    const [clientRows, people] = await Promise.all([
      db.select({ id: clients.id, companyName: clients.companyName }).from(clients).where(eq(clients.status, "ACTIVE")),
      db.select({ id: users.id, displayName: users.displayName, team: employeeProfiles.team }).from(users).innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).where(and(eq(users.active, true), eq(users.role, "EMPLOYEE"))),
    ]);
    return { clients: clientRows.filter((c) => clientAllowed(current, c.id)).sort((a, b) => a.companyName.localeCompare(b.companyName)), employees: people.filter((p) => employeeAllowed(current, p.team)).map(({ id, displayName }) => ({ id, displayName })).sort((a, b) => a.displayName.localeCompare(b.displayName)) };
  },
  async list(actor: AuthenticatedActor, range?: { start: string; end: string }, clientId?: string) {
    const current = await resolveCurrentActor(actor);
    if (!current) throw new BookingError("Your session expired.");
    return bookingRepository.visible(db, current, range, clientId);
  },
  async create(supplied: AuthenticatedActor, input: unknown) {
    const parsed = bookingSchema.safeParse(input);
    if (!parsed.success) throw new BookingError(parsed.error.issues[0]?.message ?? "Check the booking details.");
    const data = parsed.data;
    const employeeIds = [...new Set(data.employeeIds)].sort();
    return db.transaction(async (tx) => {
      const actor = await manager(tx, supplied);
      if (!clientAllowed(actor, data.clientId)) throw new BookingError("Choose a client within your access.");
      const [client] = await tx.select().from(clients).where(eq(clients.id, data.clientId)).for("share");
      if (!client || client.status !== "ACTIVE") throw new BookingError("Choose an active client.");
      const employees = await tx.select({ id: users.id, displayName: users.displayName, team: employeeProfiles.team, active: users.active, role: users.role }).from(users).innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).where(inArray(users.id, employeeIds)).for("share");
      if (employees.length !== employeeIds.length || employees.some((p) => !p.active || p.role !== "EMPLOYEE" || !employeeAllowed(actor, p.team))) throw new BookingError("Choose active employees within your team access.");
      const dates = bookingDates(data.startDate, data.endDate);
      // Share employee/day locks with schedule writes, then the employee leave lock with leave decisions.
      const lockKeys = employeeIds.flatMap((id) => dates.map((day) => `schedule-overlap:${id}:${day}`));
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(lock_key)) from (select unnest(array[${sql.join(lockKeys.map((key) => sql`${key}`), sql`, `)}]::text[]) as lock_key order by lock_key) ordered_locks`);
      for (const id of employeeIds) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`leave:${id}`}))`);
      for (const id of employeeIds) {
        const name = employees.find((p) => p.id === id)!.displayName;
        if ((await bookingRepository.overlapping(tx, id, data.startDate, data.endDate)).length) throw new BookingError(`${name} already has a client booking during these dates.`);
        if ((await leaveRepository.approvedIntersecting(tx, id, data.startDate, data.endDate)).length) throw new BookingError(`${name} has approved leave during these dates.`);
        const conflict = await bookingRepository.scheduledConflict(tx, id, data.startDate, data.endDate);
        if (conflict) throw new BookingError(`${name} already has scheduled or planned work on ${conflict.date}. Choose other dates or revise that work first.`);
      }
      const rows = await tx.insert(clientBookings).values(employeeIds.map((employeeUserId) => ({ clientId: data.clientId, employeeUserId, startDate: data.startDate, endDate: data.endDate, note: data.note || null, createdByUserId: actor.id }))).returning();
      for (const row of rows) await writeAuditEvent(tx, { actor, action: "client_booking.created", targetType: "client_booking", targetId: row.id, metadata: { clientId: row.clientId, employeeUserId: row.employeeUserId, startDate: row.startDate, endDate: row.endDate } });
      return rows;
    });
  },
  async cancel(supplied: AuthenticatedActor, input: unknown) {
    const parsed = z.object({ id: z.uuid(), version: z.number().int().positive() }).safeParse(input);
    if (!parsed.success) throw new BookingError("Reload the booking and try again.");
    return db.transaction(async (tx) => {
      const actor = await manager(tx, supplied);
      const [row] = await tx.select().from(clientBookings).where(eq(clientBookings.id, parsed.data.id)).for("update");
      if (!row || row.cancelledAt || row.version !== parsed.data.version) throw new BookingError("This booking changed. Reload and try again.");
      const [person] = await tx.select().from(employeeProfiles).where(eq(employeeProfiles.userId, row.employeeUserId)).for("share");
      if (!clientAllowed(actor, row.clientId) || !person || !employeeAllowed(actor, person.team)) throw new BookingError("This booking is outside your access.");
      await tx.update(clientBookings).set({ cancelledAt: new Date(), cancelledByUserId: actor.id, version: row.version + 1, updatedAt: new Date() }).where(and(eq(clientBookings.id, row.id), eq(clientBookings.version, row.version), isNull(clientBookings.cancelledAt)));
      await writeAuditEvent(tx, { actor, action: "client_booking.cancelled", targetType: "client_booking", targetId: row.id, metadata: { clientId: row.clientId, employeeUserId: row.employeeUserId, startDate: row.startDate, endDate: row.endDate } });
    });
  },
};
