import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { designations, employeeProfiles, teams, users } from "@/db/schema";
import { resolveCurrentActor } from "@/modules/authorization/current-actor";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import type { EmployeeActor } from "./contracts";
import { EmployeeDomainError } from "./domain-error";
import { employeeCatalogueService, employeeProfileService } from "./employee-services";
import { listTeamOptions } from "./team-options";

export type OrganisationMember = { id: string; name: string; role: string; active: boolean; team: string | null; designationId: string | null; version: number };
async function authority(actor: EmployeeActor) {
  const current = await resolveCurrentActor(actor);
  if (current?.role !== "SUPER_ADMIN") throw new EmployeeDomainError("FORBIDDEN");
  return { ...actor, ...current };
}
function nameValue(value: string) { const name = value.trim().replace(/\s+/g, " "); if (!name || name.length > 120) throw new EmployeeDomainError("VALIDATION_ERROR"); return name; }
export const organisationService = {
  async list(actor: EmployeeActor) {
    await authority(actor);
    const [teamOptions, designationOptions, members] = await Promise.all([listTeamOptions(), db.select({ id: designations.id, name: designations.name, active: designations.active, version: designations.version }).from(designations).orderBy(asc(designations.name)), db.select({ id: users.id, name: users.displayName, role: users.role, active: users.active, team: employeeProfiles.team, designationId: employeeProfiles.designationId, version: employeeProfiles.version }).from(employeeProfiles).innerJoin(users, eq(users.id, employeeProfiles.userId)).orderBy(asc(users.displayName))]);
    return { teams: teamOptions, designations: designationOptions, members };
  },
  async saveTeam(actor: EmployeeActor, input: { id?: string; name: string; expectedVersion?: number }) {
    const current = await authority(actor); const name = nameValue(input.name);
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'team-name:' + name.toLowerCase()}))`);
      const [duplicate] = await tx.select({ id: teams.id }).from(teams).where(sql`lower(${teams.name}) = ${name.toLowerCase()}`).limit(1);
      if (duplicate && duplicate.id !== input.id) throw new EmployeeDomainError("DUPLICATE_NAME");
      let team;
      if (input.id) {
        if (!Number.isInteger(input.expectedVersion) || input.expectedVersion! < 1) throw new EmployeeDomainError("STALE_VERSION");
        [team] = await tx.update(teams).set({ name, version: input.expectedVersion! + 1, updatedAt: new Date() }).where(and(eq(teams.id, input.id), eq(teams.version, input.expectedVersion!))).returning();
        if (!team) throw new EmployeeDomainError("STALE_VERSION");
      } else { [team] = await tx.insert(teams).values({ id: `team:${randomUUID()}`, name }).returning(); }
      await writeAuditEvent(tx, { actor: current, action: input.id ? "team.updated" : "team.created", targetType: "team", targetId: team.id, metadata: { fields: ["name"], version: team.version } });
      return team;
    });
  },
  async saveDesignation(actor: EmployeeActor, input: { id?: string; name: string; expectedVersion?: number }) {
    const current = await authority(actor); const name = nameValue(input.name);
    return input.id ? employeeCatalogueService.updateDesignation(current, input.id, { name, expectedVersion: input.expectedVersion! }) : employeeCatalogueService.createDesignation(current, { name });
  },
  async setMember(actor: EmployeeActor, input: { kind: "team" | "designation"; reference: string; userId: string; expectedVersion: number; remove: boolean }) {
    const current = await authority(actor);
    const [profile] = await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, input.userId)).limit(1);
    if (!profile) throw new EmployeeDomainError("NOT_FOUND");
    if (input.remove && (input.kind === "team" ? profile.team : profile.designationId) !== input.reference) throw new EmployeeDomainError("STALE_VERSION");
    if (input.kind === "team" && !(await listTeamOptions()).some((team) => team.id === input.reference)) throw new EmployeeDomainError("VALIDATION_ERROR");
    return employeeProfileService.updateManagementAssignments(current, input.userId, { expectedVersion: input.expectedVersion, ...(input.kind === "team" ? { team: input.remove ? null : input.reference } : { designationId: input.remove ? null : input.reference }) });
  },
};
