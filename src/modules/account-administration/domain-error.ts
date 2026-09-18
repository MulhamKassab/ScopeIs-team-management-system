export type AccountAdminErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DUPLICATE_IDENTITY"
  | "CONFLICT"
  | "STALE_VERSION"
  | "CREDENTIAL_EXISTS"
  | "PASSWORD_POLICY"
  | "CURRENT_PASSWORD_INVALID"
  | "LAST_SUPER_ADMIN"
  | "HIGH_RISK_CONFIRMATION_REQUIRED";

export class AccountAdminDomainError extends Error {
  constructor(public readonly code: AccountAdminErrorCode) {
    super(code);
    this.name = "AccountAdminDomainError";
  }
}
