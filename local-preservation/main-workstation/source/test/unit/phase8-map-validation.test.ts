import { describe, expect, it } from "vitest";
import { coarseCoordinate, dubaiToday, parseMapQuery } from "@/modules/maps/validation";
describe("Phase 8 static map contracts", () => {
  it("uses strict selected-date filter input and no route/GPS fields", () => { expect(parseMapQuery({ date: "2026-09-02", coverageGap: "true" })?.coverageGap).toBe(true); expect(parseMapQuery({ date: "2026-09-02", route: "x" })).toBeNull(); });
  it("accepts employee identifiers and empty All authorized options submitted by the form", () => {
    const filters = { date: "2026-09-02", employeeId: "employee-ae6d836e-c935-4b13-9a46-761303d37df8", skillId: "", clientId: "", projectId: "", locationId: "" };
    expect(parseMapQuery(filters)).toMatchObject({ employeeId: filters.employeeId, skillId: undefined, clientId: undefined, projectId: undefined, locationId: undefined });
    expect(parseMapQuery({ ...filters, employeeId: "mock-employee-cora" })?.employeeId).toBe("mock-employee-cora");
    expect(parseMapQuery({ ...filters, employeeId: "" })?.employeeId).toBeUndefined();
    expect(parseMapQuery({ ...filters, clientId: "invalid-client" })).toBeNull();
    expect(parseMapQuery({ ...filters, employeeId: "x".repeat(161) })).toBeNull();
  });
  it("returns a deterministic coarse grid centre", () => { expect(coarseCoordinate(25.2048, 55.2708)).toEqual({ latitude: 25.2125, longitude: 55.2625 }); });
  it("defaults with an Asia/Dubai calendar date", () => { expect(dubaiToday(new Date("2026-09-01T22:00:00Z"))).toBe("2026-09-02"); });
});
