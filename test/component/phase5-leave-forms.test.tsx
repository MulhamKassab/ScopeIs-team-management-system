// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/modules/leave/actions", () => { const action = async () => ({}); return { submitLeaveAction: action, cancelLeaveAction: action, decideLeaveAction: action, updateLeaveAllowanceAction: action }; });
import { AllowanceForm, LeaveDecisionForm, LeaveRequestForm } from "@/modules/leave/forms";
describe("Phase 5 leave forms", () => { it("renders labelled leave, decision, and allowance controls", () => { render(<><LeaveRequestForm allowance={22} /><LeaveDecisionForm id="10000000-0000-4000-8000-000000000001" version={1} /><AllowanceForm allowance={22} version={1} /></>); expect(screen.getByLabelText("Start date")).toBeInTheDocument(); expect(screen.getByLabelText(/Private reason/)).toBeInTheDocument(); expect(screen.getByText(/Rejection requires a response/)).toBeInTheDocument(); expect(screen.getByDisplayValue("22")).toBeInTheDocument(); }); });

it("previews each calendar year's working days and approved balance without blocking an advisory deficit", () => {
  render(<LeaveRequestForm allowance={22} approvedVacations={[{ startDate: "2026-01-05", endDate: "2026-02-03" }]} />);
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-12-31" } });
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2027-01-04" } });
  expect(screen.getByRole("region", { name: "Vacation balance preview" })).toHaveTextContent("3 working days in your request");
  expect(screen.getByText("1 working days requested · 0 available · -1 remaining if approved")).toBeInTheDocument();
  expect(screen.getByText("2 working days requested · 22 available · 20 remaining if approved")).toBeInTheDocument();
  expect(screen.getByText(/server checks the latest balance on approval/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Submit vacation request" })).toBeEnabled();
});

it("explains reversed dates before submission", () => {
  render(<LeaveRequestForm allowance={22} />);
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-10-16" } });
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-10-12" } });
  expect(screen.getByText("Choose an end date on or after the start date.")).toBeInTheDocument();
});

it("allows rejection during a schedule conflict and requires an employee-visible response", () => {
  render(<LeaveDecisionForm id="10000000-0000-4000-8000-000000000001" version={1} approvalBlocked />);
  expect(screen.getByRole("button", { name: "Save decision" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Decision"), { target: { value: "REJECTED" } });
  expect(screen.getByRole("button", { name: "Save decision" })).toBeEnabled();
  expect(screen.getByLabelText(/Employee-visible response/)).toBeRequired();
});
