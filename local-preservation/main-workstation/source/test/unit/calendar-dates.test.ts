import { describe, expect, it } from "vitest";
import { displayDate, monthDays, monthOffset } from "@/modules/scheduling/calendar-dates";
describe("monthly calendar dates", () => {
  it("handles leap years, short months and Monday alignment", () => {
    expect(monthDays("2028-02")).toHaveLength(29);
    expect(monthDays("2027-02")).toHaveLength(28);
    expect(monthDays("2026-10").at(-1)).toBe("2026-10-31");
    expect(monthOffset("2026-10")).toBe(3);
    expect(monthOffset("2026-06")).toBe(0);
    expect(monthOffset("2026-11")).toBe(6);
  });
  it("formats dates without crossing a browser timezone boundary", () => {
    expect(displayDate("2026-10-06")).toMatch(/Tuesday,? 6 October/);
  });
});
