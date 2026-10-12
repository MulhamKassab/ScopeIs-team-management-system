import { describe, expect, it } from "vitest";
import { vacationPreview } from "@/modules/leave/vacation-preview";

describe("advisory vacation preview", () => {
  it("uses inclusive Monday–Friday counting, excluding a weekend", () => {
    expect(vacationPreview("2026-10-16", "2026-10-19", 22, [])).toEqual([{ year: 2026, requested: 2, remaining: 22, projectedRemaining: 20 }]);
  });

  it("splits cross-year requests and approved usage into separate Dubai calendar years", () => {
    expect(vacationPreview("2026-12-31", "2027-01-04", 22, [{ startDate: "2025-12-31", endDate: "2026-01-02" }, { startDate: "2027-01-05", endDate: "2027-01-05" }])).toEqual([
      { year: 2026, requested: 1, remaining: 20, projectedRemaining: 19 },
      { year: 2027, requested: 2, remaining: 21, projectedRemaining: 19 },
    ]);
  });

  it.each([["", ""], ["2026-02-30", "2026-03-02"], ["2026-10-19", "2026-10-16"]])("does not invent a balance for incomplete, invalid or reversed dates %s/%s", (startDate, endDate) => {
    expect(vacationPreview(startDate, endDate, 22, [])).toBeNull();
  });
});
