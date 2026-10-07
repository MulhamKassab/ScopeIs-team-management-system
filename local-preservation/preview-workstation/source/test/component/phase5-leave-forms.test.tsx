// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/modules/leave/actions", () => { const action = async () => ({}); return { submitLeaveAction: action, cancelLeaveAction: action, decideLeaveAction: action, updateLeaveAllowanceAction: action }; });
import { AllowanceForm, LeaveDecisionForm, LeaveRequestForm } from "@/modules/leave/forms";
describe("Phase 5 leave forms", () => { it("renders labelled leave, decision, and allowance controls", () => { render(<><LeaveRequestForm /><LeaveDecisionForm id="10000000-0000-4000-8000-000000000001" version={1} /><AllowanceForm allowance={22} version={1} /></>); expect(screen.getByLabelText("Start date")).toBeInTheDocument(); expect(screen.getByLabelText(/Private reason/)).toBeInTheDocument(); expect(screen.getByText(/Rejection requires a response/)).toBeInTheDocument(); expect(screen.getByDisplayValue("22")).toBeInTheDocument(); }); });
