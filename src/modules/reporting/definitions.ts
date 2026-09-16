import type { SystemRole } from "@/shared/types/foundation";

/**
 * The report contract registry.
 *
 * Every metric Phase 11 ships is declared here with its source of truth, grain, inclusion and exclusion
 * rules, date interpretation, role policy, privacy class, ordering, empty-state behaviour, and scope
 * predicate. Nothing is rendered or exported that is not registered here, so a metric can never appear
 * in the UI without a written contract.
 */

export const reportKeys = [
  "published-allocation",
  "unallocated-employees",
  "scheduled-hours",
  "planning-unpublished",
  "approved-leave",
  "leave-balance",
  "coverage-replacement",
  "skills-coverage",
  "skill-gaps",
  "certification-status",
  "evidence-review-queue",
  "schedule-lifecycle",
  "audit-history",
] as const;
export type ReportKey = (typeof reportKeys)[number];

export type ReportPrivacy = "operational" | "aggregate" | "private-owner" | "governance";
export type ReportScopePredicate = "global" | "employee-scope" | "assignment-scope" | "self";
export type ReportDateInterpretation = "business-date-window" | "planning-month" | "dubai-year" | "instant-window";

export type ReportDefinition = {
  key: ReportKey;
  label: string;
  /** What question this report answers, in the operator's words. */
  question: string;
  source: string;
  grain: string;
  include: string;
  exclude: string;
  dateInterpretation: ReportDateInterpretation;
  privacy: ReportPrivacy;
  scope: ReportScopePredicate;
  ordering: string;
  emptyState: string;
  /** Maximum inclusive window length in whole days. */
  maxWindowDays: number;
  /** Management roles allowed to open the report page. Employees never appear here. */
  viewRoles: readonly SystemRole[];
  /** Roles allowed to stream a CSV export. The audit report is never exportable. */
  exportRoles: readonly SystemRole[];
  /** Reports whose rows are Draft/Proposed planning data and must be labelled `PLANNING (unpublished)`. */
  planning?: boolean;
};

const MANAGEMENT: readonly SystemRole[] = ["SUPER_ADMIN", "ADMIN"];
const SUPER_ADMIN_ONLY: readonly SystemRole[] = ["SUPER_ADMIN"];
const TWELVE_MONTHS = 366;
const NINETY_DAYS = 90;

export const reports: Record<ReportKey, ReportDefinition> = {
  "published-allocation": {
    key: "published-allocation", label: "Published allocation",
    question: "Who is assigned to which client, project, location and date on the current Published schedule?",
    source: "schedule_assignments joined to schedule_periods, projects, locations, clients and users",
    grain: "one row per Published assignment",
    include: "assignments whose period is status 'PUBLISHED' and is_current = true, with assignment_date inside the inclusive window",
    exclude: "every DRAFT and PROPOSED period, every superseded Published revision, and any assignment outside the reader's current scope",
    dateInterpretation: "business-date-window", privacy: "operational", scope: "assignment-scope",
    ordering: "assignmentDate ascending, startTime ascending, employee display name ascending, assignment id ascending",
    emptyState: "No published assignment falls inside this window for your current scope.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: MANAGEMENT, exportRoles: MANAGEMENT,
  },
  "unallocated-employees": {
    key: "unallocated-employees", label: "Employees without a Published assignment",
    question: "Which active employees in scope hold no Published assignment in this window?",
    source: "users and employee_profiles subtracted by the distinct employee set of the Published allocation report",
    grain: "one row per active in-scope employee",
    include: "users.active = true with an employee_profiles row, inside the reader's current scope, absent from the window's Published assignments",
    exclude: "deactivated users, users without a profile, out-of-scope employees, and anyone holding at least one Published assignment in the window",
    dateInterpretation: "business-date-window", privacy: "operational", scope: "employee-scope",
    ordering: "employee display name ascending, user id ascending",
    emptyState: "Every active employee in your scope holds at least one Published assignment in this window.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: MANAGEMENT, exportRoles: SUPER_ADMIN_ONLY,
  },
  "scheduled-hours": {
    key: "scheduled-hours", label: "Published scheduled hours",
    question: "How many hours are scheduled on the current Published schedule, by employee?",
    source: "the Published allocation rows, grouped by employee",
    grain: "one row per employee with a Published assignment in the window",
    include: "current Published assignments inside the inclusive window, inside the reader's current scope",
    exclude: "DRAFT and PROPOSED periods, superseded Published revisions, and out-of-scope assignments",
    dateInterpretation: "business-date-window", privacy: "operational", scope: "assignment-scope",
    ordering: "total scheduled hours descending, employee display name ascending, user id ascending",
    emptyState: "No scheduled hours fall inside this window for your current scope.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: MANAGEMENT, exportRoles: SUPER_ADMIN_ONLY,
  },
  "planning-unpublished": {
    key: "planning-unpublished", label: "Planning (unpublished)",
    question: "What is currently planned in Draft or Proposed schedules inside my scope?",
    source: "schedule_assignments joined to schedule_periods where status is DRAFT or PROPOSED",
    grain: "one row per unpublished assignment",
    include: "assignments whose period status is 'DRAFT' or 'PROPOSED', inside the inclusive window and the reader's current scope",
    exclude: "every Published period and every assignment outside the reader's current scope",
    dateInterpretation: "business-date-window", privacy: "operational", scope: "assignment-scope",
    ordering: "assignmentDate ascending, startTime ascending, employee display name ascending, assignment id ascending",
    emptyState: "No Draft or Proposed assignment falls inside this window for your current scope.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: MANAGEMENT, exportRoles: SUPER_ADMIN_ONLY, planning: true,
  },
  "approved-leave": {
    key: "approved-leave", label: "Approved leave",
    question: "Which approved leave falls inside this window, and does it conflict with the Published plan?",
    source: "leave_requests with status 'APPROVED' intersected with the inclusive window",
    grain: "one row per approved leave request",
    include: "leave requests with status 'APPROVED' whose start_date/end_date intersect the inclusive window, inside the reader's current scope",
    exclude: "PENDING, REJECTED and CANCELLED requests from approved-day totals, private reasons, and private decision responses",
    dateInterpretation: "business-date-window", privacy: "operational", scope: "employee-scope",
    ordering: "start date ascending, employee display name ascending, leave request id ascending",
    emptyState: "No approved leave intersects this window for your current scope.",
    maxWindowDays: NINETY_DAYS, viewRoles: MANAGEMENT, exportRoles: SUPER_ADMIN_ONLY,
  },
  "leave-balance": {
    key: "leave-balance", label: "Leave balance",
    question: "How much annual leave has each employee used and how much remains this year?",
    source: "leave_allowance_settings minus approved leave working days intersecting the Dubai calendar year",
    grain: "one row per active employee",
    include: "active users with an employee_profiles row, inside the reader's current scope, for the current Dubai calendar year",
    exclude: "PENDING, REJECTED and CANCELLED requests, private reasons, and private decision responses",
    dateInterpretation: "dubai-year", privacy: "aggregate", scope: "employee-scope",
    ordering: "remaining days ascending, employee display name ascending, user id ascending",
    emptyState: "No employee is available in your current scope for a balance snapshot.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: SUPER_ADMIN_ONLY, exportRoles: SUPER_ADMIN_ONLY,
  },
  "coverage-replacement": {
    key: "coverage-replacement", label: "Replacement request status",
    question: "What coverage and replacement decisions are open, approved or rejected?",
    source: "replacement_requests with their observer counts and anchor assignment",
    grain: "one row per replacement request",
    include: "every replacement request whose anchor assignment is inside the reader's current scope",
    exclude: "request ownership never widens scope, so a request whose anchor assignment is out of scope is not listed",
    dateInterpretation: "instant-window", privacy: "operational", scope: "assignment-scope",
    ordering: "created timestamp descending, request id descending",
    emptyState: "No replacement request is anchored inside your current scope.",
    maxWindowDays: NINETY_DAYS, viewRoles: MANAGEMENT, exportRoles: SUPER_ADMIN_ONLY,
  },
  "skills-coverage": {
    key: "skills-coverage", label: "Recorded skills",
    question: "Which skills exist, and how many employees in scope have each one recorded?",
    source: "skills joined to non-archived employee_skills",
    grain: "one row per skill",
    include: "active skills, with the count of in-scope employees holding a non-archived record of that skill",
    exclude: "archived skills, archived employee-skill rows, free-text proficiency, experience text and notes",
    dateInterpretation: "instant-window", privacy: "aggregate", scope: "employee-scope",
    ordering: "recorded employee count descending, skill name ascending, skill id ascending",
    emptyState: "No skill is recorded in the catalogue yet.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: MANAGEMENT, exportRoles: SUPER_ADMIN_ONLY,
  },
  "skill-gaps": {
    key: "skill-gaps", label: "Required versus recorded skills",
    question: "Which operational skill requirements are recorded and which are not recorded in scope?",
    source: "non-archived staffing_requirements and assignment_skill_requirements compared with non-archived employee_skills",
    grain: "one row per staffing or assignment skill requirement",
    include: "non-archived requirements, with the in-scope count of employees holding the required skill recorded",
    exclude: "archived requirements, archived employee-skill rows, certification state, and any staffing-eligibility conclusion",
    dateInterpretation: "instant-window", privacy: "aggregate", scope: "employee-scope",
    ordering: "status ascending, missing employee count descending, skill name ascending, requirement id ascending",
    emptyState: "No operational skill requirement is recorded yet.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: MANAGEMENT, exportRoles: SUPER_ADMIN_ONLY,
  },
  "certification-status": {
    key: "certification-status", label: "Certification status",
    question: "What is the review and expiry state of recorded certifications?",
    source: "employee_evidence where kind = 'certification' and archived_at is null",
    grain: "one row per active certification record",
    include: "non-archived certification evidence inside the reader's current scope",
    exclude: "archived evidence, every other evidence kind, private details, external links, files and storage keys; a scoped Admin receives the summary projection only",
    dateInterpretation: "instant-window", privacy: "operational", scope: "employee-scope",
    ordering: "expiry date ascending with nulls last, employee display name ascending, evidence id ascending",
    emptyState: "No certification is recorded in your current scope.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: MANAGEMENT, exportRoles: MANAGEMENT,
  },
  "evidence-review-queue": {
    key: "evidence-review-queue", label: "Evidence awaiting review",
    question: "Which capability evidence is waiting for a Super Admin review?",
    source: "employee_evidence where review_state = 'unreviewed' and archived_at is null",
    grain: "one row per evidence item awaiting review",
    include: "non-archived evidence whose review_state is 'unreviewed'",
    exclude: "reviewed and verified items, archived evidence, private file contents, and storage keys",
    dateInterpretation: "instant-window", privacy: "governance", scope: "global",
    ordering: "last submitted timestamp ascending with nulls first, evidence id ascending",
    emptyState: "No evidence is waiting for review.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: SUPER_ADMIN_ONLY, exportRoles: SUPER_ADMIN_ONLY,
  },
  "schedule-lifecycle": {
    key: "schedule-lifecycle", label: "Schedule lifecycle",
    question: "Where does each client-month sit in the Draft, Proposed and Published lifecycle?",
    source: "schedule_periods grouped by client and planning month",
    grain: "one row per client and planning month",
    include: "every client-month whose client is inside the reader's current scope",
    exclude: "internal return reasons and any period outside the reader's current scope",
    dateInterpretation: "planning-month", privacy: "operational", scope: "assignment-scope",
    ordering: "planning month descending, client name ascending",
    emptyState: "No schedule period exists for your current scope.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: MANAGEMENT, exportRoles: SUPER_ADMIN_ONLY,
  },
  "audit-history": {
    key: "audit-history", label: "Audit history",
    question: "What authorized actions were recorded, and by whom?",
    source: "audit_events rendered exclusively through the Phase 10 per-action safe metadata allowlist",
    grain: "one row per audit event",
    include: "events matching the supplied action, target type, actor and bounded date range",
    exclude: "raw JSON metadata, unknown-action payloads, credentials, tokens, sessions, private content, and any export",
    dateInterpretation: "instant-window", privacy: "governance", scope: "global",
    ordering: "occurred timestamp descending, event id descending",
    emptyState: "No audit event matches these filters.",
    maxWindowDays: TWELVE_MONTHS, viewRoles: SUPER_ADMIN_ONLY, exportRoles: [],
  },
};

export const reportKeyList = reportKeys.slice() as unknown as ReportKey[];

export function reportDefinition(key: string): ReportDefinition | null {
  return (reportKeys as readonly string[]).includes(key) ? reports[key as ReportKey] : null;
}

export function reportLabel(key: ReportKey) { return reports[key].label; }
export function canViewReport(role: SystemRole, key: ReportKey) { return reports[key].viewRoles.includes(role); }
export function canExportReport(role: SystemRole, key: ReportKey) { return reports[key].exportRoles.includes(role); }

/** The literal data-state marker every unpublished planning row and file must carry. */
export const PLANNING_DATA_STATE = "PLANNING (unpublished)";
export const PUBLISHED_DATA_STATE = "PUBLISHED";

/** The only permitted employee conflict classifications. */
export const conflictValues = [
  "No known schedule or approved-leave conflict",
  "Approved leave on the selected date",
  "Published assignment overlaps the selected time window",
  "Approved leave and published assignment overlap",
] as const;
export type ConflictValue = (typeof conflictValues)[number];
export const CONFLICT_COLUMN_HEADER = "Schedule and approved-leave conflict";

/**
 * Terminology Phase 11 must never present. `Unavailable` is permitted only as the missing-source data
 * state for a required reporting source, never as a description of a person.
 */
export const prohibitedReportingTerms = [
  "capacity", "utilization", "contracted hours", "worked hours", "attendance",
  "performance", "productive", "qualified", "compliant", "eligible",
] as const;
export const UNAVAILABLE_SOURCE_STATE = "Unavailable";
