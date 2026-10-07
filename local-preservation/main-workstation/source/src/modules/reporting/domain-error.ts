export const reportErrorCodes = ["NOT_FOUND", "FORBIDDEN", "OUT_OF_SCOPE", "VALIDATION_ERROR", "WINDOW_TOO_LARGE", "EXPORT_TOO_LARGE"] as const;
export type ReportErrorCode = (typeof reportErrorCodes)[number];

const messages: Record<ReportErrorCode, string> = {
  // An unknown report key, an unauthorized one, and an out-of-scope identifier must be indistinguishable.
  NOT_FOUND: "The requested report was not found.",
  FORBIDDEN: "The requested report was not found.",
  OUT_OF_SCOPE: "The requested report was not found.",
  VALIDATION_ERROR: "Please check the submitted report request.",
  WINDOW_TOO_LARGE: "Narrow the date range and try again.",
  EXPORT_TOO_LARGE: "Narrow the date range or filters (limit 5,000 rows)",
};

export class ReportDomainError extends Error {
  readonly status: number;
  constructor(public readonly code: ReportErrorCode, message = messages[code]) {
    super(message);
    this.name = "ReportDomainError";
    this.status = ["NOT_FOUND", "FORBIDDEN", "OUT_OF_SCOPE"].includes(code) ? 404
      : code === "VALIDATION_ERROR" ? 400
        : code === "EXPORT_TOO_LARGE" ? 413
          : 409;
  }
}

/** True for the codes that must never disclose whether a hidden record exists. */
export function isNonEnumerating(code: ReportErrorCode) { return ["NOT_FOUND", "FORBIDDEN", "OUT_OF_SCOPE"].includes(code); }
