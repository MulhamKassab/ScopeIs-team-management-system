import { UNAVAILABLE_SOURCE_STATE } from "@/modules/reporting/definitions";
import type { SystemRole } from "@/shared/types/foundation";

export const REPORTING_TIMEZONE_LABEL = "Asia/Dubai";

/** Reserved for a missing reporting source, never a description of a person. */
export function missingSourceLabel(source: string) { return `${UNAVAILABLE_SOURCE_STATE}: ${source}`; }
export const zeroStateNote = "A zero means there are no matching records in your current view.";
export function asOfLabel(asOf: string) { return `As of ${asOf} (${REPORTING_TIMEZONE_LABEL})`; }
export function planningBanner() { return "PLANNING (unpublished) — Draft and Proposed schedules only. These figures are separate from Published assignments."; }
export function exportRefusalCopy(message: string) { return message; }
export const reportIndexIntro = "Choose what you want to understand about the team. Each report uses the records you can access.";
export function reportTitle(key: string, fallback: string) {
  const titles: Record<string, string> = {
    "published-allocation": "Who is working where", "unallocated-employees": "People without scheduled work",
    "scheduled-hours": "Scheduled hours", "planning-unpublished": "Unpublished plans", "schedule-lifecycle": "Schedule status",
    "approved-leave": "Approved time off", "leave-balance": "Leave balances", "coverage-replacement": "Cover requests and decisions",
    "skills-coverage": "People and required skills", "skill-gaps": "Missing recorded skills", "certification-status": "Certification status",
    "evidence-review-queue": "Documents awaiting review", "audit-history": "Activity history",
  };
  return titles[key] ?? fallback;
}
export function metricTitle(key: string, fallback: string) {
  const titles: Record<string, string> = {
    "active-employees": "Active people", "employees-in-scope": "People you manage", "pending-replacements": "Cover requests to review",
    "awaiting-review": "Documents to review", "published-periods": "Published monthly plans", "published-assignments": "Published assignments",
    "unallocated": "People without scheduled work", "my-replacements": "My cover requests", "my-evidence": "My documents",
  };
  return titles[key] ?? fallback;
}
export function dashboardIntro(role: SystemRole) {
  return role === "EMPLOYEE" ? "Your published schedule, leave and latest updates."
    : role === "SUPER_ADMIN" ? "Start with decisions waiting for you, then review the team’s published plan."
      : "Follow your requests and review the published plan within your scope.";
}

export function dashboardAction(key: string, role: SystemRole) {
  const actions: Record<string, string> = {
    "active-employees": "View people", "employees-in-scope": "View people", "employees-by-team": "View team",
    "published-periods": "Open timetable", "published-assignments": "View assignments", "unallocated": "View people",
    "pending-leave": role === "SUPER_ADMIN" ? "Review leave" : "View leave",
    "approved-leave-days": "View approved leave", "pending-replacements": "Review requests", "my-replacements": "View my requests",
    "awaiting-review": "Review documents", "expired-certifications": "View certifications", "certifications": "View certifications",
    "schedule-lifecycle": "View schedule status", "recent-actions": "View audit history", "my-upcoming": "Open my schedule",
    "my-leave": "Open my leave", "my-leave-requests": "View my requests", "my-skills": "View my skills",
    "my-evidence": "Open my documents", "my-unread": "View notifications",
  };
  return actions[key] ?? "View details";
}

export const reportGroups = [
  { key: "staffing", label: "Understand the staffing plan", description: "Published assignments, scheduled hours and work still being planned.", reports: ["published-allocation", "unallocated-employees", "scheduled-hours", "planning-unpublished", "schedule-lifecycle"] },
  { key: "leave", label: "Plan around leave and coverage", description: "Approved leave, annual balances and replacement requests.", reports: ["approved-leave", "leave-balance", "coverage-replacement"] },
  { key: "skills", label: "Review skills and evidence", description: "Recorded skills, requirements, certifications and items awaiting review.", reports: ["skills-coverage", "skill-gaps", "certification-status", "evidence-review-queue"] },
  { key: "history", label: "Check recorded activity", description: "Trace the actions recorded in the system.", reports: ["audit-history"] },
] as const;
