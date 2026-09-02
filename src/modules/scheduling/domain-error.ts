export const schedulingErrorCodes = [
  "NOT_FOUND", "FORBIDDEN", "OUT_OF_SCOPE", "VALIDATION_ERROR", "CONFLICT", "STALE_VERSION", "ARCHIVED_RECORD", "INVALID_RELATIONSHIP", "INVALID_EMPLOYEE", "OVERLAP", "INVALID_STATE", "REASON_REQUIRED", "NO_EMPLOYEE_VISIBILITY",
] as const;
export type SchedulingErrorCode = (typeof schedulingErrorCodes)[number];

const messages: Record<SchedulingErrorCode, string> = {
  NOT_FOUND: "The requested schedule record was not found.", FORBIDDEN: "You do not have access to this scheduling operation.", OUT_OF_SCOPE: "The requested schedule record was not found.",
  VALIDATION_ERROR: "Please check the schedule information.", CONFLICT: "The schedule conflicts with current data.", STALE_VERSION: "This schedule changed. Reload and try again.",
  ARCHIVED_RECORD: "Archived Clients, Projects, Locations, and Employees cannot receive new assignments.", INVALID_RELATIONSHIP: "Choose a Project and linked Location belonging to the selected Client.",
  INVALID_EMPLOYEE: "Choose an active Employee.", OVERLAP: "This Employee already has an overlapping assignment at the selected time.", INVALID_STATE: "This schedule state does not allow that action.",
  REASON_REQUIRED: "Explain why this proposal is being returned to Draft.", NO_EMPLOYEE_VISIBILITY: "You have scheduling scope, but no explicit TEAM-based Employee visibility. Ask a Super Admin to grant the appropriate TEAM scope.",
};

const statuses: Record<SchedulingErrorCode, number> = { NOT_FOUND: 404, FORBIDDEN: 403, OUT_OF_SCOPE: 404, VALIDATION_ERROR: 400, CONFLICT: 409, STALE_VERSION: 409, ARCHIVED_RECORD: 409, INVALID_RELATIONSHIP: 400, INVALID_EMPLOYEE: 400, OVERLAP: 409, INVALID_STATE: 409, REASON_REQUIRED: 400, NO_EMPLOYEE_VISIBILITY: 403 };
export class SchedulingDomainError extends Error {
  readonly status: number;
  constructor(public readonly code: SchedulingErrorCode, message = messages[code]) { super(message); this.name = "SchedulingDomainError"; this.status = statuses[code]; }
}
