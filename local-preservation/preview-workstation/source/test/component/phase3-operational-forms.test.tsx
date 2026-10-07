// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/operations/actions", () => {
  const action = async () => ({});
  return {
    addContactAction: action, addEmployeeRelationAction: action, addNoteAction: action, addRequirementAction: action,
    archiveNoteAction: action, archiveSupportingAction: action, createClientAction: action, createLocationAction: action,
    createProjectAction: action, grantOperationalScopeAction: action, linkProjectLocationAction: action,
    revokeOperationalScopeAction: action, setClientLifecycleAction: action, setLocationLifecycleAction: action,
    unlinkProjectLocationAction: action, updateClientAction: action, updateLocationAction: action,
    updateNoteAction: action, updateProjectAction: action,
  };
});

import { ProjectLocationPanel, ScopeManagementPanel, SupportingDetailsPanel } from "@/modules/operations/forms";

const id = "10000000-0000-4000-8000-000000000001";
const employees = [{ id: "mock-admin-ava", displayName: "Ava Mercer", role: "ADMIN" as const }, { id: "mock-employee-cora", displayName: "Cora Bell", role: "EMPLOYEE" as const }];
describe("Phase 3 operational forms", () => {
  it("labels deliberate same-client Location reuse without schedule semantics", () => {
    render(<ProjectLocationPanel projectId={id} candidates={[{ location: { id, name: "Shared Site", address: "1 Example Road" } }]} linked={[]} />);
    expect(screen.getByRole("heading", { name: "Project Locations" })).toBeInTheDocument(); expect(screen.getByLabelText("Location")).toHaveTextContent("Shared Site"); expect(screen.getByText(/not a schedule assignment/i)).toBeInTheDocument();
  });
  it("renders separate contact, requirement, employee-association, and shared-note boundaries", () => {
    render(<SupportingDetailsPanel target={{ type: "CLIENT", id }} details={{ contacts: [], requirements: [], employees: [], notes: [] }} employees={employees} skills={[{ id, name: "Industrial Controls" }]} actorId="mock-admin-ava" isSuperAdmin={false} />);
    expect(screen.getByRole("form", { name: "Add operational contact" })).toBeInTheDocument(); expect(screen.getByRole("form", { name: "Add basic staffing requirement" })).toHaveTextContent(/No dates, shifts/); expect(screen.getByRole("form", { name: "Add operational employee association" })).toHaveTextContent(/grants no access/); expect(screen.getByRole("form", { name: "Add shared operational note" })).toBeInTheDocument();
  });
  it("makes operational grants visibly explicit and Super-Admin controlled", () => {
    render(<ScopeManagementPanel target={{ type: "CLIENT", id }} employees={employees} grants={[]} />);
    expect(screen.getByRole("form", { name: "Grant CLIENT scope" })).toBeInTheDocument(); expect(screen.getByText(/Account Manager, Responsible Admin, Team/)).toBeInTheDocument(); expect(screen.getByLabelText("Active Admin")).not.toHaveTextContent("Cora Bell");
  });
});
