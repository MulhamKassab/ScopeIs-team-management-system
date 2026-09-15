export const notificationErrorCodes = ["NOT_FOUND", "VALIDATION_ERROR"] as const;
export type NotificationErrorCode = (typeof notificationErrorCodes)[number];

const messages: Record<NotificationErrorCode, string> = {
  NOT_FOUND: "The requested notification was not found.",
  VALIDATION_ERROR: "Please check the submitted notification request.",
};

export class NotificationDomainError extends Error {
  readonly status: number;
  constructor(public readonly code: NotificationErrorCode, message = messages[code]) {
    super(message);
    this.name = "NotificationDomainError";
    this.status = code === "NOT_FOUND" ? 404 : 400;
  }
}
