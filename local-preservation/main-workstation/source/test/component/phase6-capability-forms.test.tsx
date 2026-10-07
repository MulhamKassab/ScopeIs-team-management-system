// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/capabilities/actions", () => {
  const action = async () => ({});
  return { addAssignmentSkillRequirementAction: action, addEmployeeSkillAction: action, archiveAssignmentSkillRequirementAction: action, archiveEmployeeSkillAction: action, createSkillAction: action, renameSkillAction: action, setSkillActiveAction: action };
});

import { AssignmentSkillRequirementPanel, EmployeeSkillManager, SkillCatalogue } from "@/modules/capabilities/forms";

describe("Phase 6 capability forms", () => {
  it("renders controlled catalogue, recorded-skill, and assignment-requirement controls", () => {
    render(<><SkillCatalogue skills={[{ id: "10000000-0000-4000-8000-000000000001", name: "Network Installation", active: true, version: 1 }]} /><EmployeeSkillManager employees={[{ id: "cora", displayName: "Cora" }]} skills={[{ id: "10000000-0000-4000-8000-000000000001", name: "Network Installation" }]} selectedEmployeeId="cora" records={[]} /><AssignmentSkillRequirementPanel assignmentId="10000000-0000-4000-8000-000000000002" canManage skills={[{ id: "10000000-0000-4000-8000-000000000001", name: "Network Installation" }]} requirements={[]} /></>);
    expect(screen.getByRole("heading", { name: "Skill list" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("heading", { name: "Skill list" }).closest("section")!).getByRole("button", { name: "Add skill" }));
    expect(screen.getByLabelText("Skill name")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(screen.getByRole("heading", { name: "Cora’s recorded skills" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Record a skill for Cora" }));
    expect(screen.getByRole("form", { name: "Record employee skill" }).querySelector('input[name="employeeUserId"]')).toHaveValue("cora");
    expect(screen.queryByRole("combobox", { name: "Employee" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(screen.getByRole("heading", { name: "Assignment-specific skills" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Required skill")).toHaveLength(1);
  });
});
