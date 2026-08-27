export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "OUT_OF_SCOPE"
  | "VALIDATION"
  | "SESSION_EXPIRED"
  | "MOCK_AUTH_UNAVAILABLE"
  | "STALE_UPDATE"
  | "PROVIDER_NOT_CONFIGURED"
  | "DATABASE_FAILURE";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  unauthenticated: () => new AppError("UNAUTHENTICATED", "Please sign in to continue.", 401),
  forbidden: () => new AppError("FORBIDDEN", "You do not have access to this resource.", 403),
  outOfScope: () => new AppError("OUT_OF_SCOPE", "This resource is outside your assigned scope.", 403),
  validation: () => new AppError("VALIDATION", "Please check the submitted information.", 400),
  sessionExpired: () => new AppError("SESSION_EXPIRED", "Your session has expired. Please sign in again.", 401),
  mockUnavailable: () => new AppError("MOCK_AUTH_UNAVAILABLE", "Mock authentication is unavailable.", 503),
  stale: () => new AppError("STALE_UPDATE", "This record changed. Reload and try again.", 409),
  providerNotConfigured: () => new AppError("PROVIDER_NOT_CONFIGURED", "This provider is not configured.", 503),
  database: () => new AppError("DATABASE_FAILURE", "A safe database operation could not be completed.", 500),
};
