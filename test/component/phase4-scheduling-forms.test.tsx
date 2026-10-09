// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/scheduling/actions", () => { const action = async () => ({}); return { addScheduleAssignmentAction: action, createSchedulePeriodAction: action, createScheduleRevisionAction: action, proposeScheduleAction: action, publishScheduleAction: action, removeScheduleAssignmentAction: action, returnScheduleToDraftAction: action, updateScheduleAssignmentAction: action }; });
// Phase 6 imports the real capability panel into the scheduling forms. Its Server Action module
// reaches `@/db/client` -> environment validation, so the panel's actions are mocked here to keep
// this suite a pure component test. The real panel has its own coverage in phase6-capability-forms.test.tsx.
vi.mock("@/modules/capabilities/actions", () => { const action = async () => ({}); return { addAssignmentSkillRequirementAction: action, addEmployeeSkillAction: action, archiveAssignmentSkillRequirementAction: action, archiveEmployeeSkillAction: action, createSkillAction: action, renameSkillAction: action, setSkillActiveAction: action }; });
import { AssignmentForm, AssignmentList, LifecyclePanel } from "@/modules/scheduling/forms";

const id = "10000000-0000-4000-8000-000000000001";
const period = { id, clientId: id, planningMonth: "2026-05-01", revisionNumber: 1, parentPeriodId: null, status: "DRAFT" as const, isCurrent: false, lastReturnReason: null, version: 1 };
const warnings = [{ assignmentId: id, employeeName: "Cora Bell", assignmentDate: "2026-05-06", missingSkills: [{ id, name: "Network Installation", sources: ["Client" as const] }] }];
describe("Phase 4 scheduling forms", () => {
  it.each(["DRAFT", "PROPOSED", "PUBLISHED"] as const)("shows read-only lifecycle guidance for an Admin viewing %s", (status) => {
    render(<LifecyclePanel period={{ ...period, status, isCurrent: status === "PUBLISHED" }} clientName="Alpha Facilities" canManage={false} canPropose={false} canPublish={false} warnings={[]} />);
    expect(screen.getByText(status)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Propose|Publish|Return to Draft|Create Draft revision/ })).not.toBeInTheDocument();
    expect(screen.getByText(status === "DRAFT" ? /Super Admin is preparing/ : status === "PROPOSED" ? /Super Admin is reviewing/ : /current published schedule/)).toBeInTheDocument();
  });
  it("keeps scoped assignments and cover links readable without Draft mutation controls", () => {
    render(<AssignmentList period={period} assignments={[{ assignment: { id, employeeUserId: "employee", projectId: id, locationId: id, assignmentDate: "2026-05-06", startTime: "09:00:00", endTime: "10:00:00", sharedInstruction: "Check reception", version: 1 }, employeeName: "Cora Bell", projectName: "Alpha Project", locationName: "Alpha Site", requirements: [{ requirement: { id, version: 1 }, skillName: "Network Installation" }] }]} employees={[]} projects={[]} locationsByProject={[]} skills={[]} canManage={false} coverageAssignmentIds={[id]} />);
    expect(screen.getByText("Check reception")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review coverage" })).toHaveAttribute("href", `/coverage?assignment=${id}`);
    expect(screen.queryByRole("button", { name: /Add assignment|Edit assignment|Remove|Add requirement|Archive/ })).not.toBeInTheDocument();
    expect(screen.getByText("Network Installation")).toBeInTheDocument();
  });
  it("makes timezone, lifecycle, immutable published, and non-blocking warning boundaries visible", () => { render(<LifecyclePanel period={{ ...period, status: "PUBLISHED", isCurrent: true }} clientName="Alpha Facilities" canManage={false} canPropose={false} canPublish={true} warnings={warnings} />); expect(screen.getByText(/Asia\/Dubai/)).toBeInTheDocument(); expect(screen.getByText("PUBLISHED")).toBeInTheDocument(); expect(screen.getByText(/Published schedules are locked/)).toBeInTheDocument(); expect(screen.getByText(/does not block publication or determine coverage/)).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Create Draft revision" })).toBeInTheDocument(); });
  it("requires the deliberate cascading Project and linked Location selection", () => { render(<AssignmentForm period={period} employees={[{ id: "employee", displayName: "Cora Bell" }]} projects={[{ project: { id, name: "Alpha Project" } }]} locationsByProject={[[id, [{ location: { id, name: "Alpha Site" } }]]]} />); expect(screen.getByLabelText("Project")).toBeInTheDocument(); fireEvent.change(screen.getByLabelText("Project"), { target: { value: id } }); expect(screen.getByLabelText("Linked Location")).toHaveTextContent("Alpha Site"); expect(screen.getByText(/same-day timed assignment only/i)).toBeInTheDocument(); });
});

it("opens focused assignment forms only when requested and keeps coverage links scoped", () => {
  render(<AssignmentList period={period} assignments={[{ assignment: { id, employeeUserId: "employee", projectId: id, locationId: id, assignmentDate: "2026-05-06", startTime: "09:00:00", endTime: "10:00:00", sharedInstruction: null, version: 1 }, employeeName: "Cora Bell", projectName: "Alpha Project", locationName: "Alpha Site", requirements: [] }]} employees={[{ id: "employee", displayName: "Cora Bell" }]} projects={[{ project: { id, name: "Alpha Project" } }]} locationsByProject={[[id, [{ location: { id, name: "Alpha Site" } }]]]} skills={[]} canManage={true} coverageAssignmentIds={[]} />);
  expect(screen.queryByRole("form", { name: "Add schedule assignment" })).not.toBeInTheDocument();
  expect(screen.queryByRole("form", { name: "Edit schedule assignment" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Review coverage" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add assignment", exact: true }));
  expect(screen.getByRole("dialog", { name: "Add schedule assignment" })).toBeVisible();
  expect(screen.getByRole("form", { name: "Add schedule assignment" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
  expect(screen.queryByRole("form", { name: "Add schedule assignment" })).not.toBeInTheDocument();
});
