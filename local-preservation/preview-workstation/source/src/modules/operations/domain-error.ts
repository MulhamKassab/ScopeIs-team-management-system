export const operationalErrorCodes = [
  "NOT_FOUND", "FORBIDDEN", "OUT_OF_SCOPE", "VALIDATION_ERROR", "CONFLICT", "STALE_VERSION", "ARCHIVED_RECORD",
  "INVALID_RELATIONSHIP", "INVALID_EMPLOYEE", "INVALID_SKILL", "ARCHIVE_BLOCKED", "DUPLICATE_RELATIONSHIP",
] as const;
export type OperationalErrorCode = (typeof operationalErrorCodes)[number];

const statusByCode: Record<OperationalErrorCode, number> = {
  NOT_FOUND: 404, FORBIDDEN: 403, OUT_OF_SCOPE: 404, VALIDATION_ERROR: 400, CONFLICT: 409, STALE_VERSION: 409,
  ARCHIVED_RECORD: 409, INVALID_RELATIONSHIP: 400, INVALID_EMPLOYEE: 400, INVALID_SKILL: 400, ARCHIVE_BLOCKED: 409, DUPLICATE_RELATIONSHIP: 409,
};
const messageByCode: Record<OperationalErrorCode, string> = {
  NOT_FOUND: "The requested operational record was not found.", FORBIDDEN: "You do not have access to this operation.", OUT_OF_SCOPE: "The requested operational record was not found.",
  VALIDATION_ERROR: "Please check the submitted operational information.", CONFLICT: "The requested operation conflicts with current data.", STALE_VERSION: "This record changed. Reload and try again.",
  ARCHIVED_RECORD: "Archived records cannot receive normal operational changes.", INVALID_RELATIONSHIP: "The selected records cannot be related.", INVALID_EMPLOYEE: "Choose an active internal employee with the required role.",
  INVALID_SKILL: "Choose an active skill.", ARCHIVE_BLOCKED: "Complete or archive every active project before archiving this client.", DUPLICATE_RELATIONSHIP: "That active relationship already exists.",
};
export class OperationalDomainError extends Error {
  readonly status: number;
  constructor(public readonly code: OperationalErrorCode, message = messageByCode[code]) { super(message); this.name = "OperationalDomainError"; this.status = statusByCode[code]; }
}
