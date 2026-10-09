// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { modules, navigationFor } from "@/modules/navigation/navigation";
import { pageJourney } from "@/modules/navigation/page-journeys";
import { PageJourneyHelp } from "@/shared/components/page-journey";
import { CoverageWorkPicker } from "@/modules/coverage/work-picker";
import type { TimetableEntry } from "@/modules/scheduling/timetable-service";
import type { AuthenticatedActor } from "@/shared/types/foundation";

vi.mock("next/navigation", () => ({ usePathname: () => "/schedule" }));

describe("task guidance", () => {
  it("describes Admin schedule reads and approved team leave without promising self-service or draft writes", () => {
    for (const key of ["schedule", "clients", "projects", "locations", "skills"] as const) {
      const guide = pageJourney(key, "ADMIN");
      expect(JSON.stringify(guide)).not.toMatch(/Propose the Draft|Choose Plan work|to assign people|to plan who/);
    }
    expect(pageJourney("leave", "ADMIN").goal).toContain("approved leave");
    expect(JSON.stringify(pageJourney("leave", "ADMIN"))).not.toMatch(/submit a leave request|Check your balance/);
    for (const role of ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] as const) expect(JSON.stringify(pageJourney("tickets", role))).not.toMatch(/\bboard\b/);
  });
  it.each(["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] as const)("covers every authorized tab for %s with actionable, bounded steps", (role) => {
    const actor: AuthenticatedActor = { id: role, displayName: role, role, scopes: [], sessionId: "s", sessionVersion: 1, authenticationMode: "mock" };
    for (const item of navigationFor(actor)) {
      const guide = pageJourney(item.key, role);
      expect(guide.goal.length).toBeGreaterThan(10);
      expect(guide.steps.length).toBeGreaterThanOrEqual(2);
      expect(guide.steps.length).toBeLessThanOrEqual(3);
    }
    if (role === "ADMIN") expect(pageJourney("schedule", role).steps[1].detail).toContain("Super Admin prepares and publishes");
    if (role === "EMPLOYEE") expect(pageJourney("schedule", role).steps[2].detail).toContain("Only published work");
  });

  it("keeps guidance optional and links only to server-authorized tools", () => {
    render(<PageJourneyHelp navigation={[modules.schedule, modules.leave]} role="EMPLOYEE" />);
    const summary = screen.getByText("How to use Timetable");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "Leave" })).toHaveAttribute("href", "/leave");
    expect(screen.queryByRole("link", { name: "Find cover" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My requests" })).not.toBeInTheDocument();
  });
});

const base: TimetableEntry = { id: "work-a", periodId: "period", employeeId: "mulham", employeeName: "Mulham", projectId: "project", clientId: "client", clientName: "Alpha", projectName: "Installation", locationName: "Dubai site", date: "2027-09-14", start: "08:00", end: "12:00", instruction: null, status: "PUBLISHED" };
describe("finding work to cover", () => {
  it("narrows authorized work by person and site, preserves the planning destination, and recovers from no results", () => {
    render(<CoverageWorkPicker entries={[base, { ...base, id: "work-b", employeeId: "omar", employeeName: "Omar", date: "2027-09-15", locationName: "Abu Dhabi", status: "DRAFT" }]} month="2027-09" planning />);
    fireEvent.change(screen.getByLabelText("Person"), { target: { value: "omar" } });
    expect(screen.getByRole("status")).toHaveTextContent("1 assignment across 1 day");
    expect(screen.getByRole("link", { name: "Check cover for Omar" })).toHaveAttribute("href", "/coverage?month=2027-09&assignment=work-b&mode=planning");
    expect(screen.queryByRole("link", { name: "Check cover for Mulham" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search work"), { target: { value: "Dubai" } });
    expect(screen.getByRole("heading", { name: "No work matches your search" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("status")).toHaveTextContent("2 assignments across 2 days");
    expect(screen.getByLabelText("Person")).toHaveValue("");
  });
});
