import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import {
  assignmentSkillRequirements, clients, employeeEvidence, employeeProfiles, employeeSkills, leaveAllowanceSettings,
  leaveRequests, locations, projects, replacementRequests, scheduleAssignments, schedulePeriods, skills,
  staffingRequirements, notifications, users,
} from "@/db/schema";
import type { ResolvedScope } from "@/modules/authorization/current-actor";

export type ReportExecutor = typeof db;
export type Window = { from: string; to: string };
export type ScheduleStatus = "DRAFT" | "PROPOSED" | "PUBLISHED";

/**
 * Employee scope mirrors `canReadEmployee`: a scoped Admin reaches an employee only through a TEAM grant
 * for that employee's team, so an Admin with no TEAM grant matches no employee rather than all of them.
 */
function employeeScope(scope: ResolvedScope): SQL | undefined {
  if (scope.isGlobal) return undefined;
  if (scope.role !== "ADMIN") return sql`false`;
  if (scope.teams.length === 0) return sql`false`;
  return inArray(employeeProfiles.team, scope.teams);
}

/**
 * Assignment scope mirrors `schedulingService.requirePeriod`: a CLIENT grant on the period's client, or a
 * PROJECT or LOCATION grant on the assignment itself. TEAM grants intentionally do not widen it.
 */
function assignmentScope(scope: ResolvedScope): SQL | undefined {
  if (scope.isGlobal) return undefined;
  if (scope.role !== "ADMIN") return sql`false`;
  const predicates: SQL[] = [];
  if (scope.clientIds.length) predicates.push(inArray(schedulePeriods.clientId, scope.clientIds));
  if (scope.projectIds.length) predicates.push(inArray(scheduleAssignments.projectId, scope.projectIds));
  if (scope.locationIds.length) predicates.push(inArray(scheduleAssignments.locationId, scope.locationIds));
  return predicates.length ? or(...predicates)! : sql`false`;
}

const assignmentColumns = {
  id: scheduleAssignments.id,
  assignmentDate: scheduleAssignments.assignmentDate,
  startTime: scheduleAssignments.startTime,
  endTime: scheduleAssignments.endTime,
  employeeUserId: scheduleAssignments.employeeUserId,
  employeeName: users.displayName,
  clientName: clients.companyName,
  projectName: projects.name,
  locationName: locations.name,
  planningMonth: schedulePeriods.planningMonth,
  periodStatus: schedulePeriods.status,
  revisionNumber: schedulePeriods.revisionNumber,
};
export type AssignmentRow = { id: string; assignmentDate: string; startTime: string; endTime: string; employeeUserId: string; employeeName: string; clientName: string; projectName: string; locationName: string; planningMonth: string; periodStatus: ScheduleStatus; revisionNumber: number };

function assignmentQuery(scope: ResolvedScope, statuses: ScheduleStatus[], window: Window, currentPublishedOnly: boolean) {
  return db.select(assignmentColumns)
    .from(scheduleAssignments)
    .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
    .innerJoin(users, eq(users.id, scheduleAssignments.employeeUserId))
    .innerJoin(clients, eq(clients.id, schedulePeriods.clientId))
    .innerJoin(projects, eq(projects.id, scheduleAssignments.projectId))
    .innerJoin(locations, eq(locations.id, scheduleAssignments.locationId))
    .where(and(
      inArray(schedulePeriods.status, statuses),
      currentPublishedOnly ? eq(schedulePeriods.isCurrent, true) : undefined,
      gte(scheduleAssignments.assignmentDate, window.from),
      lte(scheduleAssignments.assignmentDate, window.to),
      assignmentScope(scope),
    ))
    .orderBy(
      asc(scheduleAssignments.assignmentDate), asc(scheduleAssignments.startTime),
      asc(users.displayName), asc(scheduleAssignments.id),
    );
}

export const reportingRepository = {
  /** Published assignments inside the window, ordered by the published-allocation contract. */
  publishedAssignments(scope: ResolvedScope, window: Window, limit: number, offset: number) {
    return assignmentQuery(scope, ["PUBLISHED"], window, true).limit(limit).offset(offset);
  },
  publishedAssignmentCount(scope: ResolvedScope, window: Window) {
    return db.select({ value: sql<number>`count(*)::int` })
      .from(scheduleAssignments)
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true), gte(scheduleAssignments.assignmentDate, window.from), lte(scheduleAssignments.assignmentDate, window.to), assignmentScope(scope)))
      .then(([row]) => Number(row?.value ?? 0));
  },
  /** Draft and Proposed assignments only. Never mixes into a Published metric. */
  planningAssignments(scope: ResolvedScope, window: Window, limit: number, offset: number) {
    return assignmentQuery(scope, ["DRAFT", "PROPOSED"], window, false).limit(limit).offset(offset);
  },

  activeEmployees(scope: ResolvedScope, limit: number, offset: number) {
    return db.select({ id: users.id, displayName: users.displayName, team: employeeProfiles.team, employeeCode: employeeProfiles.employeeCode })
      .from(users).innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(and(eq(users.active, true), employeeScope(scope)))
      .orderBy(asc(users.displayName), asc(users.id)).limit(limit).offset(offset);
  },
  activeEmployeeCount(scope: ResolvedScope) {
    return db.select({ value: sql<number>`count(*)::int` }).from(users)
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(and(eq(users.active, true), employeeScope(scope))).then(([row]) => Number(row?.value ?? 0));
  },
  employeesByTeam(scope: ResolvedScope) {
    return db.select({ team: employeeProfiles.team, value: sql<number>`count(*)::int` }).from(users)
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(and(eq(users.active, true), employeeScope(scope)))
      .groupBy(employeeProfiles.team).orderBy(asc(employeeProfiles.team));
  },
  /** Active in-scope employees with no Published assignment inside the window. */
  unallocatedEmployees(scope: ResolvedScope, window: Window, limit: number, offset: number) {
    const allocated = db.select({ employeeUserId: scheduleAssignments.employeeUserId })
      .from(scheduleAssignments)
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true), gte(scheduleAssignments.assignmentDate, window.from), lte(scheduleAssignments.assignmentDate, window.to), assignmentScope(scope)));
    return db.select({ id: users.id, displayName: users.displayName, team: employeeProfiles.team })
      .from(users).innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(and(eq(users.active, true), employeeScope(scope), sql`${users.id} not in (${allocated})`))
      .orderBy(asc(users.displayName), asc(users.id)).limit(limit).offset(offset);
  },
  unallocatedEmployeeCount(scope: ResolvedScope, window: Window) {
    const allocated = db.select({ employeeUserId: scheduleAssignments.employeeUserId })
      .from(scheduleAssignments)
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true), gte(scheduleAssignments.assignmentDate, window.from), lte(scheduleAssignments.assignmentDate, window.to), assignmentScope(scope)));
    return db.select({ value: sql<number>`count(*)::int` }).from(users)
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(and(eq(users.active, true), employeeScope(scope), sql`${users.id} not in (${allocated})`))
      .then(([row]) => Number(row?.value ?? 0));
  },

  currentPublishedPeriodCount(scope: ResolvedScope, month: string) {
    return db.select({ value: sql<number>`count(distinct ${schedulePeriods.id})::int` }).from(schedulePeriods)
      .where(and(eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true), eq(schedulePeriods.planningMonth, `${month}-01`), scope.isGlobal ? undefined : (scope.role === "ADMIN" && scope.clientIds.length ? inArray(schedulePeriods.clientId, scope.clientIds) : sql`false`)))
      .then(([row]) => Number(row?.value ?? 0));
  },

  /** Approved leave intersecting the window. Private columns are never selected. */
  approvedLeave(scope: ResolvedScope, window: Window, limit: number, offset: number) {
    return db.select({
      id: leaveRequests.id, employeeUserId: leaveRequests.employeeUserId, employeeName: users.displayName,
      startDate: leaveRequests.startDate, endDate: leaveRequests.endDate, status: leaveRequests.status,
      decidedAt: leaveRequests.decidedAt,
    }).from(leaveRequests)
      .innerJoin(users, eq(users.id, leaveRequests.employeeUserId))
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(and(eq(leaveRequests.status, "APPROVED"), lte(leaveRequests.startDate, window.to), gte(leaveRequests.endDate, window.from), employeeScope(scope)))
      .orderBy(asc(leaveRequests.startDate), asc(users.displayName), asc(leaveRequests.id)).limit(limit).offset(offset);
  },
  approvedLeaveCount(scope: ResolvedScope, window: Window) {
    return db.select({ value: sql<number>`count(*)::int` }).from(leaveRequests)
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, leaveRequests.employeeUserId))
      .where(and(eq(leaveRequests.status, "APPROVED"), lte(leaveRequests.startDate, window.to), gte(leaveRequests.endDate, window.from), employeeScope(scope)))
      .then(([row]) => Number(row?.value ?? 0));
  },
  pendingLeaveCount(scope: ResolvedScope) {
    return db.select({ value: sql<number>`count(*)::int` }).from(leaveRequests)
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, leaveRequests.employeeUserId))
      .where(and(eq(leaveRequests.status, "PENDING"), employeeScope(scope))).then(([row]) => Number(row?.value ?? 0));
  },
  allowance() { return db.select().from(leaveAllowanceSettings).where(eq(leaveAllowanceSettings.singleton, true)).limit(1).then(([row]) => row ?? null); },
  /** Approved leave intersecting a year, per employee, for the balance snapshot. */
  approvedLeaveForYear(scope: ResolvedScope, from: string, to: string) {
    return db.select({ employeeUserId: leaveRequests.employeeUserId, startDate: leaveRequests.startDate, endDate: leaveRequests.endDate })
      .from(leaveRequests).innerJoin(employeeProfiles, eq(employeeProfiles.userId, leaveRequests.employeeUserId))
      .where(and(eq(leaveRequests.status, "APPROVED"), lte(leaveRequests.startDate, to), gte(leaveRequests.endDate, from), employeeScope(scope)));
  },
  /** Approved leave covering one date, used only by the conflict fact. */
  approvedLeaveOnDate(scope: ResolvedScope, date: string) {
    return db.select({ employeeUserId: leaveRequests.employeeUserId })
      .from(leaveRequests)
      .where(and(eq(leaveRequests.status, "APPROVED"), lte(leaveRequests.startDate, date), gte(leaveRequests.endDate, date)))
      .then((rows) => new Set(rows.map((row) => row.employeeUserId)));
  },
  /**
   * Employees holding a current Published assignment that overlaps the selected half-open time window on
   * the selected date. Used only by the conflict fact.
   */
  publishedAssignmentEmployeesInWindow(scope: ResolvedScope, date: string, start: string, end: string) {
    return db.selectDistinct({ employeeUserId: scheduleAssignments.employeeUserId })
      .from(scheduleAssignments)
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(
        eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true),
        eq(scheduleAssignments.assignmentDate, date),
        lt(scheduleAssignments.startTime, end), gt(scheduleAssignments.endTime, start),
        assignmentScope(scope),
      ))
      .then((rows) => new Set(rows.map((row) => row.employeeUserId)));
  },

  /** Replacement requests whose anchor assignment is in current scope. Ownership never widens this. */
  replacementRequests(scope: ResolvedScope, limit: number, offset: number) {
    return db.select({
      id: replacementRequests.id, intent: replacementRequests.intent, status: replacementRequests.status,
      effectStatus: replacementRequests.effectStatus, requesterUserId: replacementRequests.requesterUserId,
      requesterName: users.displayName, createdAt: replacementRequests.createdAt,
      observedRequiredEmployeeCount: replacementRequests.observedRequiredEmployeeCount,
      observedEligibleEmployeeCount: replacementRequests.observedEligibleEmployeeCount,
    }).from(replacementRequests)
      .innerJoin(users, eq(users.id, replacementRequests.requesterUserId))
      .innerJoin(scheduleAssignments, eq(scheduleAssignments.id, replacementRequests.anchorAssignmentId))
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(assignmentScope(scope))
      .orderBy(desc(replacementRequests.createdAt), desc(replacementRequests.id)).limit(limit).offset(offset);
  },
  replacementRequestCount(scope: ResolvedScope) {
    return db.select({ value: sql<number>`count(*)::int` }).from(replacementRequests)
      .innerJoin(scheduleAssignments, eq(scheduleAssignments.id, replacementRequests.anchorAssignmentId))
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(assignmentScope(scope)).then(([row]) => Number(row?.value ?? 0));
  },
  pendingReplacementCount(scope: ResolvedScope) {
    return db.select({ value: sql<number>`count(*)::int` }).from(replacementRequests)
      .innerJoin(scheduleAssignments, eq(scheduleAssignments.id, replacementRequests.anchorAssignmentId))
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(eq(replacementRequests.status, "PENDING"), assignmentScope(scope))).then(([row]) => Number(row?.value ?? 0));
  },
  myReplacementCount(actorId: string, scope: ResolvedScope) {
    return db.select({ value: sql<number>`count(*)::int` }).from(replacementRequests)
      .innerJoin(scheduleAssignments, eq(scheduleAssignments.id, replacementRequests.anchorAssignmentId))
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(eq(replacementRequests.requesterUserId, actorId), assignmentScope(scope))).then(([row]) => Number(row?.value ?? 0));
  },
  replacementRowsForRequester(actorId: string, scope: ResolvedScope, limit: number, offset: number) {
    return db.select({
      id: replacementRequests.id, intent: replacementRequests.intent, status: replacementRequests.status,
      effectStatus: replacementRequests.effectStatus, requesterUserId: replacementRequests.requesterUserId,
      requesterName: users.displayName, createdAt: replacementRequests.createdAt,
      observedRequiredEmployeeCount: replacementRequests.observedRequiredEmployeeCount,
      observedEligibleEmployeeCount: replacementRequests.observedEligibleEmployeeCount,
    }).from(replacementRequests)
      .innerJoin(users, eq(users.id, replacementRequests.requesterUserId))
      .innerJoin(scheduleAssignments, eq(scheduleAssignments.id, replacementRequests.anchorAssignmentId))
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(eq(replacementRequests.requesterUserId, actorId), assignmentScope(scope)))
      .orderBy(desc(replacementRequests.createdAt), desc(replacementRequests.id)).limit(limit).offset(offset);
  },

  /**
   * The skill catalogue plus every non-archived employee-skill row. Grouping is done in the service:
   * the maintained dataset is bounded by (skills × employees), so a single read is cheaper and far less
   * error-prone than a scope-parameterised aggregate, and the resulting counts stay exactly reproducible.
   */
  skills() { return db.select({ id: skills.id, name: skills.name, active: skills.active }).from(skills).orderBy(asc(skills.name), asc(skills.id)); },
  recordedSkillRelations() {
    return db.select({ skillId: employeeSkills.skillId, employeeUserId: employeeSkills.employeeUserId, team: employeeProfiles.team })
      .from(employeeSkills).innerJoin(employeeProfiles, eq(employeeProfiles.userId, employeeSkills.employeeUserId))
      .where(isNull(employeeSkills.archivedAt));
  },
  /**
   * Non-archived operational skill requirements with their scope-identifying parents. The recorded-employee
   * count is derived in the service from `recordedSkillRelations`, so scope is applied once, in one place.
   */
  skillRequirements() {
    return db.select({
      id: staffingRequirements.id, skillId: staffingRequirements.requiredSkillId, skillName: skills.name,
      requiredCount: staffingRequirements.requiredEmployeeCount,
      clientId: staffingRequirements.clientId, projectId: staffingRequirements.projectId, locationId: staffingRequirements.locationId,
      clientName: clients.companyName, projectName: projects.name, locationName: locations.name,
    }).from(staffingRequirements)
      .innerJoin(skills, eq(skills.id, staffingRequirements.requiredSkillId))
      .leftJoin(clients, eq(clients.id, staffingRequirements.clientId))
      .leftJoin(projects, eq(projects.id, staffingRequirements.projectId))
      .leftJoin(locations, eq(locations.id, staffingRequirements.locationId))
      .where(isNull(staffingRequirements.archivedAt))
      .orderBy(asc(skills.name), asc(staffingRequirements.id));
  },

  /** Active certification evidence. Private columns are selected only for the Super Admin projection. */
  certifications(scope: ResolvedScope, includePrivate: boolean, ownerId: string | null, limit: number, offset: number) {
    return db.select({
      id: employeeEvidence.id, title: employeeEvidence.title, issuer: employeeEvidence.issuer,
      issueDate: employeeEvidence.issueDate, expiryDate: employeeEvidence.expiryDate,
      reviewState: employeeEvidence.reviewState, lastSubmittedAt: employeeEvidence.lastSubmittedAt,
      ownerUserId: employeeEvidence.ownerUserId, ownerName: users.displayName, skillName: skills.name,
      details: employeeEvidence.details, externalUrl: employeeEvidence.externalUrl,
    }).from(employeeEvidence)
      .innerJoin(users, eq(users.id, employeeEvidence.ownerUserId))
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, employeeEvidence.ownerUserId))
      .leftJoin(skills, eq(skills.id, employeeEvidence.relatedSkillId))
      .where(and(
        eq(employeeEvidence.kind, "certification"), isNull(employeeEvidence.archivedAt),
        ownerId ? eq(employeeEvidence.ownerUserId, ownerId) : employeeScope(scope),
      ))
      .orderBy(sql`${employeeEvidence.expiryDate} asc nulls last`, asc(users.displayName), asc(employeeEvidence.id))
      .limit(limit).offset(offset)
      .then((rows) => rows.map((row) => (includePrivate ? row : { ...row, details: null, externalUrl: null })));
  },
  certificationCount(scope: ResolvedScope, ownerId: string | null) {
    return db.select({ value: sql<number>`count(*)::int` }).from(employeeEvidence)
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, employeeEvidence.ownerUserId))
      .where(and(eq(employeeEvidence.kind, "certification"), isNull(employeeEvidence.archivedAt), ownerId ? eq(employeeEvidence.ownerUserId, ownerId) : employeeScope(scope)))
      .then(([row]) => Number(row?.value ?? 0));
  },
  expiredCertificationCount(scope: ResolvedScope, today: string) {
    return db.select({ value: sql<number>`count(*)::int` }).from(employeeEvidence)
      .innerJoin(employeeProfiles, eq(employeeProfiles.userId, employeeEvidence.ownerUserId))
      .where(and(eq(employeeEvidence.kind, "certification"), isNull(employeeEvidence.archivedAt), sql`${employeeEvidence.expiryDate} is not null and ${employeeEvidence.expiryDate} < ${today}`, employeeScope(scope)))
      .then(([row]) => Number(row?.value ?? 0));
  },
  evidenceAwaitingReview(limit: number, offset: number) {
    return db.select({
      id: employeeEvidence.id, kind: employeeEvidence.kind, title: employeeEvidence.title,
      ownerUserId: employeeEvidence.ownerUserId, ownerName: users.displayName,
      lastSubmittedAt: employeeEvidence.lastSubmittedAt, reviewState: employeeEvidence.reviewState,
    }).from(employeeEvidence)
      .innerJoin(users, eq(users.id, employeeEvidence.ownerUserId))
      .where(and(eq(employeeEvidence.reviewState, "unreviewed"), isNull(employeeEvidence.archivedAt)))
      .orderBy(sql`${employeeEvidence.lastSubmittedAt} asc nulls first`, asc(employeeEvidence.id)).limit(limit).offset(offset);
  },
  evidenceAwaitingReviewCount() {
    return db.select({ value: sql<number>`count(*)::int` }).from(employeeEvidence)
      .where(and(eq(employeeEvidence.reviewState, "unreviewed"), isNull(employeeEvidence.archivedAt)))
      .then(([row]) => Number(row?.value ?? 0));
  },
  /** All evidence kinds for one owner, aggregated for the Employee dashboard card. */
  evidenceStateCounts(ownerId: string) {
    return db.select({ reviewState: employeeEvidence.reviewState, expiryDate: employeeEvidence.expiryDate, kind: employeeEvidence.kind })
      .from(employeeEvidence)
      .where(and(eq(employeeEvidence.ownerUserId, ownerId), isNull(employeeEvidence.archivedAt)));
  },

  /** One row per client-month with its effective lifecycle state. */
  scheduleLifecycle(scope: ResolvedScope, limit: number, offset: number) {
    return db.select({
      clientId: schedulePeriods.clientId, clientName: clients.companyName, planningMonth: schedulePeriods.planningMonth,
      latestRevision: sql<number>`max(${schedulePeriods.revisionNumber})::int`,
      publishedRevision: sql<number | null>`max(case when ${schedulePeriods.status} = 'PUBLISHED' and ${schedulePeriods.isCurrent} then ${schedulePeriods.revisionNumber} end)::int`,
      effectiveState: sql<ScheduleStatus>`case when max(case when ${schedulePeriods.status} = 'PUBLISHED' and ${schedulePeriods.isCurrent} then 1 else 0 end) = 1 then 'PUBLISHED'
        when max(case when ${schedulePeriods.status} = 'PROPOSED' then 1 else 0 end) = 1 then 'PROPOSED' else 'DRAFT' end`,
      proposedAt: sql<string | null>`max(${schedulePeriods.proposedAt})`,
      publishedAt: sql<string | null>`max(case when ${schedulePeriods.isCurrent} then ${schedulePeriods.publishedAt} end)`,
      // `max(uuid)` is not a Postgres aggregate, so the current published period is captured as text and
      // its assignment count is resolved in a second grouped query rather than a correlated subquery.
      publishedPeriodId: sql<string | null>`max(case when ${schedulePeriods.status} = 'PUBLISHED' and ${schedulePeriods.isCurrent} then ${schedulePeriods.id}::text end)`,
    }).from(schedulePeriods)
      .innerJoin(clients, eq(clients.id, schedulePeriods.clientId))
      .where(scope.isGlobal ? undefined : (scope.role === "ADMIN" && scope.clientIds.length ? inArray(schedulePeriods.clientId, scope.clientIds) : sql`false`))
      .groupBy(schedulePeriods.clientId, clients.companyName, schedulePeriods.planningMonth)
      .orderBy(desc(schedulePeriods.planningMonth), asc(clients.companyName))
      .limit(limit).offset(offset);
  },
  /** Assignment counts for the current published period of each client-month, keyed by period id. */
  publishedAssignmentCountByPeriod() {
    return db.select({ periodId: scheduleAssignments.schedulePeriodId, value: sql<number>`count(*)::int` })
      .from(scheduleAssignments)
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true)))
      .groupBy(scheduleAssignments.schedulePeriodId);
  },
  scheduleLifecycleCount(scope: ResolvedScope) {
    return db.select({ value: sql<number>`count(distinct (${schedulePeriods.clientId}, ${schedulePeriods.planningMonth}))::int` }).from(schedulePeriods)
      .where(scope.isGlobal ? undefined : (scope.role === "ADMIN" && scope.clientIds.length ? inArray(schedulePeriods.clientId, scope.clientIds) : sql`false`))
      .then(([row]) => Number(row?.value ?? 0));
  },

  /** Published assignments for one employee inside the window, for the Employee dashboard card. */
  myPublishedAssignments(employeeUserId: string, window: Window, limit: number) {
    return db.select(assignmentColumns).from(scheduleAssignments)
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .innerJoin(users, eq(users.id, scheduleAssignments.employeeUserId))
      .innerJoin(clients, eq(clients.id, schedulePeriods.clientId))
      .innerJoin(projects, eq(projects.id, scheduleAssignments.projectId))
      .innerJoin(locations, eq(locations.id, scheduleAssignments.locationId))
      .where(and(eq(scheduleAssignments.employeeUserId, employeeUserId), eq(schedulePeriods.status, "PUBLISHED"), eq(schedulePeriods.isCurrent, true), gte(scheduleAssignments.assignmentDate, window.from), lte(scheduleAssignments.assignmentDate, window.to)))
      .orderBy(asc(scheduleAssignments.assignmentDate), asc(scheduleAssignments.startTime), asc(scheduleAssignments.id)).limit(limit);
  },
  myRecordedSkillCount(employeeUserId: string) {
    return db.select({ value: sql<number>`count(*)::int` }).from(employeeSkills)
      .where(and(eq(employeeSkills.employeeUserId, employeeUserId), isNull(employeeSkills.archivedAt)))
      .then(([row]) => Number(row?.value ?? 0));
  },
  /** Recipient-scoped unread count for the Employee dashboard; matches the notification centre definition. */
  myUnreadNotificationCount(recipientUserId: string) {
    return db.select({ value: sql<number>`count(*)::int` }).from(notifications)
      .where(and(eq(notifications.recipientUserId, recipientUserId), isNull(notifications.readAt), isNull(notifications.archivedAt)))
      .then(([row]) => Number(row?.value ?? 0));
  },

  /**
   * Client, project and location option lists for report filters, already restricted to current scope so
   * the number of options can never reveal an out-of-scope entity.
   */
  filterOptions(scope: ResolvedScope) {
    const clientQuery = scope.isGlobal
      ? db.select({ id: clients.id, name: clients.companyName }).from(clients).where(eq(clients.status, "ACTIVE"))
      : scope.role === "ADMIN" && scope.clientIds.length
        ? db.select({ id: clients.id, name: clients.companyName }).from(clients).where(and(eq(clients.status, "ACTIVE"), inArray(clients.id, scope.clientIds)))
        : null;
    const projectQuery = scope.isGlobal
      ? db.select({ id: projects.id, name: projects.name }).from(projects)
      : scope.role === "ADMIN" && scope.projectIds.length
        ? db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, scope.projectIds))
        : null;
    const locationQuery = scope.isGlobal
      ? db.select({ id: locations.id, name: locations.name }).from(locations)
      : scope.role === "ADMIN" && scope.locationIds.length
        ? db.select({ id: locations.id, name: locations.name }).from(locations).where(inArray(locations.id, scope.locationIds))
        : null;
    return Promise.all([
      clientQuery ? clientQuery.orderBy(asc(clients.companyName)) : Promise.resolve([] as { id: string; name: string }[]),
      projectQuery ? projectQuery.orderBy(asc(projects.name)) : Promise.resolve([] as { id: string; name: string }[]),
      locationQuery ? locationQuery.orderBy(asc(locations.name)) : Promise.resolve([] as { id: string; name: string }[]),
    ]).then(([clientOptions, projectOptions, locationOptions]) => ({ clientOptions, projectOptions, locationOptions }));
  },

  /** Assignment requirements, used alongside staffing requirements for the required-versus-recorded view. */
  assignmentSkillRequirements(scope: ResolvedScope, limit: number) {
    return db.select({
      id: assignmentSkillRequirements.id, skillId: assignmentSkillRequirements.skillId, skillName: skills.name,
      assignmentId: assignmentSkillRequirements.scheduleAssignmentId,
    }).from(assignmentSkillRequirements)
      .innerJoin(skills, eq(skills.id, assignmentSkillRequirements.skillId))
      .innerJoin(scheduleAssignments, eq(scheduleAssignments.id, assignmentSkillRequirements.scheduleAssignmentId))
      .innerJoin(schedulePeriods, eq(schedulePeriods.id, scheduleAssignments.schedulePeriodId))
      .where(and(isNull(assignmentSkillRequirements.archivedAt), assignmentScope(scope)))
      .orderBy(asc(skills.name), asc(assignmentSkillRequirements.id)).limit(limit);
  },
};
