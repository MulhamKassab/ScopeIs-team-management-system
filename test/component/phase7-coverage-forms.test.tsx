// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/modules/coverage/actions", () => { const action = async () => ({}); return { createReplacementRequestAction: action, decideReplacementRequestAction: action, editReplacementRequestAction: action, cancelReplacementRequestAction: action }; });
import { ReplacementDecisionForm, ReplacementRequestForm } from "@/modules/coverage/forms";
const request = { id: "10000000-0000-4000-8000-000000000003", version: 1, nominatedEmployeeUserId: null, intent: "REPLACE_ASSIGNMENT" };
describe("Cover forms", () => {
  it("offers extra support only for a staffing gap and explains separate publication", () => {
    render(<ReplacementRequestForm gap={{ kind: "STAFFING", staffingRequirementId: "10000000-0000-4000-8000-000000000001", anchorAssignmentId: "10000000-0000-4000-8000-000000000002", skillName: "Network Installation", source: "Location", missingEmployeeCount: 1 }} candidates={[{ id: "employee", displayName: "Eli Alpha" }]} />);
    expect(screen.getByRole("option", { name: "Add another person alongside them" })).toBeInTheDocument();
    expect(screen.getByText(/publication is separate/)).toBeInTheDocument();
  });
  it("allows replacement without a detected gap", () => {
    render(<ReplacementRequestForm gap={{ kind: "MANUAL", anchorAssignmentId: request.id, skillName: "", source: "Assignment", missingEmployeeCount: 0 }} candidates={[]} />);
    expect(screen.getByText(/No staffing gap is required/)).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Add another/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send cover request" })).toBeEnabled();
  });
  it("allows direct rejection without a covering person and disables approval when none qualify", () => {
    render(<ReplacementDecisionForm request={request} candidates={[]} />);
    expect(screen.queryByLabelText("Decision")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Covering person")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject request" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reject request" })).toHaveAttribute("formnovalidate");
    expect(screen.getByRole("button", { name: "Approve cover" })).toBeDisabled();
  });
  it("keeps rejecting stale work available", () => {
    render(<ReplacementDecisionForm request={request} candidates={[]} reviewError="This work has changed." />);
    expect(screen.getByRole("status")).toHaveTextContent("You can reject this outdated request.");
    expect(screen.getByRole("button", { name: "Reject request" })).toBeEnabled();
  });
});
