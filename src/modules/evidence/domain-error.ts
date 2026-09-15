export const evidenceErrorCodes = ["NOT_FOUND", "FORBIDDEN", "OUT_OF_SCOPE", "VALIDATION_ERROR", "STALE_VERSION", "INVALID_STATE", "DUPLICATE_SUBMISSION", "STORAGE_FAILURE"] as const;
export type EvidenceErrorCode = (typeof evidenceErrorCodes)[number];

const messages: Record<EvidenceErrorCode, string> = {
  NOT_FOUND: "The requested evidence record was not found.",
  FORBIDDEN: "You do not have access to this evidence operation.",
  // Out-of-scope and not-found share one message so existence is never disclosed.
  OUT_OF_SCOPE: "The requested evidence record was not found.",
  VALIDATION_ERROR: "Please check the submitted evidence information.",
  STALE_VERSION: "This evidence record changed. Reload and try again.",
  INVALID_STATE: "This evidence record cannot be changed in its current state.",
  DUPLICATE_SUBMISSION: "This submission was already received.",
  STORAGE_FAILURE: "The private file could not be stored. Nothing was saved.",
};

export class EvidenceDomainError extends Error {
  readonly status: number;
  constructor(public readonly code: EvidenceErrorCode, message = messages[code]) {
    super(message);
    this.name = "EvidenceDomainError";
    this.status = ["NOT_FOUND", "OUT_OF_SCOPE"].includes(code) ? 404 : code === "FORBIDDEN" ? 403 : code === "VALIDATION_ERROR" ? 400 : 409;
  }
}
