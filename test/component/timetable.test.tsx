// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  const views = within(screen.getByRole("group", { name: "Timetable view", exact: true }));
  expect(views.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: /Open Tuesday,? 6 October/ })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Person"), { target: { value: "mulham" } });
  fireEvent.click(views.getByRole("button", { name: "Agenda" }));
  expect(screen.getByText("Review deployment")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Network" })).not.toBeInTheDocument();
  fireEvent.click(views.getByRole("button", { name: "People" }));
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "Mulham" })).toBeInTheDocument();
 }, 15_000);
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
  expect(screen.getByRole("button", { name: "Create cover request" })).toBeInTheDocument();
  expect(screen.queryByText("Let Super Admin choose")).not.toBeInTheDocument();
 });
});

it("keeps cover markers and their text in Month, People and Agenda", () => {
  render(<Timetable entries={entries} month="2026-10" manager cover planning={false} today="2026-10-06" coverMarkers={{ a: "pending", b: "approved" }} />);
  expect(document.querySelector(".timetable-day.cover-pending")).toBeInTheDocument();
  expect(screen.getByText("Cover requested")).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("group", { name: "Timetable view", exact: true })).getByRole("button", { name: "People" }));
  expect(screen.getByRole("table").querySelector("td.cover-pending")).toBeInTheDocument();
  expect(screen.getByRole("table").querySelector("td.cover-approved")).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("group", { name: "Timetable view", exact: true })).getByRole("button", { name: "Agenda" }));
  expect(screen.getByText("Cover approved · Draft prepared")).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Request cover", exact: true })[0]).toHaveAttribute("href", "/coverage?assignment=a&month=2026-10#selected-work");
});
