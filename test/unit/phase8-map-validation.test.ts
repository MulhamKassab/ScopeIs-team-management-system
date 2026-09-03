import { describe, expect, it } from "vitest";
import { coarseCoordinate, dubaiToday, parseMapQuery } from "@/modules/maps/validation";
describe("Phase 8 static map contracts", () => {
  it("uses strict selected-date filter input and no route/GPS fields", () => { expect(parseMapQuery({ date: "2026-09-02", coverageGap: "true" })?.coverageGap).toBe(true); expect(parseMapQuery({ date: "2026-09-02", route: "x" })).toBeNull(); });
  it("returns a deterministic coarse grid centre", () => { expect(coarseCoordinate(25.2048, 55.2708)).toEqual({ latitude: 25.2125, longitude: 55.2625 }); });
  it("defaults with an Asia/Dubai calendar date", () => { expect(dubaiToday(new Date("2026-09-01T22:00:00Z"))).toBe("2026-09-02"); });
});
