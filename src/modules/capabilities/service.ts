import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { assignmentSkillRequirements, scheduleAssignments, users } from "@/db/schema";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { CapabilityDomainError } from "@/modules/capabilities/domain-error";
import { capabilityRepository, type CapabilityExecutor, type CapabilityTransaction } from "@/modules/capabilities/repositories";
import { assignmentRequirementArchiveSchema, assignmentRequirementCreateSchema, parseCapabilities, plannerSkillSchema } from "@/modules/capabilities/validation";
import type { AuthenticatedActor } from "@/shared/types/foundation";

type AuditWriter = typeof writeAuditEvent;
export type MissingSkillWarning = { assignmentId: string; employeeName: string; assignmentDate: string; missingSkills: { id: string; name: string; sources: ("Client" | "Project" | "Location" | "Assignment")[] }[] };

export class CapabilityService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent) {}
  private audit(tx: CapabilityTransaction, actor: AuthenticatedActor, action: string, targetId: string, metadata: Record<string, unknown>) { return this.auditWriter(tx, { actor, action, targetType: "skill_requirement", targetId, metadata }); }
  private async requirePlanner(tx: CapabilityTransaction, supplied: AuthenticatedActor): Promise<AuthenticatedActor> {
    if (supplied.role !== "SUPER_ADMIN") throw new CapabilityDomainError("FORBIDDEN");
    const [current] = await tx.select({ id: users.id, displayName: users.displayName, role: users.role, active: users.active, sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, supplied.id)).limit(1).for("share");
    if (!current?.active || current.role !== "SUPER_ADMIN" || current.sessionVersion !== supplied.sessionVersion) throw new CapabilityDomainError("FORBIDDEN");
    return { ...supplied, id: current.id, displayName: current.displayName, role: current.role, scopes: [] };
  }
  private async assertAssignmentManage(actor: AuthenticatedActor, executor: CapabilityExecutor, assignmentId: string) {
    if (actor.role !== "SUPER_ADMIN") throw new CapabilityDomainError("FORBIDDEN");
    const row = await capabilityRepository.assignment(executor, assignmentId); if (!row) throw new CapabilityDomainError("NOT_FOUND");
    if (row.period.status !== "DRAFT") throw new CapabilityDomainError("INVALID_STATE");
    return row;
  }
  async addAssignmentRequirement(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseCapabilities(assignmentRequirementCreateSchema, input);
    return db.transaction(async (tx) => { actor = await this.requirePlanner(tx, actor); const source = await this.assertAssignmentManage(actor, tx, parsed.assignmentId); await tx.execute(sql`select id from schedule_periods where id = ${source.period.id} for update`); await capabilityRepository.lockAssignment(tx, parsed.assignmentId); const assignment = await this.assertAssignmentManage(actor, tx, parsed.assignmentId); const skill = await capabilityRepository.skill(tx, parsed.skillId); if (!skill?.active) throw new CapabilityDomainError("INACTIVE_SKILL"); const existing = await tx.select().from(assignmentSkillRequirements).where(and(eq(assignmentSkillRequirements.scheduleAssignmentId, parsed.assignmentId), eq(assignmentSkillRequirements.skillId, parsed.skillId))).limit(1).then(([row]) => row ?? null); if (existing?.archivedAt) throw new CapabilityDomainError("DUPLICATE_REQUIREMENT", "Archived assignment requirements are retained; create a new Draft assignment if its work requirements change."); if (existing) throw new CapabilityDomainError("DUPLICATE_REQUIREMENT"); const row = await capabilityRepository.createAssignmentRequirement(tx, parsed.assignmentId, parsed.skillId); await this.audit(tx, actor, "assignment_skill_requirement.created", row.id, { assignmentId: parsed.assignmentId, skillId: parsed.skillId, source: "ASSIGNMENT" }); return { row, assignment }; });
  }
  async archiveAssignmentRequirement(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseCapabilities(assignmentRequirementArchiveSchema, input);
    return db.transaction(async (tx) => { actor = await this.requirePlanner(tx, actor); const existing = await capabilityRepository.assignmentRequirement(tx, parsed.requirementId); if (!existing) throw new CapabilityDomainError("NOT_FOUND"); const source = await this.assertAssignmentManage(actor, tx, existing.scheduleAssignmentId); await tx.execute(sql`select id from schedule_periods where id = ${source.period.id} for update`); await capabilityRepository.lockAssignment(tx, existing.scheduleAssignmentId); await this.assertAssignmentManage(actor, tx, existing.scheduleAssignmentId); const row = await capabilityRepository.archiveAssignmentRequirement(tx, existing.id, parsed.expectedVersion); if (!row) throw new CapabilityDomainError("STALE_VERSION"); await this.audit(tx, actor, "assignment_skill_requirement.archived", row.id, { assignmentId: row.scheduleAssignmentId, skillId: row.skillId, source: "ASSIGNMENT" }); return row; });
  }
  async effectiveRequirements(executor: CapabilityExecutor, assignmentId: string) {
    const loaded = await capabilityRepository.assignment(executor, assignmentId); if (!loaded) throw new CapabilityDomainError("NOT_FOUND"); const [inherited, direct] = await Promise.all([capabilityRepository.activeRequirements(executor, loaded.assignment), capabilityRepository.assignmentRequirements(executor, assignmentId)]); const merged = new Map<string, { id: string; name: string; sources: Set<"Client" | "Project" | "Location" | "Assignment"> }>();
    for (const row of inherited) { const source = row.clientId ? "Client" : row.projectId ? "Project" : "Location"; const current = merged.get(row.skillId) ?? { id: row.skillId, name: row.skillName, sources: new Set() }; current.sources.add(source); merged.set(row.skillId, current); }
    for (const row of direct) { const current = merged.get(row.requirement.skillId) ?? { id: row.requirement.skillId, name: row.skillName, sources: new Set() }; current.sources.add("Assignment"); merged.set(row.requirement.skillId, current); }
    return { loaded, requirements: [...merged.values()].map((item) => ({ id: item.id, name: item.name, sources: [...item.sources] })) };
  }
  async missingWarning(executor: CapabilityExecutor, assignmentId: string): Promise<MissingSkillWarning | null> { const { loaded, requirements } = await this.effectiveRequirements(executor, assignmentId); if (!requirements.length) return null; const owned = new Set((await capabilityRepository.employeeSkillIds(executor, loaded.assignment.employeeUserId)).map((row) => row.skillId)); const missingSkills = requirements.filter((item) => !owned.has(item.id)); return missingSkills.length ? { assignmentId, employeeName: loaded.employeeName, assignmentDate: loaded.assignment.assignmentDate, missingSkills } : null; }
  async warningsForPeriod(actor: AuthenticatedActor, periodId: string) { if (actor.role !== "SUPER_ADMIN") throw new CapabilityDomainError("FORBIDDEN"); const ids = await capabilityRepository.periodAssignmentIds(db, periodId); const warnings = await Promise.all(ids.map(({ id }) => this.missingWarning(db, id))); return warnings.filter((warning): warning is MissingSkillWarning => Boolean(warning)); }
  async plannerCandidates(actor: AuthenticatedActor, input: unknown) { if (actor.role === "EMPLOYEE") throw new CapabilityDomainError("FORBIDDEN"); const parsed = parseCapabilities(plannerSkillSchema, input); const [skills, grants] = await Promise.all([capabilityRepository.activeSkills(db), actor.role === "ADMIN" ? capabilityRepository.activeGrants(db, actor.id) : Promise.resolve([])]); const skill = parsed.skillId ? skills.find((item) => item.id === parsed.skillId) : null; const teams = actor.role === "ADMIN" ? grants.filter((grant) => grant.scopeType === "TEAM").map((grant) => grant.scopeReference) : undefined; return { skills, selectedSkill: skill, candidates: skill ? await capabilityRepository.candidates(db, skill.id, teams) : [] }; }
  async catalogue(actor: AuthenticatedActor) { if (actor.role !== "SUPER_ADMIN") throw new CapabilityDomainError("FORBIDDEN"); return capabilityRepository.allSkills(db); }
}
export const capabilityService = new CapabilityService();
