import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { employeePlanningLocations, employeeProfiles, users } from "@/db/schema";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import type { AuthenticatedActor } from "@/shared/types/foundation";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
const base = { userId: z.string().min(1).max(160), expectedProfileVersion: z.number().int().positive(), expectedVersion: z.number().int().nonnegative() };
const schema = z.discriminatedUnion("operation", [
  z.object({ ...base, operation: z.literal("save"), latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }).strict(),
  z.object({ ...base, operation: z.literal("clear") }).strict(),
]);

async function authority(executor: Executor, actor: AuthenticatedActor, lock = false) {
  if (actor.role !== "SUPER_ADMIN") throw new EmployeeDomainError("FORBIDDEN");
  const query = executor.select().from(users).where(eq(users.id, actor.id)).limit(1);
  const [current] = await (lock ? query.for("share") : query);
  if (!current?.active || current.role !== "SUPER_ADMIN" || current.sessionVersion !== actor.sessionVersion) throw new EmployeeDomainError("FORBIDDEN");
}

export const planningLocationService = {
  async read(actor: AuthenticatedActor, userId: string) {
    await authority(db, actor);
    const [profile] = await db.select({ id: employeeProfiles.userId }).from(employeeProfiles).where(eq(employeeProfiles.userId, userId)).limit(1);
    if (!profile) throw new EmployeeDomainError("NOT_FOUND");
    const [row] = await db.select({ latitude: employeePlanningLocations.latitude, longitude: employeePlanningLocations.longitude, version: employeePlanningLocations.version }).from(employeePlanningLocations).where(eq(employeePlanningLocations.employeeUserId, userId)).limit(1);
    return row ?? null;
  },
  async change(actor: AuthenticatedActor, input: unknown) {
    const parsed = schema.safeParse(input); if (!parsed.success) throw new EmployeeDomainError("VALIDATION_ERROR");
    const value = parsed.data;
    return db.transaction(async (tx) => {
      await authority(tx, actor, true);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`planning-location:${value.userId}`}))`);
      const [profile] = await tx.select().from(employeeProfiles).where(eq(employeeProfiles.userId, value.userId)).limit(1).for("update");
      if (!profile) throw new EmployeeDomainError("NOT_FOUND");
      const [existing] = await tx.select().from(employeePlanningLocations).where(eq(employeePlanningLocations.employeeUserId, value.userId)).limit(1);
      // The profile version also prevents delete/recreate from reusing an old coordinate version.
      if (profile.version !== value.expectedProfileVersion || (existing?.version ?? 0) !== value.expectedVersion) throw new EmployeeDomainError("STALE_VERSION");
      if (value.operation === "clear") {
        if (!existing) throw new EmployeeDomainError("NOT_FOUND");
        await tx.delete(employeePlanningLocations).where(eq(employeePlanningLocations.employeeUserId, value.userId));
      } else if (existing) {
        await tx.update(employeePlanningLocations).set({ latitude: value.latitude, longitude: value.longitude, version: existing.version + 1, updatedAt: new Date() }).where(eq(employeePlanningLocations.employeeUserId, value.userId));
      } else await tx.insert(employeePlanningLocations).values({ employeeUserId: value.userId, latitude: value.latitude, longitude: value.longitude });
      const [updated] = await tx.update(employeeProfiles).set({ version: profile.version + 1, updatedAt: new Date() }).where(and(eq(employeeProfiles.userId, value.userId), eq(employeeProfiles.version, profile.version))).returning({ version: employeeProfiles.version });
      if (!updated) throw new EmployeeDomainError("STALE_VERSION");
      await writeAuditEvent(tx, { actor, action: value.operation === "clear" ? "employee_planning_location.cleared" : "employee_planning_location.saved", targetType: "employee_planning_location", targetId: value.userId, metadata: { version: updated.version, fields: ["planningLocation"] } });
      return updated;
    });
  },
};
