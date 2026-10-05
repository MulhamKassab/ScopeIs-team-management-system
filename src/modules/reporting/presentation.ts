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
export function dashboardIntro(role: SystemRole) {
  return role === "EMPLOYEE" ? "Your published schedule, leave and latest updates."
    : role === "SUPER_ADMIN" ? "Start with decisions waiting for you, then review the team’s published plan."
      : "Follow your requests and review the published plan within your scope.";
}

export function dashboardAction(key: string, role: SystemRole) {
  const actions: Record<string, string> = {
    "active-employees": "View employees", "employees-in-scope": "View employees", "employees-by-team": "View team",
    "published-periods": "Open schedule", "published-assignments": "View assignments", "unallocated": "View employees",
    "pending-leave": role === "SUPER_ADMIN" ? "Review leave" : "View leave",
    "approved-leave-days": "View approved leave", "pending-replacements": "Review requests", "my-replacements": "View my requests",
    "awaiting-review": "Review evidence", "expired-certifications": "View certifications", "certifications": "View certifications",
    "schedule-lifecycle": "View schedule status", "recent-actions": "View audit history", "my-upcoming": "Open my schedule",
    "my-leave": "Open my leave", "my-leave-requests": "View my requests", "my-skills": "View my skills",
    "my-evidence": "Open my evidence", "my-unread": "View notifications",
  };
  return actions[key] ?? "View details";
}

export const reportGroups = [
  { key: "staffing", label: "Understand the staffing plan", description: "Published assignments, scheduled hours and work still being planned.", reports: ["published-allocation", "unallocated-employees", "scheduled-hours", "planning-unpublished", "schedule-lifecycle"] },
  { key: "leave", label: "Plan around leave and coverage", description: "Approved leave, annual balances and replacement requests.", reports: ["approved-leave", "leave-balance", "coverage-replacement"] },
  { key: "skills", label: "Review skills and evidence", description: "Recorded skills, requirements, certifications and items awaiting review.", reports: ["skills-coverage", "skill-gaps", "certification-status", "evidence-review-queue"] },
  { key: "history", label: "Check recorded activity", description: "Trace the actions recorded in the system.", reports: ["audit-history"] },
] as const;
