export const discussionErrorCodes = ["NOT_FOUND", "FORBIDDEN", "VALIDATION_ERROR", "STALE_VERSION", "INVALID_STATE", "UNSUPPORTED_PARENT"] as const;
export type DiscussionErrorCode = (typeof discussionErrorCodes)[number];

const messages: Record<DiscussionErrorCode, string> = {
  NOT_FOUND: "The requested discussion was not found.",
  FORBIDDEN: "You do not have access to this discussion.",
  VALIDATION_ERROR: "Please check the submitted message.",
  STALE_VERSION: "This message changed. Reload and try again.",
  INVALID_STATE: "This message cannot be changed in its current state.",
  UNSUPPORTED_PARENT: "Discussions are not available for this record type.",
};

export class DiscussionDomainError extends Error {
  readonly status: number;
  constructor(public readonly code: DiscussionErrorCode, message = messages[code]) {
    super(message);
    this.name = "DiscussionDomainError";
    this.status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "VALIDATION_ERROR" ? 400 : 409;
  }
}
