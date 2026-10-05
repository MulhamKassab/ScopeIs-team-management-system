// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthNavigation } from "@/modules/scheduling/month-navigation";

describe("Schedule month navigation", () => {
  it("changes month without carrying a stale selected period", () => {
    render(<MonthNavigation month="2026-12" />);
    expect(screen.getByRole("link", { name: "Previous month" })).toHaveAttribute("href", "/schedule?month=2026-11");
    expect(screen.getByRole("link", { name: "Next month" })).toHaveAttribute("href", "/schedule?month=2027-01");
    const picker = screen.getByLabelText("Planning month") as HTMLInputElement;
    expect(picker.type).toBe("month");
    expect([...new FormData(picker.form!).entries()]).toEqual([["month", "2026-12"]]);
  });
});
