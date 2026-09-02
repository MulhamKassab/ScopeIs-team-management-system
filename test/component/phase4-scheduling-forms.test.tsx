// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/scheduling/actions", () => { const action = async () => ({}); return { addScheduleAssignmentAction: action, createSchedulePeriodAction: action, createScheduleRevisionAction: action, proposeScheduleAction: action, publishScheduleAction: action, removeScheduleAssignmentAction: action, returnScheduleToDraftAction: action, updateScheduleAssignmentAction: action }; });
import { AssignmentForm, LifecyclePanel } from "@/modules/scheduling/forms";

const id = "10000000-0000-4000-8000-000000000001";
const period = { id, clientId: id, planningMonth: "2026-05-01", revisionNumber: 1, parentPeriodId: null, status: "DRAFT" as const, isCurrent: false, lastReturnReason: null, version: 1 };
describe("Phase 4 scheduling forms", () => {
  it("makes timezone, lifecycle, and immutable published boundaries visible", () => { render(<LifecyclePanel period={{ ...period, status: "PUBLISHED", isCurrent: true }} clientName="Alpha Facilities" canManage={false} canPropose={false} canPublish={true} />); expect(screen.getByText(/Asia\/Dubai/)).toBeInTheDocument(); expect(screen.getByText("PUBLISHED")).toBeInTheDocument(); expect(screen.getByText(/immutable/)).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Create Draft revision" })).toBeInTheDocument(); });
  it("requires the deliberate cascading Project and linked Location selection", () => { render(<AssignmentForm period={period} employees={[{ id: "employee", displayName: "Cora Bell" }]} projects={[{ project: { id, name: "Alpha Project" } }]} locationsByProject={[[id, [{ location: { id, name: "Alpha Site" } }]]]} />); expect(screen.getByLabelText("Project")).toBeInTheDocument(); fireEvent.change(screen.getByLabelText("Project"), { target: { value: id } }); expect(screen.getByLabelText("Linked Location")).toHaveTextContent("Alpha Site"); expect(screen.getByText(/same-day timed assignment only/i)).toBeInTheDocument(); });
});
