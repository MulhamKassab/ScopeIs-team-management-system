import { AccountAdminDomainError } from "./domain-error";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import { errors } from "@/shared/errors/app-error";

/** Safe, database-free mapping from a domain failure to a public message. Never echoes input. */
export function accountErrorMessage(error: unknown): string {
  if (error instanceof AccountAdminDomainError) {
    switch (error.code) {
      case "FORBIDDEN": return "You are not authorized to manage accounts.";
      case "NOT_FOUND": return "That account could not be found.";
      case "DUPLICATE_IDENTITY": return "That username or login email is already in use.";
      case "CREDENTIAL_EXISTS": return "This workforce record already has sign-in credentials.";
      case "STALE_VERSION": return "This account changed. Reload and try again.";
      case "CURRENT_PASSWORD_INVALID": return "Your current password is incorrect.";
      case "HIGH_RISK_CONFIRMATION_REQUIRED": return "Confirm the high-risk action before continuing.";
      case "LAST_SUPER_ADMIN": return "The last active Super Admin cannot be removed.";
      case "PASSWORD_POLICY": return "The password does not meet the required policy.";
      case "CONFLICT": return "This change conflicts with the current account state.";
      default: return "Please check the submitted information and try again.";
    }
  }
  if (error instanceof EmployeeDomainError && error.code === "EMPLOYEE_CODE_CAPACITY") return "The temporary four-digit employee-code range is full.";
  if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "AUTH_UNAVAILABLE") {
    return errors.authUnavailable().message;
  }
  return "The account change could not be saved. Please try again.";
}
