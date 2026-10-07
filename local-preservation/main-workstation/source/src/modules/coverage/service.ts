import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { capabilityService } from "@/modules/capabilities/service";
import { CoverageDomainError } from "@/modules/coverage/domain-error";
import { coverageRepository, type CoverageExecutor, type CoverageTransaction } from "@/modules/coverage/repositories";
import { parseCoverage, replacementCreateSchema, replacementDecisionSchema } from "@/modules/coverage/validation";
import { createNotification } from "@/modules/notifications/notification-service";
import { schedulingService } from "@/modules/scheduling/service";
import { schedulingRepository } from "@/modules/scheduling/repositories";
import type { AuthenticatedActor } from "@/shared/types/foundation";

type AuditWriter = typeof writeAuditEvent; type NotificationWriter = typeof createNotification;
export type CoverageGap = { kind: "STAFFING" | "QUALIFICATION"; staffingRequirementId?: string; anchorAssignmentId: string; periodId: string; periodStatus: "DRAFT" | "PROPOSED" | "PUBLISHED"; employeeName: string; assignmentDate: string; startTime: string; endTime: string; source: "Client" | "Project" | "Location" | "Assignment"; skillName: string; requiredEmployeeCount: number; eligibleEmployeeCount: number; missingEmployeeCount: number; };

function sourceFor(rule: { clientId: string | null; projectId: string | null; locationId: string | null }) { return rule.clientId ? "Client" as const : rule.projectId ? "Project" as const : "Location" as const; }
export class CoverageService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent, private readonly notificationWriter: NotificationWriter = createNotification) {}
  private audit(tx: CoverageTransaction, actor: AuthenticatedActor, action: string, id: string, metadata: Record<string, unknown>) { return this.auditWriter(tx, { actor, action, targetType: "replacement_request", targetId: id, metadata }); }
  private async allowedAssignment(executor: CoverageExecutor, actor: AuthenticatedActor, assignmentId: string) {
    const loaded = await coverageRepository.assignment(executor, assignmentId); if (!loaded) throw new CoverageDomainError("NOT_FOUND");
    if (actor.role === "SUPER_ADMIN") return loaded; if (actor.role !== "ADMIN") throw new CoverageDomainError("FORBIDDEN");
    const grants = await coverageRepository.grants(executor, actor.id); const allowed = grants.some((grant) => (grant.scopeType === "CLIENT" && grant.scopeReference === loaded.period.clientId) || (grant.scopeType === "PROJECT" && grant.scopeReference === loaded.assignment.projectId) || (grant.scopeType === "LOCATION" && grant.scopeReference === loaded.assignment.locationId));
    const employee = await coverageRepository.employee(executor, loaded.assignment.employeeUserId);
    const teamVisible = employee && grants.some((grant) => grant.scopeType === "TEAM" && grant.scopeReference === employee.team);
    if (!allowed || !teamVisible) throw new CoverageDomainError("OUT_OF_SCOPE"); return loaded;
  }
  private async teams(executor: CoverageExecutor, actor: AuthenticatedActor) { if (actor.role === "SUPER_ADMIN") return undefined; if (actor.role !== "ADMIN") throw new CoverageDomainError("FORBIDDEN"); return (await coverageRepository.grants(executor, actor.id)).filter((grant) => grant.scopeType === "TEAM").map((grant) => grant.scopeReference); }
  /** Read the editable plan, never an obsolete Published predecessor. Mutations hold its row lock through commit. */
  private async currentAnchor(executor: CoverageExecutor, actor: AuthenticatedActor, assignmentId: string, lock = false) {
    let original = await this.allowedAssignment(executor, actor, assignmentId);
    let editable = original.period.status === "PUBLISHED" ? await coverageRepository.editablePeriod(executor, original.period.clientId, original.period.planningMonth) : null;
    if (lock) {
      // Lock the existing child instead of its Published parent: publication locks child then parent.
      // Holding both in the opposite order could deadlock a simultaneous publication.
      await schedulingRepository.lockPeriod(executor as CoverageTransaction, editable?.id ?? original.period.id);
      original = await this.allowedAssignment(executor, actor, assignmentId);
      if (original.period.status === "PUBLISHED" && !editable) {
        await executor.execute(sql`select pg_advisory_xact_lock(hashtext(${`schedule-period:${original.period.clientId}:${original.period.planningMonth}`}))`);
        if (await coverageRepository.editablePeriod(executor, original.period.clientId, original.period.planningMonth)) throw new CoverageDomainError("STALE_WORK");
      }
    }
    if (original.period.status !== "PUBLISHED") return { original, loaded: original };
    if (!original.period.isCurrent) throw new CoverageDomainError("STALE_WORK");
    editable = editable ? await schedulingRepository.period(executor, editable.id) : null;
    if (!editable) return { original, loaded: original };
    if (editable.parentPeriodId !== original.period.id || !["DRAFT", "PROPOSED"].includes(editable.status)) throw new CoverageDomainError("STALE_WORK");
    const copied = await coverageRepository.copiedAssignment(executor, editable.id, original.assignment.id);
    if (!copied) throw new CoverageDomainError("STALE_WORK");
    const loaded = await this.allowedAssignment(executor, actor, copied.id);
    const before = original.assignment, after = loaded.assignment;
    if (before.employeeUserId !== after.employeeUserId || before.projectId !== after.projectId || before.locationId !== after.locationId || before.assignmentDate !== after.assignmentDate || before.startTime !== after.startTime || before.endTime !== after.endTime || before.sharedInstruction !== after.sharedInstruction) throw new CoverageDomainError("STALE_WORK");
    return { original, loaded };
  }
  private async eligible(executor: CoverageExecutor, employeeUserId: string, anchor: { id?: string; employeeUserId: string; assignmentDate: string; startTime: string; endTime: string }, skillIds: string[], exceptAssignmentId?: string, checkOverlap = true) {
    const employee = await coverageRepository.employee(executor, employeeUserId); if (!employee?.active || employee.role !== "EMPLOYEE") return false;
    const skills = new Set((await coverageRepository.employeeSkillIds(executor, employeeUserId)).map((row) => row.skillId)); if (!skillIds.every((id) => skills.has(id))) return false;
    if (await coverageRepository.approvedLeave(executor, employeeUserId, anchor.assignmentDate)) return false;
    return !checkOverlap || !(await coverageRepository.overlaps(executor, employeeUserId, anchor.assignmentDate, anchor.startTime, anchor.endTime, exceptAssignmentId));
  }
  private matching(rule: { clientId: string | null; projectId: string | null; locationId: string | null }, anchor: { projectId: string; locationId: string }, candidate: { projectId: string; locationId: string; assignmentDate: string; startTime: string | Date; endTime: string | Date }, base: { assignmentDate: string; startTime: string | Date; endTime: string | Date }) {
    const time = (value: string | Date) => String(value).slice(0, 5); return candidate.assignmentDate === base.assignmentDate && time(candidate.startTime) === time(base.startTime) && time(candidate.endTime) === time(base.endTime) && (rule.clientId ? true : rule.projectId ? candidate.projectId === anchor.projectId : candidate.locationId === anchor.locationId);
  }
  private async gapsForAnchor(executor: CoverageExecutor, actor: AuthenticatedActor, anchorId: string): Promise<CoverageGap[]> {
    const { loaded } = await this.currentAnchor(executor, actor, anchorId); const anchor = loaded.assignment; const all = await coverageRepository.assignments(executor, anchor.schedulePeriodId); const rules = await coverageRepository.rulesForAssignment(executor, anchor); const gaps: CoverageGap[] = [];
    for (const { requirement, skillName } of rules) {
      const counted = new Set<string>(); for (const item of all) if (this.matching(requirement, anchor, item.assignment, anchor) && await this.eligible(executor, item.assignment.employeeUserId, anchor, [requirement.requiredSkillId], item.assignment.id, false)) counted.add(item.assignment.employeeUserId);
      if (counted.size < requirement.requiredEmployeeCount) gaps.push({ kind: "STAFFING", staffingRequirementId: requirement.id, anchorAssignmentId: anchor.id, periodId: anchor.schedulePeriodId, periodStatus: loaded.period.status, employeeName: loaded.employeeName, assignmentDate: anchor.assignmentDate, startTime: String(anchor.startTime).slice(0, 5), endTime: String(anchor.endTime).slice(0, 5), source: sourceFor(requirement), skillName, requiredEmployeeCount: requirement.requiredEmployeeCount, eligibleEmployeeCount: counted.size, missingEmployeeCount: requirement.requiredEmployeeCount - counted.size });
    }
    const effective = await capabilityService.effectiveRequirements(executor as never, anchor.id); const owned = new Set((await coverageRepository.employeeSkillIds(executor, anchor.employeeUserId)).map((row) => row.skillId));
    for (const requirement of effective.requirements.filter((item) => !owned.has(item.id))) gaps.push({ kind: "QUALIFICATION", anchorAssignmentId: anchor.id, periodId: anchor.schedulePeriodId, periodStatus: loaded.period.status, employeeName: loaded.employeeName, assignmentDate: anchor.assignmentDate, startTime: String(anchor.startTime).slice(0, 5), endTime: String(anchor.endTime).slice(0, 5), source: requirement.sources[0]!, skillName: requirement.name, requiredEmployeeCount: 1, eligibleEmployeeCount: 0, missingEmployeeCount: 1 });
    return gaps;
  }
  async assignmentContext(actor: AuthenticatedActor, assignmentId: string) {
    if (!replacementCreateSchema.shape.anchorAssignmentId.safeParse(assignmentId).success) throw new CoverageDomainError("NOT_FOUND");
    const loaded = await this.allowedAssignment(db, actor, assignmentId);
    return { id: loaded.assignment.id, periodId: loaded.period.id, month: loaded.period.planningMonth.slice(0, 7), status: loaded.period.status, employeeName: loaded.employeeName, clientName: loaded.clientName, projectName: loaded.projectName, locationName: loaded.locationName, assignmentDate: loaded.assignment.assignmentDate, startTime: loaded.assignment.startTime.slice(0, 5), endTime: loaded.assignment.endTime.slice(0, 5) };
  }
  async gaps(actor: AuthenticatedActor, anchorAssignmentId: string) { if (actor.role === "EMPLOYEE") throw new CoverageDomainError("FORBIDDEN"); return this.gapsForAnchor(db, actor, anchorAssignmentId); }
  private async candidatesFor(executor: CoverageExecutor, actor: AuthenticatedActor, anchorAssignmentId: string) {
    const { loaded } = await this.currentAnchor(executor, actor, anchorAssignmentId);
    const effective = await capabilityService.effectiveRequirements(executor as never, loaded.assignment.id);
    const employees = await coverageRepository.activeEmployees(executor, await this.teams(executor, actor));
    const candidates = [];
    for (const employee of employees) if (employee.id !== loaded.assignment.employeeUserId && await this.eligible(executor, employee.id, loaded.assignment, effective.requirements.map((item) => item.id))) candidates.push({ id: employee.id, displayName: employee.displayName, skills: effective.requirements.map((item) => item.name) });
    return { candidates, requirements: effective.requirements.map((item) => ({ name: item.name, sources: item.sources })) };
  }
  async candidates(actor: AuthenticatedActor, anchorAssignmentId: string) { if (actor.role === "EMPLOYEE") throw new CoverageDomainError("FORBIDDEN"); return this.candidatesFor(db, actor, anchorAssignmentId); }
  async create(actor: AuthenticatedActor, input: unknown) {
    if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") throw new CoverageDomainError("FORBIDDEN");
    const parsed = parseCoverage(replacementCreateSchema, input);
    return db.transaction(async (tx) => {
      const { loaded } = await this.currentAnchor(tx, actor, parsed.anchorAssignmentId, true);
      const gaps = await this.gapsForAnchor(tx, actor, loaded.assignment.id);
      const gap = gaps.find((item) => item.kind === (parsed.staffingRequirementId ? "STAFFING" : "QUALIFICATION") && item.staffingRequirementId === parsed.staffingRequirementId);
      if (!gap || (parsed.intent === "ADD_COVERAGE_ASSIGNMENT" && gap.kind !== "STAFFING")) throw new CoverageDomainError("NO_GAP");
      const pending = await coverageRepository.pendingForPeriods(tx, [loaded.period.id, ...(loaded.period.parentPeriodId ? [loaded.period.parentPeriodId] : [])]);
      const anchorIds = new Set([loaded.assignment.id, loaded.assignment.copiedFromAssignmentId]);
      const duplicate = pending.some(({ request, assignment }) => request.intent === parsed.intent && (parsed.intent === "REPLACE_ASSIGNMENT" ? anchorIds.has(assignment.id) : request.staffingRequirementId === parsed.staffingRequirementId && assignment.assignmentDate === loaded.assignment.assignmentDate && assignment.startTime === loaded.assignment.startTime && assignment.endTime === loaded.assignment.endTime));
      if (duplicate) throw new CoverageDomainError("PENDING_REQUEST");
      if (parsed.nominatedEmployeeUserId && !(await this.candidatesFor(tx, actor, loaded.assignment.id)).candidates.some((candidate) => candidate.id === parsed.nominatedEmployeeUserId)) throw new CoverageDomainError("INELIGIBLE_CANDIDATE");
      const row = await coverageRepository.createRequest(tx, { intent: parsed.intent, staffingRequirementId: parsed.staffingRequirementId, anchorAssignmentId: loaded.assignment.id, requesterUserId: actor.id, nominatedEmployeeUserId: parsed.nominatedEmployeeUserId, observedRequiredEmployeeCount: gap.requiredEmployeeCount, observedEligibleEmployeeCount: gap.eligibleEmployeeCount });
      await this.audit(tx, actor, "coverage.replacement_requested", row.id, { intent: row.intent, staffingRequirementId: row.staffingRequirementId, anchorAssignmentId: row.anchorAssignmentId, requiredCount: row.observedRequiredEmployeeCount, eligibleCount: row.observedEligibleEmployeeCount, nomineeProvided: Boolean(row.nominatedEmployeeUserId) });
      for (const recipient of await coverageRepository.superAdmins(tx)) await this.notificationWriter(tx, { recipientUserId: recipient.id, eventType: "coverage.replacement_requested", relatedRecordType: "replacement_request", relatedRecordId: row.id });
      return row;
    });
  }
  async mine(actor: AuthenticatedActor) { if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") throw new CoverageDomainError("FORBIDDEN"); return actor.role === "SUPER_ADMIN" ? coverageRepository.pendingRequests(db) : coverageRepository.requestsForRequester(db, actor.id); }
  async decide(actor: AuthenticatedActor, input: unknown) {
    if (actor.role !== "SUPER_ADMIN") throw new CoverageDomainError("FORBIDDEN"); const parsed = parseCoverage(replacementDecisionSchema, input); const request = await coverageRepository.request(db, parsed.replacementRequestId); if (!request) throw new CoverageDomainError("NOT_FOUND");
    return db.transaction(async (tx) => { await coverageRepository.lockRequest(tx, request.id); const current = await coverageRepository.request(tx, request.id); if (!current || current.version !== parsed.expectedVersion) throw new CoverageDomainError("STALE_VERSION"); if (current.status !== "PENDING") throw new CoverageDomainError("INVALID_STATE"); if (parsed.decision === "REJECTED") { const row = await coverageRepository.updateRequest(tx, current.id, current.version, { status: "REJECTED", decidedByUserId: actor.id, decidedAt: new Date() }); if (!row) throw new CoverageDomainError("STALE_VERSION"); await this.audit(tx, actor, "coverage.replacement_rejected", row.id, { intent: row.intent, anchorAssignmentId: row.anchorAssignmentId }); await this.notificationWriter(tx, { recipientUserId: row.requesterUserId, eventType: "coverage.replacement_rejected", relatedRecordType: "replacement_request", relatedRecordId: row.id }); return row; }
      const selected = parsed.selectedEmployeeUserId ?? current.nominatedEmployeeUserId; if (!selected) throw new CoverageDomainError("VALIDATION_ERROR");
      const { original, loaded: anchor } = await this.currentAnchor(tx, actor, current.anchorAssignmentId, true);
      if (original.assignment.updatedAt > current.createdAt) throw new CoverageDomainError("STALE_WORK");
      const gaps = await this.gapsForAnchor(tx, actor, anchor.assignment.id);
      const gap = gaps.find((item) => item.kind === (current.staffingRequirementId ? "STAFFING" : "QUALIFICATION") && item.staffingRequirementId === (current.staffingRequirementId ?? undefined));
      if (!gap || (current.intent === "ADD_COVERAGE_ASSIGNMENT" && gap.kind !== "STAFFING")) throw new CoverageDomainError("NO_GAP");
      const effective = await capabilityService.effectiveRequirements(tx as never, anchor.assignment.id);
      if (selected === anchor.assignment.employeeUserId || !(await this.eligible(tx, selected, anchor.assignment, effective.requirements.map((item) => item.id)))) throw new CoverageDomainError("INELIGIBLE_CANDIDATE");
      const effect = await schedulingService.applyReplacementEffect(tx as never, actor, { anchorAssignmentId: anchor.assignment.id, selectedEmployeeUserId: selected, intent: current.intent }); const row = await coverageRepository.updateRequest(tx, current.id, current.version, { status: "APPROVED", selectedEmployeeUserId: selected, decidedByUserId: actor.id, decidedAt: new Date(), effectStatus: effect.effectStatus, effectSchedulePeriodId: effect.period.id }); if (!row) throw new CoverageDomainError("STALE_VERSION"); await this.audit(tx, actor, "coverage.replacement_approved", row.id, { intent: row.intent, anchorAssignmentId: row.anchorAssignmentId, selectedEmployeeUserId: selected, effectStatus: row.effectStatus, effectPeriodId: effect.period.id }); await this.notificationWriter(tx, { recipientUserId: row.requesterUserId, eventType: "coverage.replacement_approved", relatedRecordType: "replacement_request", relatedRecordId: row.id }); return row;
    });
  }
}
export const coverageService = new CoverageService();
