import { describe, expect, it } from "vitest";
import { hasActiveEmployeeDirectoryFilters, parseEmployeeDirectorySearchParams } from "@/modules/employees/employee-directory-query";

const designationId = "844f52b6-2baf-4d9f-a8cf-3fbbd4f3e1ef";

describe("employee directory search-parameter contract", () => {
  it("allows bounded, shareable approved query parameters", () => {
    const parsed = parseEmployeeDirectorySearchParams({ query: "  Avery  ", designation: designationId, team: "team:alpha", status: "active" });
    expect(parsed).toEqual({ valid: true, filters: { query: "Avery", designationId, team: "team:alpha", status: "active" }, query: { query: "Avery", designationId, team: "team:alpha", active: true } });
    if (parsed.valid) expect(hasActiveEmployeeDirectoryFilters(parsed.filters)).toBe(true);
  });

  it("fails repeated, unknown, malformed, and oversized parameters closed", () => {
    expect(parseEmployeeDirectorySearchParams({ query: ["Avery", "Morgan"] }).valid).toBe(false);
    expect(parseEmployeeDirectorySearchParams({ privateLocation: "x" }).valid).toBe(false);
    expect(parseEmployeeDirectorySearchParams({ designation: "not-a-uuid" }).valid).toBe(false);
    expect(parseEmployeeDirectorySearchParams({ query: "x".repeat(81) }).valid).toBe(false);
  });
});
