import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, locations, projects, scheduleAssignments, schedulePeriods } from "@/db/schema";
import { canReadEmployee } from "@/modules/employees/employee-policy";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { createNotification } from "@/modules/notifications/notification-service";
import { hasClientManagementScope, hasOperationalTargetScope } from "@/modules/authorization/operational-scope";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import { SchedulingDomainError } from "@/modules/scheduling/domain-error";
import { schedulingRepository, type SchedulingExecutor, type SchedulingTransaction } from "@/modules/scheduling/repositories";
import { assignmentCreateSchema, assignmentRemoveSchema, assignmentUpdateSchema, createPeriodSchema, parseSchedule, periodVersionSchema, revisionSchema, returnPeriodSchema, scheduleMonthSchema } from "@/modules/scheduling/validation";

export const PLANNING_TIMEZONE = "Asia/Dubai" as const;
type AuditWriter = typeof writeAuditEvent;

function isUnique(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "23505"; }
function sameTime(value: string | null | undefined, input: string) { return value?.slice(0, 5) === input; }
function periodMonth(period: { planningMonth: string }) { return period.planningMonth.slice(0, 7); }

export class SchedulingService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent) {}
  private audit(tx: SchedulingTransaction, actor: AuthenticatedActor, action: string, targetId: string, metadata: Record<string, unknown> = {}) { return this.auditWriter(tx, { actor, action, targetType: "schedule_period", targetId, metadata }); }
  private async grants(executor: SchedulingExecutor, actor: AuthenticatedActor) { return actor.role === "ADMIN" ? schedulingRepository.activeGrants(executor, actor.id) : []; }

  private async requireClient(executor: SchedulingExecutor, actor: AuthenticatedActor, clientId: string, management = false) {
    const client = await schedulingRepository.client(executor, clientId);
    if (!client) throw new SchedulingDomainError("NOT_FOUND");
    const grants = await this.grants(executor, actor);
    if (!(management ? hasClientManagementScope(actor, grants, clientId) : hasOperationalTargetScope(actor, grants, "CLIENT", clientId, clientId))) throw new SchedulingDomainError("OUT_OF_SCOPE");
    return client;
  }

  private async requirePeriod(executor: SchedulingExecutor, actor: AuthenticatedActor, periodId: string, management = false) {
    const period = await schedulingRepository.period(executor, periodId);
    if (!period) throw new SchedulingDomainError("NOT_FOUND");
    const grants = await this.grants(executor, actor);
    if (actor.role === "SUPER_ADMIN") return period;
    if (actor.role !== "ADMIN") throw new SchedulingDomainError("FORBIDDEN");
    const allowedClient = grants.some((grant) => grant.scopeType === "CLIENT" && grant.scopeReference === period.clientId);
    if (management && !allowedClient) throw new SchedulingDomainError("OUT_OF_SCOPE");
    if (allowedClient) return period;
    if (management) throw new SchedulingDomainError("OUT_OF_SCOPE");
    const assignments = await schedulingRepository.allAssignments(executor, period.id);
    const scopedProjectIds = grants.filter((grant) => grant.scopeType === "PROJECT").map((grant) => grant.scopeReference);
    const scopedLocationIds = grants.filter((grant) => grant.scopeType === "LOCATION").map((grant) => grant.scopeReference);
    const [scopedProjects, scopedLocations] = await Promise.all([Promise.all(scopedProjectIds.map((id) => schedulingRepository.project(executor, id))), Promise.all(scopedLocationIds.map((id) => schedulingRepository.location(executor, id)))]);
    const allowed = assignments.some((assignment) => grants.some((grant) => (grant.scopeType === "PROJECT" && grant.scopeReference === assignment.projectId) || (grant.scopeType === "LOCATION" && grant.scopeReference === assignment.locationId)))
      || scopedProjects.some((project) => project?.clientId === period.clientId) || scopedLocations.some((location) => location?.clientId === period.clientId);
    if (!allowed) throw new SchedulingDomainError("OUT_OF_SCOPE");
    return period;
  }

  private async visibleEmployee(executor: SchedulingExecutor, actor: AuthenticatedActor, employeeUserId: string) {
    const row = await schedulingRepository.employee(executor, employeeUserId);
    if (!row || !row.user.active || row.user.role !== "EMPLOYEE") throw new SchedulingDomainError("INVALID_EMPLOYEE");
    const grants = await this.grants(executor, actor);
    const refreshedActor = { ...actor, scopes: grants.map((grant) => ({ type: grant.scopeType as "TEAM" | "CLIENT" | "PROJECT" | "LOCATION", reference: grant.scopeReference })) };
    if (!canReadEmployee(refreshedActor, { userId: row.user.id, team: row.profile.team, role: row.user.role })) throw new SchedulingDomainError("NO_EMPLOYEE_VISIBILITY");
    return row;
  }

  private async lockOverlap(tx: SchedulingTransaction, employeeUserId: string, assignmentDate: string) { await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`schedule-overlap:${employeeUserId}:${assignmentDate}`}))`); }

  private async assertNoOverlap(tx: SchedulingTransaction, period: typeof schedulePeriods.$inferSelect, input: { employeeUserId: string; assignmentDate: string; startTime: string; endTime: string; copiedFromAssignmentId?: string | null }, excludeAssignmentId?: string) {
    await this.lockOverlap(tx, input.employeeUserId, input.assignmentDate);
    const candidates = await schedulingRepository.overlapCandidates(tx, input);
    for (const candidate of candidates) {
      if (candidate.assignment.id === excludeAssignmentId) continue;
      const isUnchangedPredecessor = period.parentPeriodId === candidate.period.id && input.copiedFromAssignmentId === candidate.assignment.id && candidate.period.status === "PUBLISHED" && sameTime(candidate.assignment.startTime, input.startTime) && sameTime(candidate.assignment.endTime, input.endTime) && candidate.assignment.employeeUserId === input.employeeUserId && candidate.assignment.assignmentDate === input.assignmentDate;
      if (!isUnchangedPredecessor) throw new SchedulingDomainError("OVERLAP");
    }
  }

  private async validateReferences(tx: SchedulingTransaction, period: typeof schedulePeriods.$inferSelect, input: { employeeUserId: string; projectId: string; locationId: string; assignmentDate: string; startTime: string; endTime: string }) {
    if (!input.assignmentDate.startsWith(periodMonth(period))) throw new SchedulingDomainError("VALIDATION_ERROR");
    if (input.endTime <= input.startTime) throw new SchedulingDomainError("VALIDATION_ERROR");
    const [project, location, link] = await Promise.all([schedulingRepository.project(tx, input.projectId), schedulingRepository.location(tx, input.locationId), schedulingRepository.projectLocation(tx, input.projectId, input.locationId)]);
    if (!project || !location || !link || project.clientId !== period.clientId || location.clientId !== period.clientId || project.status === "ARCHIVED" || location.status === "ARCHIVED") throw new SchedulingDomainError("INVALID_RELATIONSHIP");
    const employee = await schedulingRepository.employee(tx, input.employeeUserId);
    if (!employee?.user.active || employee.user.role !== "EMPLOYEE") throw new SchedulingDomainError("INVALID_EMPLOYEE");
  }

  private async bumpPeriod(tx: SchedulingTransaction, period: typeof schedulePeriods.$inferSelect) {
    const updated = await schedulingRepository.updatePeriod(tx, period.id, period.version, {});
    if (!updated) throw new SchedulingDomainError("STALE_VERSION");
    return updated;
  }

  async listVisibleEmployees(actor: AuthenticatedActor) {
    if (actor.role === "EMPLOYEE") throw new SchedulingDomainError("FORBIDDEN");
    const grants = await this.grants(db, actor);
    return schedulingRepository.visibleEmployees(db, actor.role === "SUPER_ADMIN" ? undefined : grants.filter((grant) => grant.scopeType === "TEAM").map((grant) => grant.scopeReference));
  }

  async getWorkspace(actor: AuthenticatedActor, input: unknown = {}) {
    const parsed = parseSchedule(scheduleMonthSchema, input);
    if (actor.role === "EMPLOYEE") return { kind: "employee" as const, month: parsed.month, assignments: await this.getMySchedule(actor, parsed) };
    const grants = await this.grants(db, actor);
    const clientIds = actor.role === "SUPER_ADMIN" ? (await schedulingRepository.activeClients(db)).map((client) => client.id) : grants.filter((grant) => grant.scopeType === "CLIENT").map((grant) => grant.scopeReference);
    const projectIds = actor.role === "SUPER_ADMIN" ? [] : grants.filter((grant) => grant.scopeType === "PROJECT").map((grant) => grant.scopeReference);
    const locationIds = actor.role === "SUPER_ADMIN" ? [] : grants.filter((grant) => grant.scopeType === "LOCATION").map((grant) => grant.scopeReference);
    const [clients, periods, employees] = await Promise.all([schedulingRepository.activeClients(db, actor.role === "SUPER_ADMIN" ? undefined : clientIds), schedulingRepository.listPeriods(db, parsed.month, clientIds, projectIds, locationIds), this.listVisibleEmployees(actor)]);
    return { kind: "manager" as const, month: parsed.month, clients, periods, employees };
  }

  async getPeriodEditor(actor: AuthenticatedActor, periodId: string) {
    const period = await this.requirePeriod(db, actor, periodId);
    const grants = await this.grants(db, actor);
    const clientScope = actor.role === "SUPER_ADMIN" || grants.some((grant) => grant.scopeType === "CLIENT" && grant.scopeReference === period.clientId);
    const projectIds = clientScope || actor.role === "SUPER_ADMIN" ? [] : grants.filter((grant) => grant.scopeType === "PROJECT").map((grant) => grant.scopeReference);
    const locationIds = clientScope || actor.role === "SUPER_ADMIN" ? [] : grants.filter((grant) => grant.scopeType === "LOCATION").map((grant) => grant.scopeReference);
    const [client, assignments, projects, employees] = await Promise.all([schedulingRepository.client(db, period.clientId), schedulingRepository.assignmentsForPeriod(db, period.id, projectIds, locationIds), schedulingRepository.projectsForClient(db, period.clientId, projectIds), this.listVisibleEmployees(actor)]);
    const locationsByProject = new Map<string, Awaited<ReturnType<typeof schedulingRepository.locationsForProject>>[number][]>();
    for (const project of projects) locationsByProject.set(project.project.id, await schedulingRepository.locationsForProject(db, period.clientId, project.project.id, locationIds));
    return { period, client, assignments, projects, locationsByProject: [...locationsByProject.entries()], employees, canManage: actor.role === "SUPER_ADMIN" || clientScope, canPropose: actor.role === "SUPER_ADMIN" || grants.some((grant) => grant.scopeType === "CLIENT" && grant.scopeReference === period.clientId), canPublish: actor.role === "SUPER_ADMIN" };
  }

  async getMySchedule(actor: AuthenticatedActor, input: unknown = {}) {
    if (actor.role !== "EMPLOYEE") throw new SchedulingDomainError("FORBIDDEN");
    const parsed = parseSchedule(scheduleMonthSchema, input);
    const rows = await db.select({ assignment: scheduleAssignments, clientName: clients.companyName, projectName: projects.name, locationName: locations.name }).from(scheduleAssignments).innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId)).innerJoin(clients, eq(clients.id, schedulePeriods.clientId)).innerJoin(projects, eq(projects.id, scheduleAssignments.projectId)).innerJoin(locations, eq(locations.id, scheduleAssignments.locationId)).where(and(eq(scheduleAssignments.employeeUserId, actor.id), eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true), eq(schedulePeriods.planningMonth, parsed.month))).orderBy(asc(scheduleAssignments.assignmentDate), asc(scheduleAssignments.startTime));
    return rows;
  }

  async createPeriod(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseSchedule(createPeriodSchema, input);
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") throw new SchedulingDomainError("FORBIDDEN");
    await this.requireClient(db, actor, parsed.clientId, true);
    try { return await db.transaction(async (tx) => { await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`schedule-period:${parsed.clientId}:${parsed.month}`}))`); const client = await schedulingRepository.client(tx, parsed.clientId); if (!client || client.status === "ARCHIVED") throw new SchedulingDomainError("ARCHIVED_RECORD"); const row = await schedulingRepository.createPeriod(tx, { clientId: parsed.clientId, planningMonth: parsed.month, lineageId: randomUUID(), revisionNumber: 1, status: "DRAFT" }); await this.audit(tx, actor, "schedule.created", row.id, { clientId: row.clientId, month: row.planningMonth, status: row.status }); return row; }); } catch (error) { if (isUnique(error)) throw new SchedulingDomainError("CONFLICT", "An active Draft or Proposed schedule already exists for this Client-month."); throw error; }
  }

  async addAssignment(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseSchedule(assignmentCreateSchema, input); const period = await this.requirePeriod(db, actor, parsed.periodId, false); if (period.status !== "DRAFT") throw new SchedulingDomainError("INVALID_STATE");
    const grants = await this.grants(db, actor); const targetScope = actor.role === "SUPER_ADMIN" || grants.some((grant) => (grant.scopeType === "CLIENT" && grant.scopeReference === period.clientId) || (grant.scopeType === "PROJECT" && grant.scopeReference === parsed.projectId) || (grant.scopeType === "LOCATION" && grant.scopeReference === parsed.locationId)); if (!targetScope) throw new SchedulingDomainError("OUT_OF_SCOPE");
    await this.visibleEmployee(db, actor, parsed.employeeUserId);
    return db.transaction(async (tx) => { await schedulingRepository.lockPeriod(tx, period.id); const current = await schedulingRepository.period(tx, period.id); if (!current || current.version !== parsed.expectedPeriodVersion) throw new SchedulingDomainError("STALE_VERSION"); if (current.status !== "DRAFT") throw new SchedulingDomainError("INVALID_STATE"); await this.validateReferences(tx, current, parsed); await this.assertNoOverlap(tx, current, parsed); const row = await schedulingRepository.createAssignment(tx, { ...parsed, schedulePeriodId: parsed.periodId }); await this.bumpPeriod(tx, current); await this.audit(tx, actor, "schedule_assignment.created", current.id, { assignmentId: row.id, employeeUserId: row.employeeUserId, projectId: row.projectId, locationId: row.locationId, date: row.assignmentDate, status: current.status }); return row; });
  }

  async updateAssignment(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseSchedule(assignmentUpdateSchema, input); const existing = await schedulingRepository.assignment(db, parsed.assignmentId); if (!existing || existing.schedulePeriodId !== parsed.periodId) throw new SchedulingDomainError("NOT_FOUND"); const period = await this.requirePeriod(db, actor, parsed.periodId, false); if (period.status !== "DRAFT") throw new SchedulingDomainError("INVALID_STATE");
    const grants = await this.grants(db, actor); const targetScope = actor.role === "SUPER_ADMIN" || grants.some((grant) => (grant.scopeType === "CLIENT" && grant.scopeReference === period.clientId) || (grant.scopeType === "PROJECT" && grant.scopeReference === parsed.projectId) || (grant.scopeType === "LOCATION" && grant.scopeReference === parsed.locationId)); if (!targetScope) throw new SchedulingDomainError("OUT_OF_SCOPE"); await this.visibleEmployee(db, actor, parsed.employeeUserId);
    return db.transaction(async (tx) => { await schedulingRepository.lockPeriod(tx, period.id); const current = await schedulingRepository.period(tx, period.id); if (!current || current.version !== parsed.expectedPeriodVersion) throw new SchedulingDomainError("STALE_VERSION"); if (existing.version !== parsed.expectedVersion) throw new SchedulingDomainError("STALE_VERSION"); await this.validateReferences(tx, current, parsed); await this.assertNoOverlap(tx, current, parsed, existing.id); const row = await schedulingRepository.updateAssignment(tx, existing.id, parsed.expectedVersion, { employeeUserId: parsed.employeeUserId, projectId: parsed.projectId, locationId: parsed.locationId, assignmentDate: parsed.assignmentDate, startTime: parsed.startTime, endTime: parsed.endTime, sharedInstruction: parsed.sharedInstruction }); if (!row) throw new SchedulingDomainError("STALE_VERSION"); await this.bumpPeriod(tx, current); await this.audit(tx, actor, "schedule_assignment.updated", current.id, { assignmentId: row.id, employeeUserId: row.employeeUserId, projectId: row.projectId, locationId: row.locationId, date: row.assignmentDate, status: current.status }); return row; });
  }

  async removeAssignment(actor: AuthenticatedActor, input: unknown) { const parsed = parseSchedule(assignmentRemoveSchema, input); const period = await this.requirePeriod(db, actor, parsed.periodId, false); if (period.status !== "DRAFT") throw new SchedulingDomainError("INVALID_STATE"); const existing = await schedulingRepository.assignment(db, parsed.assignmentId); if (!existing || existing.schedulePeriodId !== period.id) throw new SchedulingDomainError("NOT_FOUND"); const grants = await this.grants(db, actor); if (!(actor.role === "SUPER_ADMIN" || grants.some((grant) => (grant.scopeType === "CLIENT" && grant.scopeReference === period.clientId) || (grant.scopeType === "PROJECT" && grant.scopeReference === existing.projectId) || (grant.scopeType === "LOCATION" && grant.scopeReference === existing.locationId)))) throw new SchedulingDomainError("OUT_OF_SCOPE"); return db.transaction(async (tx) => { await schedulingRepository.lockPeriod(tx, period.id); const current = await schedulingRepository.period(tx, period.id); if (!current || current.version !== parsed.expectedPeriodVersion || existing.version !== parsed.expectedVersion) throw new SchedulingDomainError("STALE_VERSION"); const row = await schedulingRepository.deleteAssignment(tx, existing.id); if (!row) throw new SchedulingDomainError("STALE_VERSION"); await this.bumpPeriod(tx, current); await this.audit(tx, actor, "schedule_assignment.removed", current.id, { assignmentId: existing.id, status: current.status }); return row; }); }

  private async validatePeriodAssignments(tx: SchedulingTransaction, period: typeof schedulePeriods.$inferSelect, actor?: AuthenticatedActor) { const assignments = await schedulingRepository.allAssignments(tx, period.id); const keys = new Map(assignments.map((assignment) => [`${assignment.employeeUserId}\u0000${assignment.assignmentDate}`, { employeeUserId: assignment.employeeUserId, assignmentDate: assignment.assignmentDate }])); for (const key of [...keys.values()].sort((a, b) => `${a.employeeUserId}:${a.assignmentDate}`.localeCompare(`${b.employeeUserId}:${b.assignmentDate}`))) await this.lockOverlap(tx, key.employeeUserId, key.assignmentDate); for (const assignment of assignments) { await this.validateReferences(tx, period, assignment); if (actor) await this.visibleEmployee(tx, actor, assignment.employeeUserId); await this.assertNoOverlap(tx, period, assignment, assignment.id); } return assignments; }

  async propose(actor: AuthenticatedActor, input: unknown) { const parsed = parseSchedule(periodVersionSchema, input); const period = await this.requirePeriod(db, actor, parsed.periodId, true); if (period.status !== "DRAFT") throw new SchedulingDomainError("INVALID_STATE"); return db.transaction(async (tx) => { await schedulingRepository.lockPeriod(tx, period.id); const current = await schedulingRepository.period(tx, period.id); if (!current || current.version !== parsed.expectedVersion) throw new SchedulingDomainError("STALE_VERSION"); if (current.status !== "DRAFT") throw new SchedulingDomainError("INVALID_STATE"); const assignments = await this.validatePeriodAssignments(tx, current, actor); const row = await schedulingRepository.updatePeriod(tx, current.id, current.version, { status: "PROPOSED", proposedAt: new Date() }); if (!row) throw new SchedulingDomainError("STALE_VERSION"); await this.audit(tx, actor, "schedule.proposed", row.id, { clientId: row.clientId, month: row.planningMonth, status: row.status, assignmentCount: assignments.length }); return row; }); }

  async returnToDraft(actor: AuthenticatedActor, input: unknown) { if (actor.role !== "SUPER_ADMIN") throw new SchedulingDomainError("FORBIDDEN"); const parsed = parseSchedule(returnPeriodSchema, input); return db.transaction(async (tx) => { await schedulingRepository.lockPeriod(tx, parsed.periodId); const current = await schedulingRepository.period(tx, parsed.periodId); if (!current) throw new SchedulingDomainError("NOT_FOUND"); if (current.status !== "PROPOSED") throw new SchedulingDomainError("INVALID_STATE"); if (current.version !== parsed.expectedVersion) throw new SchedulingDomainError("STALE_VERSION"); const row = await schedulingRepository.updatePeriod(tx, current.id, current.version, { status: "DRAFT", lastReturnReason: parsed.reason }); if (!row) throw new SchedulingDomainError("STALE_VERSION"); await this.audit(tx, actor, "schedule.returned_to_draft", row.id, { clientId: row.clientId, month: row.planningMonth, status: row.status, reasonProvided: true }); return row; }); }

  async publish(actor: AuthenticatedActor, input: unknown) { if (actor.role !== "SUPER_ADMIN") throw new SchedulingDomainError("FORBIDDEN"); const parsed = parseSchedule(periodVersionSchema, input); return db.transaction(async (tx) => { await schedulingRepository.lockPeriod(tx, parsed.periodId); const current = await schedulingRepository.period(tx, parsed.periodId); if (!current) throw new SchedulingDomainError("NOT_FOUND"); if (current.status !== "PROPOSED") throw new SchedulingDomainError("INVALID_STATE"); if (current.version !== parsed.expectedVersion) throw new SchedulingDomainError("STALE_VERSION"); await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`schedule-period:${current.clientId}:${current.planningMonth}`}))`); const assignments = await this.validatePeriodAssignments(tx, current, actor); const previous = await schedulingRepository.currentPublished(tx, current.clientId, current.planningMonth); if (previous) { await tx.update(schedulePeriods).set({ isCurrent: false, updatedAt: new Date() }).where(and(eq(schedulePeriods.id, previous.id), eq(schedulePeriods.isCurrent, true))); } const row = await schedulingRepository.updatePeriod(tx, current.id, current.version, { status: "PUBLISHED", isCurrent: true, publishedAt: new Date() }); if (!row) throw new SchedulingDomainError("STALE_VERSION"); const affected = new Set(assignments.map((assignment) => assignment.employeeUserId)); if (previous) for (const assignment of await schedulingRepository.allAssignments(tx, previous.id)) affected.add(assignment.employeeUserId); for (const recipientUserId of affected) await createNotification(tx, { recipientUserId, eventType: "schedule.published", relatedRecordType: "schedule_period", relatedRecordId: row.id }); await this.audit(tx, actor, "schedule.published", row.id, { clientId: row.clientId, month: row.planningMonth, status: row.status, assignmentCount: assignments.length, affectedEmployeeCount: affected.size }); return row; }); }

  async createRevision(actor: AuthenticatedActor, input: unknown) { if (actor.role !== "SUPER_ADMIN") throw new SchedulingDomainError("FORBIDDEN"); const parsed = parseSchedule(revisionSchema, input); return db.transaction(async (tx) => { await schedulingRepository.lockPeriod(tx, parsed.periodId); const source = await schedulingRepository.period(tx, parsed.periodId); if (!source) throw new SchedulingDomainError("NOT_FOUND"); if (source.status !== "PUBLISHED" || !source.isCurrent) throw new SchedulingDomainError("INVALID_STATE"); if (source.version !== parsed.expectedVersion) throw new SchedulingDomainError("STALE_VERSION"); await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`schedule-period:${source.clientId}:${source.planningMonth}`}))`); const assignments = await schedulingRepository.allAssignments(tx, source.id); const revision = await schedulingRepository.createPeriod(tx, { clientId: source.clientId, planningMonth: source.planningMonth, lineageId: source.lineageId, revisionNumber: await schedulingRepository.nextRevisionNumber(tx, source.clientId, source.planningMonth), parentPeriodId: source.id, status: "DRAFT" }); for (const assignment of assignments) await schedulingRepository.createAssignment(tx, { schedulePeriodId: revision.id, employeeUserId: assignment.employeeUserId, projectId: assignment.projectId, locationId: assignment.locationId, assignmentDate: assignment.assignmentDate, startTime: assignment.startTime, endTime: assignment.endTime, sharedInstruction: assignment.sharedInstruction, copiedFromAssignmentId: assignment.id }); await this.audit(tx, actor, "schedule.revision.created", revision.id, { clientId: revision.clientId, month: revision.planningMonth, sourcePeriodId: source.id, assignmentCount: assignments.length, revisionNumber: revision.revisionNumber }); return revision; }); }
}

export const schedulingService = new SchedulingService();
