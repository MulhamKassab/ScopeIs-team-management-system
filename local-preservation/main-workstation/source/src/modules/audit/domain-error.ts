export const auditErrorCodes = ["NOT_FOUND", "VALIDATION_ERROR"] as const;
export type AuditErrorCode = (typeof auditErrorCodes)[number];

const messages: Record<AuditErrorCode, string> = {
  // Admin and Employee receive the same refusal as a nonexistent audit surface.
  NOT_FOUND: "The requested audit record was not found.",
  VALIDATION_ERROR: "Please check the submitted audit filter.",
};

export class AuditDomainError extends Error {
  readonly status: number;
  constructor(public readonly code: AuditErrorCode, message = messages[code]) {
    super(message);
    this.name = "AuditDomainError";
    this.status = code === "NOT_FOUND" ? 404 : 400;
  }
}
