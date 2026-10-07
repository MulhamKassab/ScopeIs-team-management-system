import { describe, expect, it } from "vitest";
import { workingDays, workingDaysByYear } from "@/modules/leave/date-rules";
import { leaveDecisionSchema, leaveSubmitSchema } from "@/modules/leave/validation";
describe("Phase 5 leave rules", () => { it("counts Monday through Friday only across weekends", () => { expect(workingDays("2026-05-01", "2026-05-03")).toBe(1); expect(workingDays("2026-05-04", "2026-05-10")).toBe(5); }); it("requires an inclusive valid range and a rejection response", () => { expect(leaveSubmitSchema.safeParse({ startDate: "2026-05-10", endDate: "2026-05-09" }).success).toBe(false); expect(leaveDecisionSchema.safeParse({ leaveRequestId: "10000000-0000-4000-8000-000000000001", expectedVersion: 1, decision: "REJECTED", response: "" }).success).toBe(false); }); });

it("allocates weekdays to each calendar year without carry-over", () => {
  expect(workingDaysByYear("2040-12-31", "2041-01-25")).toEqual([{ year: 2040, workingDays: 1 }, { year: 2041, workingDays: 19 }]);
  expect(workingDaysByYear("2027-12-31", "2028-01-02")).toEqual([{ year: 2027, workingDays: 1 }, { year: 2028, workingDays: 0 }]);
});
