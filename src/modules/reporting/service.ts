import "server-only";
import { resolveCurrentActor, resolveScope, type CurrentActor, type ResolvedScope } from "@/modules/authorization/current-actor";
import { auditService } from "@/modules/audit/service";
import { deriveExpiryStatus } from "@/modules/evidence/validation";
import {
  canExportReport, canViewReport, CONFLICT_COLUMN_HEADER, conflictValues, PLANNING_DATA_STATE, PUBLISHED_DATA_STATE,
  reportDefinition, reports, type ConflictValue, type ReportKey,
} from "@/modules/reporting/definitions";
import { ReportDomainError } from "@/modules/reporting/domain-error";
import {
  addDays, assertWindow, currentDubaiMonth, dubaiToday, formatHours, fullBusinessDay, monthBounds,
  scheduledHours, workingDays, type DateWindow,
} from "@/modules/reporting/date-rules";
import { reportingRepository } from "@/modules/reporting/repositories";
import { MAX_EXPORT_ROWS, parseMonth, REPORT_PAGE_SIZE, parseReportQuery, skillStatus, type ReportQuery } from "@/modules/reporting/validation";
import type { AuthenticatedActor, SystemRole } from "@/shared/types/foundation";

export type ReportColumn = { key: string; label: string };
export type ReportRow = Record<string, string>;

export type ReportView = {
  key: ReportKey;
  label: string;
  question: string;
  asOf: string;
  windowLabel: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  page: number;
  pageSize: number;
  totalRows: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
  planning: boolean;
  exportable: boolean;
  windowFrom: string;
  windowTo: string;
  conflictDate: string;
  emptyState: string;
  notes: string[];
  /** True when a required source for this report is genuinely missing (never an employee classification). */
  unavailable: boolean;
};

export type DashboardCard = { key: string; label: string; question: string; value: string; detail?: string; href?: string; unavailable?: boolean };
export type DashboardView = { role: SystemRole; asOf: string; cards: DashboardCard[]; sections: { key: string; label: string; columns: ReportColumn[]; rows: ReportRow[] }[]; notes: string[] };

const asOfNow = () => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date());
const formatDateRange = (window: DateWindow) => `${window.from} to ${window.to}`;

function conflictValue(hasApprovedLeave: boolean, hasScheduleOverlap: boolean): ConflictValue {
  if (hasApprovedLeave && hasScheduleOverlap) return "Approved leave and published assignment overlap";
  if (hasApprovedLeave) return "Approved leave on the selected date";
  if (hasScheduleOverlap) return "Published assignment overlaps the selected time window";
  return "No known schedule or approved-leave conflict";
}

/** The default window for each report family, and the resolved conflict selection for R5. */
type WindowRequest = {
  actorId: string;
  window: DateWindow;
  page: number;
  offset: number;
  limit: number;
  month: string;
  conflict: { date: string; start: string; end: string };
  query: ReportQuery;
};
type ResolvedRequest = WindowRequest & { scope: ResolvedScope };

export class ReportingService {
  /**
   * Resolves the acting user from the database and applies role, active status and current grants. An
   * unknown, unauthorized or out-of-scope report key is refused with one non-enumerating error.
   */
  private async authorize(actor: AuthenticatedActor, reportKey: string): Promise<{ current: CurrentActor; scope: ResolvedScope; definition: ReturnType<typeof reportDefinition> }> {
    const current = await resolveCurrentActor(actor);
    if (!current) throw new ReportDomainError("NOT_FOUND");
    const definition = reportDefinition(reportKey);
    if (!definition) throw new ReportDomainError("NOT_FOUND");
    // An unauthorized role receives byte-identical output to an unknown key, so a probe cannot learn
    // that a report exists but is reserved.
    if (!canViewReport(current.role, definition.key)) throw new ReportDomainError("NOT_FOUND");
    return { current, scope: resolveScope(current), definition };
  }

  private async currentScope(actor: AuthenticatedActor) {
    const current = await resolveCurrentActor(actor);
    if (!current) throw new ReportDomainError("NOT_FOUND");
    return { current, scope: resolveScope(current) };
  }

  /**
   * Resolves the window. Reports whose contract is a planning month derive an inclusive month bound;
   * instant-window reports use the supplied or default range. Over-cap requests are refused outright.
   */
  private resolveRequest(key: ReportKey, query: ReportQuery): WindowRequest {
    const definition = reports[key];
    const today = dubaiToday();
    const month = parseMonth(query.month, currentDubaiMonth());
    const fallbackFrom = key === "leave-balance" || key === "skills-coverage" || key === "skill-gaps" || key === "certification-status" || key === "evidence-review-queue" || key === "audit-history"
      ? `${today.slice(0, 4)}-01-01`
      : key === "schedule-lifecycle"
        ? addDays(`${month}-01`, -330)
        : monthBounds(month).from;
    const fallbackTo = key === "leave-balance" || key === "skills-coverage" || key === "skill-gaps" || key === "certification-status" || key === "evidence-review-queue" || key === "audit-history"
      ? `${today.slice(0, 4)}-12-31`
      : key === "schedule-lifecycle"
        ? monthBounds(month).to
        : monthBounds(month).to;
    const window = assertWindow({ from: query.from ?? fallbackFrom, to: query.to ?? fallbackTo }, definition.maxWindowDays);
    if (key === "approved-leave" && query.date && (query.date < window.from || query.date > window.to)) throw new ReportDomainError("VALIDATION_ERROR");
    const selectedDate = key === "approved-leave" ? (query.date ?? (today >= window.from && today <= window.to ? today : window.from)) : today;
    const conflict = { ...fullBusinessDay(selectedDate), start: query.start ?? "00:00", end: query.end ?? "24:00" };
    if (conflict.end <= conflict.start) throw new ReportDomainError("VALIDATION_ERROR");
    const page = query.page ?? 1;
    return { actorId: "", window, page, offset: (page - 1) * REPORT_PAGE_SIZE, limit: REPORT_PAGE_SIZE, month, conflict, query };
  }

  /** Builds the projection for one report. The page and the CSV export share this exact result. */
  async report(actor: AuthenticatedActor, reportKey: string, input: unknown = {}): Promise<ReportView> {
    const parsedQuery = parseReportQuery(input);
    const { current, scope, definition } = await this.authorize(actor, reportKey);
    const key = definition!.key;
    const request = { ...this.resolveRequest(key, parsedQuery), scope, actorId: actor.id };
    const builder = this.builders[key];
    const built = await builder.call(this, request);
    return {
      key, label: definition!.label, question: definition!.question, asOf: asOfNow(),
      windowLabel: formatDateRange(request.window) + (key === "approved-leave" ? ` · conflict date ${request.conflict.date}` : ""),
      windowFrom: request.window.from, windowTo: request.window.to, conflictDate: request.conflict.date,
      columns: built.columns, rows: built.rows, page: request.page, pageSize: request.limit, totalRows: built.total ?? null,
      exportable: canExportReport(current.role, definition!.key),
      hasNext: built.total === undefined ? built.rows.length === request.limit : (request.offset + built.rows.length) < built.total,
      hasPrevious: request.page > 1, planning: Boolean(definition!.planning),
      emptyState: definition!.emptyState, notes: built.notes ?? [], unavailable: built.unavailable ?? false,
    };
  }

  private assignmentsToRows(rows: Awaited<ReturnType<typeof reportingRepository.publishedAssignments>>, dataState: string): ReportRow[] {
    return rows.map((row) => ({
      data_state: dataState, assignment_date: row.assignmentDate, start_time: String(row.startTime).slice(0, 5),
      end_time: String(row.endTime).slice(0, 5), scheduled_hours: formatHours(scheduledHours(String(row.startTime), String(row.endTime))),
      employee_name: row.employeeName, project_name: row.projectName, location_name: row.locationName, client_name: row.clientName,
      planning_month: row.planningMonth.slice(0, 7),
    }));
  }

  private static assignmentColumns(includeState: boolean): ReportColumn[] {
    const columns: ReportColumn[] = [];
    if (includeState) columns.push({ key: "data_state", label: "Data state" });
    columns.push(
      { key: "assignment_date", label: "Assignment date" }, { key: "start_time", label: "Start time" },
      { key: "end_time", label: "End time" }, { key: "scheduled_hours", label: "Scheduled hours" },
      { key: "employee_name", label: "Employee" }, { key: "project_name", label: "Project" },
      { key: "location_name", label: "Location" }, { key: "client_name", label: "Client" },
      { key: "planning_month", label: "Planning month" },
    );
    return columns;
  }

  private readonly builders: Record<ReportKey, (request: ResolvedRequest) => Promise<{ columns: ReportColumn[]; rows: ReportRow[]; total?: number; notes?: string[]; unavailable?: boolean }>> = {
    "published-allocation": async (request) => {
      const [rows, total] = await Promise.all([
        reportingRepository.publishedAssignments(request.scope, request.window, request.limit, request.offset),
        reportingRepository.publishedAssignmentCount(request.scope, request.window),
      ]);
      return { columns: ReportingService.assignmentColumns(true), rows: this.assignmentsToRows(rows, PUBLISHED_DATA_STATE), total, notes: ["Published assignments only. Draft and Proposed scheduling is never included."] };
    },

    "unallocated-employees": async (request) => {
      const [rows, total] = await Promise.all([
        reportingRepository.unallocatedEmployees(request.scope, request.window, request.limit, request.offset),
        reportingRepository.unallocatedEmployeeCount(request.scope, request.window),
      ]);
      return {
        columns: [{ key: "employee_name", label: "Employee" }, { key: "employee_code", label: "Employee code" }, { key: "team", label: "Team" }],
        rows: rows.map((row) => ({ employee_name: row.displayName, employee_code: "", team: row.team ?? "No team recorded" })),
        total,
        notes: ["A person listed here may still hold Draft or Proposed work; this report reads the current Published schedule only."],
      };
    },

    "scheduled-hours": async (request) => {
      const rows = await reportingRepository.publishedAssignments(request.scope, request.window, MAX_EXPORT_ROWS, 0);
      const totals = new Map<string, { name: string; hours: number; assignments: number }>();
      for (const row of rows) {
        const entry = totals.get(row.employeeUserId) ?? { name: row.employeeName, hours: 0, assignments: 0 };
        entry.hours += scheduledHours(String(row.startTime), String(row.endTime));
        entry.assignments += 1;
        totals.set(row.employeeUserId, entry);
      }
      const grouped = [...totals.values()].sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
      const page = grouped.slice(request.offset, request.offset + request.limit);
      return {
        columns: [{ key: "employee_name", label: "Employee" }, { key: "assignment_count", label: "Published assignments" }, { key: "total_hours", label: "Total scheduled hours" }],
        rows: page.map((entry) => ({ employee_name: entry.name, assignment_count: String(entry.assignments), total_hours: formatHours(entry.hours) })),
        total: grouped.length,
        notes: ["Total scheduled hours is the arithmetic sum of each Published assignment's start and end time. It is not worked time, attendance, or a capacity measure."],
      };
    },

    "planning-unpublished": async (request) => {
      const rows = await reportingRepository.planningAssignments(request.scope, request.window, request.limit, request.offset);
      const projected = rows.map((row) => ({
        data_state: PLANNING_DATA_STATE, assignment_date: row.assignmentDate, start_time: String(row.startTime).slice(0, 5),
        end_time: String(row.endTime).slice(0, 5), scheduled_hours: formatHours(scheduledHours(String(row.startTime), String(row.endTime))),
        employee_name: row.employeeName, project_name: row.projectName, location_name: row.locationName, client_name: row.clientName,
        planning_month: row.planningMonth.slice(0, 7), period_status: row.periodStatus, revision_number: String(row.revisionNumber),
      }));
      const count = await reportingRepository.publishedAssignmentCount(request.scope, request.window);
      return {
        columns: [...ReportingService.assignmentColumns(true), { key: "period_status", label: "Period status" }, { key: "revision_number", label: "Revision" }],
        rows: projected, total: undefined, notes: [
          `${PLANNING_DATA_STATE} — Draft and Proposed scheduling only. These figures are never combined with Published allocation.`,
          `For comparison, this scope holds ${count} current Published assignment(s) in the same window.`,
        ],
      };
    },

    "approved-leave": async (request) => {
      const [rows, total, leaveOnDate, scheduleInWindow] = await Promise.all([
        reportingRepository.approvedLeave(request.scope, request.window, request.limit, request.offset),
        reportingRepository.approvedLeaveCount(request.scope, request.window),
        reportingRepository.approvedLeaveOnDate(request.scope, request.conflict.date),
        reportingRepository.publishedAssignmentEmployeesInWindow(request.scope, request.conflict.date, request.conflict.start, request.conflict.end),
      ]);
      return {
        columns: [
          { key: "employee_name", label: "Employee" }, { key: "start_date", label: "Start date" }, { key: "end_date", label: "End date" },
          { key: "approved_working_days", label: "Approved working days in window" },
          { key: "conflict", label: CONFLICT_COLUMN_HEADER },
        ],
        rows: rows.map((row) => {
          const overlapFrom = row.startDate > request.window.from ? row.startDate : request.window.from;
          const overlapTo = row.endDate < request.window.to ? row.endDate : request.window.to;
          return {
            employee_name: row.employeeName, start_date: row.startDate, end_date: row.endDate,
            approved_working_days: String(workingDays(overlapFrom, overlapTo)),
            conflict: conflictValue(leaveOnDate.has(row.employeeUserId), scheduleInWindow.has(row.employeeUserId)),
          };
        }),
        total,
        notes: [
          `Conflict facts are evaluated for ${request.conflict.date} ${request.conflict.start}–${request.conflict.end} (Asia/Dubai).`,
          "A conflict fact records only that no approved leave and no current Published assignment overlap was found. It is not a statement about a person's availability or capacity.",
          "Leave reasons and private decision responses are never included in this report.",
          `Permitted conflict values: ${conflictValues.join(" · ")}`,
        ],
      };
    },

    "leave-balance": async (request) => {
      const [allowance, employees, approved] = await Promise.all([
        reportingRepository.allowance(),
        reportingRepository.activeEmployees(request.scope, MAX_EXPORT_ROWS, 0),
        reportingRepository.approvedLeaveForYear(request.scope, request.window.from, request.window.to),
      ]);
      if (!allowance) {
        return { columns: [{ key: "employee_name", label: "Employee" }], rows: [], total: 0, unavailable: true, notes: ["The leave allowance setting is missing, so a balance cannot be reported."] };
      }
      const used = new Map<string, number>();
      for (const entry of approved) {
        const from = entry.startDate < request.window.from ? request.window.from : entry.startDate;
        const to = entry.endDate > request.window.to ? request.window.to : entry.endDate;
        used.set(entry.employeeUserId, (used.get(entry.employeeUserId) ?? 0) + workingDays(from, to));
      }
      const rows = employees.map((employee) => {
        const consumed = used.get(employee.id) ?? 0;
        return { employee_name: employee.displayName, allowance: String(allowance.annualWorkingDays), used: String(consumed), remaining: String(allowance.annualWorkingDays - consumed) };
      }).sort((a, b) => Number(a.remaining) - Number(b.remaining) || a.employee_name.localeCompare(b.employee_name));
      return {
        columns: [{ key: "employee_name", label: "Employee" }, { key: "allowance", label: "Annual allowance (working days)" }, { key: "used", label: "Approved working days used" }, { key: "remaining", label: "Remaining working days" }],
        rows: rows.slice(request.offset, request.offset + request.limit), total: rows.length,
        notes: [`Balance for the ${request.window.from.slice(0, 4)} Dubai calendar year. Reasons and decision responses are never included.`],
      };
    },

    "coverage-replacement": async (request) => {
      const [rows, total] = await Promise.all([
        reportingRepository.replacementRequests(request.scope, request.limit, request.offset),
        reportingRepository.replacementRequestCount(request.scope),
      ]);
      return {
        columns: [
          { key: "requested_at", label: "Requested at" }, { key: "intent", label: "Intent" }, { key: "status", label: "Status" },
          { key: "effect_status", label: "Schedule effect" }, { key: "requested_by", label: "Requested by" },
          { key: "observed_required", label: "Required count observed" }, { key: "observed_eligible", label: "Recorded count observed" },
        ],
        rows: rows.map((row) => ({
          requested_at: new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Dubai" }).format(row.createdAt),
          intent: row.intent === "REPLACE_ASSIGNMENT" ? "Replace assignment employee" : "Add coverage assignment",
          status: row.status, effect_status: row.effectStatus, requested_by: row.requesterName,
          observed_required: String(row.observedRequiredEmployeeCount), observed_eligible: String(row.observedEligibleEmployeeCount),
        })),
        total,
        notes: ["Rows are limited to requests whose anchor assignment is inside your current scope. A fleet-wide open-gap figure is not offered: coverage gaps are computed per anchor assignment."],
      };
    },

    "skills-coverage": async (request) => {
      const [allSkills, relations] = await Promise.all([reportingRepository.skills(), reportingRepository.recordedSkillRelations()]);
      const inScope = relations.filter((relation) => request.scope.isGlobal || (request.scope.role === "ADMIN" && relation.team !== null && request.scope.teams.includes(relation.team)));
      const counts = new Map<string, Set<string>>();
      for (const relation of inScope) {
        const set = counts.get(relation.skillId) ?? new Set<string>();
        set.add(relation.employeeUserId);
        counts.set(relation.skillId, set);
      }
      const rows = allSkills.filter((skill) => skill.active).map((skill) => ({ skill_name: skill.name, recorded_employees: String(counts.get(skill.id)?.size ?? 0) }))
        .sort((a, b) => Number(b.recorded_employees) - Number(a.recorded_employees) || a.skill_name.localeCompare(b.skill_name));
      return {
        columns: [{ key: "skill_name", label: "Skill" }, { key: "recorded_employees", label: "Employees with this skill recorded" }],
        rows: rows.slice(request.offset, request.offset + request.limit), total: rows.length,
        notes: ["Counts include non-archived skill records for active or inactive employees inside your scope. Free-text proficiency, experience and notes are never reported."],
      };
    },

    "skill-gaps": async (request) => {
      const [requirements, assignmentRequirements, relations] = await Promise.all([
        reportingRepository.skillRequirements(),
        reportingRepository.assignmentSkillRequirements(request.scope, MAX_EXPORT_ROWS),
        reportingRepository.recordedSkillRelations(),
      ]);
      const inScope = relations.filter((relation) => request.scope.isGlobal || (request.scope.role === "ADMIN" && relation.team !== null && request.scope.teams.includes(relation.team)));
      const counts = new Map<string, Set<string>>();
      for (const relation of inScope) {
        const set = counts.get(relation.skillId) ?? new Set<string>();
        set.add(relation.employeeUserId);
        counts.set(relation.skillId, set);
      }
      const operational = requirements.filter((requirement) => request.scope.isGlobal
        || (request.scope.role === "ADMIN"
          && ((requirement.clientId !== null && request.scope.clientIds.includes(requirement.clientId))
            || (requirement.projectId !== null && request.scope.projectIds.includes(requirement.projectId))
            || (requirement.locationId !== null && request.scope.locationIds.includes(requirement.locationId))))
      ).map((requirement) => {
        const recorded = counts.get(requirement.skillId)?.size ?? 0;
        const scopeLabel = requirement.clientName ?? requirement.projectName ?? requirement.locationName ?? "—";
        return {
          requirement_type: "Operational rule", scope: scopeLabel, skill_name: requirement.skillName,
          required_count: String(requirement.requiredCount), recorded_count: String(recorded),
          missing_count: String(Math.max(0, requirement.requiredCount - recorded)),
          status: skillStatus(recorded, requirement.requiredCount),
        };
      });
      const assignmentRows = assignmentRequirements.map((requirement) => {
        const recorded = counts.get(requirement.skillId)?.size ?? 0;
        return {
          requirement_type: "Assignment requirement", scope: "Published assignment", skill_name: requirement.skillName,
          required_count: "1", recorded_count: String(recorded), missing_count: recorded >= 1 ? "0" : "1",
          status: skillStatus(recorded, 1),
        };
      });
      const rows = [...operational, ...assignmentRows].sort((a, b) => a.status.localeCompare(b.status) || Number(b.missing_count) - Number(a.missing_count) || a.skill_name.localeCompare(b.skill_name));
      return {
        columns: [
          { key: "requirement_type", label: "Requirement type" }, { key: "scope", label: "Scope" }, { key: "skill_name", label: "Required skill" },
          { key: "required_count", label: "Required employees" }, { key: "recorded_count", label: "Employees with it recorded" },
          { key: "missing_count", label: "Missing" }, { key: "status", label: "Status" },
        ],
        rows: rows.slice(request.offset, request.offset + request.limit), total: rows.length,
        notes: ["Status is either `recorded` or `not recorded`. This view is informational and non-blocking, and records no staffing conclusion.",
          "Certification state never contributes to this comparison."],
      };
    },

    "certification-status": async (request) => {
      const includePrivate = request.scope.isGlobal;
      const [rows, total] = await Promise.all([
        reportingRepository.certifications(request.scope, includePrivate, null, request.limit, request.offset),
        reportingRepository.certificationCount(request.scope, null),
      ]);
      const columns: ReportColumn[] = includePrivate
        ? [{ key: "employee_name", label: "Employee" }, { key: "title", label: "Title" }, { key: "issuer", label: "Issuer" },
           { key: "issue_date", label: "Issue date" }, { key: "expiry_date", label: "Expiry date" }, { key: "expiry_state", label: "Expiry state" },
           { key: "review_state", label: "Review state" }, { key: "related_skill", label: "Related skill" }]
        : [{ key: "title", label: "Title" }, { key: "issuer", label: "Issuer" }, { key: "issue_date", label: "Issue date" },
           { key: "expiry_date", label: "Expiry date" }, { key: "expiry_state", label: "Expiry state" },
           { key: "review_state", label: "Review state" }, { key: "related_skill", label: "Related skill" }];
      const projected = rows.map((row) => {
        const base = {
          title: row.title, issuer: row.issuer ?? "—", issue_date: row.issueDate ?? "—", expiry_date: row.expiryDate ?? "No expiry date",
          expiry_state: deriveExpiryStatus(row.expiryDate), review_state: row.reviewState, related_skill: row.skillName ?? "—",
        };
        return includePrivate ? { employee_name: row.ownerName, ...base } : base;
      });
      return {
        columns, rows: projected, total,
        notes: ["Verification and review are informational and gate nothing. Expiry state is derived from the Asia/Dubai business date.",
          ...(includePrivate ? [] : ["Your role receives the approved certification summary fields only; private detail, links and files are withheld."])],
      };
    },

    "evidence-review-queue": async (request) => {
      const [rows, total] = await Promise.all([
        reportingRepository.evidenceAwaitingReview(request.limit, request.offset),
        reportingRepository.evidenceAwaitingReviewCount(),
      ]);
      return {
        columns: [{ key: "kind", label: "Type" }, { key: "title", label: "Title" }, { key: "employee_name", label: "Employee" }, { key: "submitted_at", label: "Submitted at" }],
        rows: rows.map((row) => ({
          kind: row.kind, title: row.title, employee_name: row.ownerName,
          submitted_at: row.lastSubmittedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Dubai" }).format(row.lastSubmittedAt) : "—",
        })),
        total,
        notes: ["Oldest submissions first. File contents, storage keys and private links are never included."],
      };
    },

    "schedule-lifecycle": async (request) => {
      const [rows, total, counts] = await Promise.all([
        reportingRepository.scheduleLifecycle(request.scope, request.limit, request.offset),
        reportingRepository.scheduleLifecycleCount(request.scope),
        reportingRepository.publishedAssignmentCountByPeriod(),
      ]);
      const countByPeriod = new Map(counts.map((row) => [row.periodId, row.value]));
      return {
        columns: [
          { key: "planning_month", label: "Planning month" }, { key: "client_name", label: "Client" },
          { key: "effective_state", label: "Effective state" }, { key: "latest_revision", label: "Latest revision" },
          { key: "published_revision", label: "Published revision" }, { key: "published_assignments", label: "Published assignments" },
          { key: "published_at", label: "Published at" },
        ],
        rows: rows.map((row) => ({
          planning_month: row.planningMonth.slice(0, 7), client_name: row.clientName, effective_state: row.effectiveState,
          latest_revision: String(row.latestRevision), published_revision: row.publishedRevision === null ? "—" : String(row.publishedRevision),
          published_assignments: String(row.publishedPeriodId ? countByPeriod.get(row.publishedPeriodId) ?? 0 : 0),
          published_at: row.publishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date(row.publishedAt)) : "—",
        })),
        total,
        notes: ["Each client-month appears once with its effective state: Published when a current published revision exists, otherwise the open Draft or Proposed state."],
      };
    },

    "audit-history": async (request) => {
      const history = await auditService.history({ id: request.actorId, role: request.scope.role, displayName: "", sessionId: "", sessionVersion: 1, scopes: [], authenticationMode: "mock" } as AuthenticatedActor, {
        action: request.query.action, targetType: request.query.targetType, actorUserId: request.query.actorUserId,
        from: request.window.from, to: request.window.to, page: request.page,
      });
      return {
        columns: [
          { key: "occurred_at", label: "Occurred at" }, { key: "action", label: "Action" }, { key: "target", label: "Target" },
          { key: "actor", label: "Actor" }, { key: "safe_fields", label: "Recorded detail" },
        ],
        rows: history.items.map((item) => ({
          occurred_at: new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Dubai" }).format(new Date(item.occurredAt)),
          action: item.label, target: `${item.targetType}${item.targetId ? ` · ${item.targetId}` : ""}`,
          actor: item.actorName ?? "Removed actor",
          safe_fields: item.fields.map((field) => `${field.key}=${field.value}`).join("; ") || "—",
        })),
        total: history.total,
        notes: ["Only allowlisted, safe metadata is rendered. Unknown action types show a generic label with no detail. Audit history has no export."],
      };
    },
  };

  /** The report index, filtered to the reports this role may open. */
  async index(actor: AuthenticatedActor) {
    const current = await resolveCurrentActor(actor);
    if (!current) throw new ReportDomainError("NOT_FOUND");
    const scope = resolveScope(current);
    const [options, lifecycle] = await Promise.all([reportingRepository.filterOptions(scope), reportingRepository.scheduleLifecycleCount(scope)]);
    return {
      role: current.role,
      entries: Object.values(reports).filter((definition) => canViewReport(current.role, definition.key)).map((definition) => ({
        key: definition.key, label: definition.planning ? `${definition.label.toUpperCase()}` : definition.label,
        question: definition.question, grain: definition.grain, privacy: definition.privacy,
        planning: Boolean(definition.planning), exportable: definition.exportRoles.includes(current.role) && definition.exportRoles.length > 0,
      })),
      options, clientMonths: lifecycle,
    };
  }

  /** Role-specific dashboard. Every card is a count over a named source, computed under current scope. */
  /**
   * Collects the full authorized row set for an export, one row beyond the cap so the caller can refuse
   * rather than truncate. Uses the same builder as the on-screen report, so the projection is identical.
   */
  async exportPayload(actor: AuthenticatedActor, reportKey: string, input: unknown = {}) {
    const parsedQuery = parseReportQuery(input);
    const { scope, definition } = await this.authorize(actor, reportKey);
    const key = definition!.key;
    const request: ResolvedRequest = { ...this.resolveRequest(key, parsedQuery), scope, actorId: actor.id, offset: 0, limit: MAX_EXPORT_ROWS + 1 };
    const built = await this.builders[key].call(this, request);
    return { key, definition: definition!, columns: built.columns, rows: built.rows, window: request.window, planning: Boolean(definition!.planning) };
  }

  async dashboard(actor: AuthenticatedActor): Promise<DashboardView> {
    const { current, scope } = await this.currentScope(actor);
    const today = dubaiToday();
    const month = currentDubaiMonth();
    const window = monthBounds(month);
    const asOf = asOfNow();

    if (current.role === "EMPLOYEE") {
      const upcoming = { from: today, to: addDays(today, 6) };
      const [assignments, skills, evidence, unread] = await Promise.all([
        reportingRepository.myPublishedAssignments(current.id, upcoming, 20),
        reportingRepository.myRecordedSkillCount(current.id),
        reportingRepository.evidenceStateCounts(current.id),
        reportingRepository.myUnreadNotificationCount(current.id),
      ]);
      const evidenceCounts = evidence.reduce((totals, item) => {
        totals.byReview[item.reviewState] = (totals.byReview[item.reviewState] ?? 0) + 1;
        if (item.expiryDate && item.expiryDate < today) totals.expired += 1;
        return totals;
      }, { byReview: {} as Record<string, number>, expired: 0 });
      return {
        role: current.role, asOf,
        cards: [
          { key: "my-assignments", label: "My published assignments (next 7 days)", question: "What am I scheduled for this week?", value: String(assignments.length), href: "/schedule" },
          { key: "my-skills", label: "Skills I have recorded", question: "How many skills are on my profile?", value: String(skills), href: "/profile" },
          { key: "my-evidence", label: "My capability evidence", question: "What evidence have I recorded?", value: String(evidence.length), detail: `${evidenceCounts.expired} expired`, href: "/profile" },
          { key: "my-unread", label: "My unread notifications", question: "Do I have anything new?", value: String(unread), href: "/notifications" },
        ],
        sections: [{
          key: "my-upcoming", label: "My published assignments (next 7 days)",
          columns: [{ key: "assignment_date", label: "Date" }, { key: "time", label: "Time" }, { key: "project_name", label: "Project" }, { key: "location_name", label: "Location" }, { key: "client_name", label: "Client" }],
          rows: assignments.map((row) => ({ assignment_date: row.assignmentDate, time: `${String(row.startTime).slice(0, 5)}–${String(row.endTime).slice(0, 5)}`, project_name: row.projectName, location_name: row.locationName, client_name: row.clientName })),
        }],
        notes: ["Your dashboard reads only the current Published schedule and your own records."],
      };
    }

    const [activeEmployees, teams, publishedPeriods, publishedAssignments, unallocated, pendingLeave, approvedLeaveRows, pendingReplacements, awaitingReview, expiredCertifications] = await Promise.all([
      reportingRepository.activeEmployeeCount(scope),
      reportingRepository.employeesByTeam(scope),
      reportingRepository.currentPublishedPeriodCount(scope, month),
      reportingRepository.publishedAssignmentCount(scope, window),
      reportingRepository.unallocatedEmployeeCount(scope, window),
      reportingRepository.pendingLeaveCount(scope),
      reportingRepository.approvedLeave(scope, window, MAX_EXPORT_ROWS, 0),
      reportingRepository.pendingReplacementCount(scope),
      current.role === "SUPER_ADMIN" ? reportingRepository.evidenceAwaitingReviewCount() : Promise.resolve(null),
      current.role === "SUPER_ADMIN" ? reportingRepository.expiredCertificationCount(scope, today) : Promise.resolve(null),
    ]);
    const approvedDays = approvedLeaveRows.reduce((total, row) => {
      const from = row.startDate > window.from ? row.startDate : window.from;
      const to = row.endDate < window.to ? row.endDate : window.to;
      return total + workingDays(from, to);
    }, 0);

    if (current.role === "ADMIN") {
      const [certifications, myRequests] = await Promise.all([
        reportingRepository.certificationCount(scope, null),
        reportingRepository.myReplacementCount(current.id, scope),
      ]);
      return {
        role: current.role, asOf,
        cards: [
          { key: "employees-in-scope", label: "Active employees in my scope", question: "How many people can I see?", value: String(activeEmployees), href: "/employees" },
          { key: "published-periods", label: "Current Published client-months", question: "Which client months are published in my scope?", value: String(publishedPeriods), href: "/schedule" },
          { key: "published-assignments", label: "Published assignments this month", question: "How much published staffing exists this month?", value: String(publishedAssignments), href: "/reports/published-allocation" },
          { key: "unallocated", label: "Employees with no Published assignment this month", question: "Who is unallocated in the plan?", value: String(unallocated), href: "/reports/unallocated-employees" },
          { key: "pending-leave", label: "Pending leave requests", question: "What is waiting on a decision?", value: String(pendingLeave), href: "/leave" },
          { key: "approved-leave-days", label: "Approved leave days this month", question: "How much leave is approved this month?", value: String(approvedDays), href: "/reports/approved-leave" },
          { key: "my-replacements", label: "Replacement requests I raised", question: "What did I request?", value: String(myRequests), href: "/replacements" },
          { key: "certifications", label: "Certifications in my scope", question: "How many certifications are recorded?", value: String(certifications), href: "/reports/certification-status" },
        ],
        sections: [{ key: "employees-by-team", label: "Employees by team", columns: [{ key: "team", label: "Team" }, { key: "count", label: "Employees" }], rows: teams.map((row) => ({ team: row.team ?? "No team recorded", count: String(row.value) })) }],
        notes: ["Every card is recalculated from your current scope on each request.", "Private leave reasons, management notes, evidence files and audit history are outside your reporting scope."],
      };
    }

    return {
      role: current.role, asOf,
      cards: [
        { key: "active-employees", label: "Active employees", question: "How many people are on the books?", value: String(activeEmployees), href: "/employees" },
        { key: "published-periods", label: "Current Published client-months", question: "Which client months are published this month?", value: String(publishedPeriods), href: "/schedule" },
        { key: "published-assignments", label: "Published assignments this month", question: "How much published staffing exists this month?", value: String(publishedAssignments), href: "/reports/published-allocation" },
        { key: "unallocated", label: "Employees with no Published assignment this month", question: "Who is unallocated in the plan?", value: String(unallocated), href: "/reports/unallocated-employees" },
        { key: "pending-leave", label: "Pending leave requests", question: "What is waiting on a decision?", value: String(pendingLeave), href: "/leave" },
        { key: "approved-leave-days", label: "Approved leave days this month", question: "How much leave is approved this month?", value: String(approvedDays), href: "/reports/approved-leave" },
        { key: "pending-replacements", label: "Pending replacement requests", question: "Which coverage decisions are open?", value: String(pendingReplacements), href: "/replacements" },
        { key: "awaiting-review", label: "Evidence awaiting review", question: "What needs a Super Admin review?", value: awaitingReview === null ? "—" : String(awaitingReview), href: "/reports/evidence-review-queue" },
        { key: "expired-certifications", label: "Expired certifications", question: "Which certifications have lapsed?", value: expiredCertifications === null ? "—" : String(expiredCertifications), href: "/reports/certification-status" },
      ],
      sections: [{ key: "employees-by-team", label: "Employees by team", columns: [{ key: "team", label: "Team" }, { key: "count", label: "Employees" }], rows: teams.map((row) => ({ team: row.team ?? "No team recorded", count: String(row.value) })) }],
      notes: ["Every card reads a named source under your current authorization and shows its own as-of time."],
    };
  }
}

export const reportingService = new ReportingService();
