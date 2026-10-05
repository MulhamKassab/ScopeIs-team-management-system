// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/modules/coverage/actions", () => { const action = async () => ({}); return { createReplacementRequestAction: action, decideReplacementRequestAction: action }; });
import { ReplacementDecisionForm, ReplacementRequestForm } from "@/modules/coverage/forms";
describe("Phase 7 coverage forms", () => { it("renders both replacement intents and the non-publication explanation", () => { render(<><ReplacementRequestForm gap={{ kind: "STAFFING", staffingRequirementId: "10000000-0000-4000-8000-000000000001", anchorAssignmentId: "10000000-0000-4000-8000-000000000002", skillName: "Network Installation", source: "Location", missingEmployeeCount: 1 }} candidates={[{ id: "employee", displayName: "Eli Alpha" }]} /><ReplacementDecisionForm request={{ id: "10000000-0000-4000-8000-000000000003", version: 1, nominatedEmployeeUserId: "employee", intent: "REPLACE_ASSIGNMENT" }} candidates={[{ id: "employee", displayName: "Eli Alpha" }]} /></>); expect(screen.getByRole("option", { name: "Add coverage assignment" })).toBeInTheDocument(); expect(screen.getAllByText(/does not publish|nothing is auto-published/i).length).toBeGreaterThan(0); expect(screen.getAllByText("Eli Alpha").length).toBeGreaterThan(0); }); });

it("allows rejection without an employee when no candidate passes the checks", () => {
  render(<ReplacementDecisionForm request={{ id: "10000000-0000-4000-8000-000000000003", version: 1, nominatedEmployeeUserId: null, intent: "REPLACE_ASSIGNMENT" }} candidates={[]} />);
  expect(screen.getByLabelText("Decision")).toHaveValue("REJECTED");
  expect(screen.queryByLabelText("Selected eligible Employee")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save Super Admin decision" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Decision"), { target: { value: "APPROVED" } });
  expect(screen.getByRole("button", { name: "Save Super Admin decision" })).toBeDisabled();
});
