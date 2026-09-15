// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/scheduling/actions", () => { const action = async () => ({}); return { addScheduleAssignmentAction: action, createSchedulePeriodAction: action, createScheduleRevisionAction: action, proposeScheduleAction: action, publishScheduleAction: action, removeScheduleAssignmentAction: action, returnScheduleToDraftAction: action, updateScheduleAssignmentAction: action }; });
// Phase 6 imports the real capability panel into the scheduling forms. Its Server Action module
// reaches `@/db/client` -> environment validation, so the panel's actions are mocked here to keep
// this suite a pure component test. The real panel has its own coverage in phase6-capability-forms.test.tsx.
vi.mock("@/modules/capabilities/actions", () => { const action = async () => ({}); return { addAssignmentSkillRequirementAction: action, addEmployeeSkillAction: action, archiveAssignmentSkillRequirementAction: action, archiveEmployeeSkillAction: action, createSkillAction: action, renameSkillAction: action, setSkillActiveAction: action }; });
import { AssignmentForm, LifecyclePanel } from "@/modules/scheduling/forms";

const id = "10000000-0000-4000-8000-000000000001";
const period = { id, clientId: id, planningMonth: "2026-05-01", revisionNumber: 1, parentPeriodId: null, status: "DRAFT" as const, isCurrent: false, lastReturnReason: null, version: 1 };
const warnings = [{ assignmentId: id, employeeName: "Cora Bell", assignmentDate: "2026-05-06", missingSkills: [{ id, name: "Network Installation", sources: ["Client" as const] }] }];
describe("Phase 4 scheduling forms", () => {
  it("makes timezone, lifecycle, immutable published, and non-blocking warning boundaries visible", () => { render(<LifecyclePanel period={{ ...period, status: "PUBLISHED", isCurrent: true }} clientName="Alpha Facilities" canManage={false} canPropose={false} canPublish={true} warnings={warnings} />); expect(screen.getByText(/Asia\/Dubai/)).toBeInTheDocument(); expect(screen.getByText("PUBLISHED")).toBeInTheDocument(); expect(screen.getByText(/immutable/)).toBeInTheDocument(); expect(screen.getByText(/does not block publication or determine coverage/)).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Create Draft revision" })).toBeInTheDocument(); });
  it("requires the deliberate cascading Project and linked Location selection", () => { render(<AssignmentForm period={period} employees={[{ id: "employee", displayName: "Cora Bell" }]} projects={[{ project: { id, name: "Alpha Project" } }]} locationsByProject={[[id, [{ location: { id, name: "Alpha Site" } }]]]} />); expect(screen.getByLabelText("Project")).toBeInTheDocument(); fireEvent.change(screen.getByLabelText("Project"), { target: { value: id } }); expect(screen.getByLabelText("Linked Location")).toHaveTextContent("Alpha Site"); expect(screen.getByText(/same-day timed assignment only/i)).toBeInTheDocument(); });
});
