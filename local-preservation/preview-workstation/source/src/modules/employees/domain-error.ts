export const employeeDomainErrorCodes = [
  "NOT_FOUND", "FORBIDDEN", "OUT_OF_SCOPE", "VALIDATION_ERROR", "CONFLICT", "STALE_VERSION",
  "DUPLICATE_NAME", "REFERENCED_RECORD", "INACTIVE_REFERENCE", "INVALID_MANAGER", "INVALID_EMPLOYEE",
  "INVALID_SKILL_ASSOCIATION", "EMPLOYEE_CODE_CAPACITY",
] as const;

export type EmployeeDomainErrorCode = (typeof employeeDomainErrorCodes)[number];

const statusByCode: Record<EmployeeDomainErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  // Deliberately not distinguishable at the transport boundary from a missing record.
  OUT_OF_SCOPE: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  STALE_VERSION: 409,
  DUPLICATE_NAME: 409,
  REFERENCED_RECORD: 409,
  INACTIVE_REFERENCE: 409,
  EMPLOYEE_CODE_CAPACITY: 409,
  INVALID_MANAGER: 400,
  INVALID_EMPLOYEE: 400,
  INVALID_SKILL_ASSOCIATION: 400,
};

const messageByCode: Record<EmployeeDomainErrorCode, string> = {
  NOT_FOUND: "The requested record was not found.",
  FORBIDDEN: "You do not have access to this operation.",
  OUT_OF_SCOPE: "The requested record was not found.",
  VALIDATION_ERROR: "Please check the submitted information.",
  CONFLICT: "The requested operation conflicts with current data.",
  STALE_VERSION: "This record changed. Reload and try again.",
  DUPLICATE_NAME: "A record with that name already exists.",
  REFERENCED_RECORD: "This record is retained because it is referenced by history.",
  INACTIVE_REFERENCE: "An inactive catalogue record cannot be assigned.",
  EMPLOYEE_CODE_CAPACITY: "The temporary four-digit employee-code range is full.",
  INVALID_MANAGER: "The selected manager is not valid.",
  INVALID_EMPLOYEE: "The selected employee is not valid.",
  INVALID_SKILL_ASSOCIATION: "The employee-skill association is not valid.",
};

export class EmployeeDomainError extends Error {
  readonly status: number;

  constructor(public readonly code: EmployeeDomainErrorCode, message = messageByCode[code]) {
    super(message);
    this.name = "EmployeeDomainError";
    this.status = statusByCode[code];
  }
}

export const employeeErrors = Object.fromEntries(
  employeeDomainErrorCodes.map((code) => [code, () => new EmployeeDomainError(code)]),
) as { [Code in EmployeeDomainErrorCode]: () => EmployeeDomainError };
