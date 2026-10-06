// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Timetable } from "@/modules/scheduling/timetable";
import { ReplacementRequestForm } from "@/modules/coverage/forms";
vi.mock("@/modules/coverage/actions", () => ({ createReplacementRequestAction: vi.fn(), decideReplacementRequestAction: vi.fn() }));
afterEach(cleanup);
const entries = [
 { id: "a", periodId: "p", employeeId: "mulham", employeeName: "Mulham", projectId: "portal", clientId: "north", clientName: "Northstar", projectName: "Patient portal", locationName: "Business Bay", date: "2026-10-06", start: "09:00", end: "11:00", instruction: "Review deployment", status: "PUBLISHED" as const },
 { id: "b", periodId: "q", employeeId: "omar", employeeName: "Omar", projectId: "network", clientId: "south", clientName: "Horizon", projectName: "Network", locationName: "DIP", date: "2026-10-06", start: "11:00", end: "13:00", instruction: null, status: "PUBLISHED" as const },
];
describe("monthly timetable", () => {
 it("opens Month by default and shows the filtered details in Agenda and People", () => {
  render(<Timetable entries={entries} month="2026-10" manager planning={false} today="2026-10-06" />);
  expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: /Open Tuesday,? 6 October/ })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Person"), { target: { value: "mulham" } });
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  expect(screen.getByText("Review deployment")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Network" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "People" }));
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "Mulham" })).toBeInTheDocument();
 });
 it("keeps personal view free of management actions and labels unpublished planning", () => {
  render(<Timetable entries={entries.slice(0, 1)} month="2026-10" manager={false} planning={false} today="2026-10-06" />);
  fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
  expect(screen.queryByRole("link", { name: "Review coverage" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Person")).not.toBeInTheDocument();
  cleanup();
  render(<Timetable entries={[]} month="2026-11" manager planning today="2026-10-06" />);
  expect(screen.getByText("No planned assignments this month")).toBeInTheDocument();
 });
 it("addresses the Super Admin as the person who can choose", () => {
  render(<ReplacementRequestForm isSuperAdmin candidates={[{ id: "omar", displayName: "Omar" }]} gap={{ kind: "STAFFING", anchorAssignmentId: "a", skillName: "Network", source: "Project", missingEmployeeCount: 1 }} />);
  expect(screen.getByRole("option", { name: "Choose during review" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create coverage request" })).toBeInTheDocument();
  expect(screen.queryByText("Let Super Admin choose")).not.toBeInTheDocument();
 });
});
