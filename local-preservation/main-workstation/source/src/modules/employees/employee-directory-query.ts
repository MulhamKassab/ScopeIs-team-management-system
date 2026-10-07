import type { EmployeeDirectoryQuery, EmployeeDirectorySearchFilters } from "@/modules/employees/contracts";
import { employeeDirectorySearchParamsSchema } from "@/modules/employees/employee-validation";

export type DirectorySearchParams = Record<string, string | string[] | undefined>;
export type ParsedEmployeeDirectorySearch =
  | { valid: true; filters: EmployeeDirectorySearchFilters; query: EmployeeDirectoryQuery }
  | { valid: false; filters: {}; query: null };

export function parseEmployeeDirectorySearchParams(searchParams: DirectorySearchParams): ParsedEmployeeDirectorySearch {
  const singleValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) return { valid: false, filters: {}, query: null };
    singleValues[key] = value;
  }
  const parsed = employeeDirectorySearchParamsSchema.safeParse(singleValues);
  if (!parsed.success) return { valid: false, filters: {}, query: null };
  const { designation, status, ...filters } = parsed.data;
  return {
    valid: true,
    filters: { ...filters, ...(designation ? { designationId: designation } : {}), ...(status ? { status } : {}) },
    query: { ...filters, ...(designation ? { designationId: designation } : {}), ...(status ? { active: status === "active" } : {}) },
  };
}

export function hasActiveEmployeeDirectoryFilters(filters: EmployeeDirectorySearchFilters) {
  return Object.values(filters).some((value) => value !== undefined);
}
