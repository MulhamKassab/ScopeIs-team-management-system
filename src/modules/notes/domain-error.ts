export const noteErrorCodes = ["NOT_FOUND", "FORBIDDEN", "OUT_OF_SCOPE", "VALIDATION_ERROR", "STALE_VERSION", "INVALID_STATE"] as const;
export type NoteErrorCode = (typeof noteErrorCodes)[number];

const messages: Record<NoteErrorCode, string> = {
  NOT_FOUND: "The requested note was not found.",
  FORBIDDEN: "You do not have access to this note operation.",
  // Out-of-scope and not-found share one message so note existence is never disclosed.
  OUT_OF_SCOPE: "The requested note was not found.",
  VALIDATION_ERROR: "Please check the submitted note.",
  STALE_VERSION: "This note changed. Reload and try again.",
  INVALID_STATE: "This note cannot be changed in its current state.",
};

export class NoteDomainError extends Error {
  readonly status: number;
  constructor(public readonly code: NoteErrorCode, message = messages[code]) {
    super(message);
    this.name = "NoteDomainError";
    this.status = ["NOT_FOUND", "OUT_OF_SCOPE"].includes(code) ? 404 : code === "FORBIDDEN" ? 403 : code === "VALIDATION_ERROR" ? 400 : 409;
  }
}
