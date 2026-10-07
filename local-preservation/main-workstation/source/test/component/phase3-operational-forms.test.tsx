// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
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

import { CreateProjectForClient, ProjectLocationPanel, ScopeManagementPanel, SupportingDetailsPanel } from "@/modules/operations/forms";

const id = "10000000-0000-4000-8000-000000000001";
const employees = [{ id: "mock-admin-ava", displayName: "Ava Mercer", role: "ADMIN" as const }, { id: "mock-employee-cora", displayName: "Cora Bell", role: "EMPLOYEE" as const }];
describe("Operational records workspace", () => {
  it("opens a deliberate same-client Location linking task without schedule semantics", () => {
    render(<ProjectLocationPanel projectId={id} candidates={[{ location: { id, name: "Shared Site", address: "1 Example Road" } }]} linked={[]} />);
    expect(screen.getByRole("heading", { name: /Project locations/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Location")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Link location" }));
    expect(within(screen.getByRole("dialog")).getByLabelText("Location")).toHaveTextContent("Shared Site");
    expect(screen.getByText(/not a schedule assignment/i)).toBeInTheDocument();
  });
  it("keeps the linking task open when the last location becomes linked", () => {
    const location = { id, name: "Shared Site", address: "1 Example Road" };
    const { rerender } = render(<ProjectLocationPanel projectId={id} candidates={[{ location }]} linked={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Link location", exact: true }));
    rerender(<ProjectLocationPanel projectId={id} candidates={[{ location }]} linked={[{ location, relation: { version: 1 } }]} />);
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "Link location", exact: true })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("All locations available to you are already linked.")).toBeVisible();
  });
  it("keeps reference records first and opens separate contact, skill, association and note tasks", () => {
    render(<SupportingDetailsPanel target={{ type: "CLIENT", id }} details={{ contacts: [], requirements: [], employees: [], notes: [] }} employees={employees} skills={[{ id, name: "Industrial Controls" }]} actorId="mock-admin-ava" isSuperAdmin={false} />);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    const tasks = [
      ["Add contact", "Add operational contact"],
      ["Add required skill", "Add operational required skill"],
      ["Add association", "Add operational employee association"],
      ["Add note", "Add shared operational note"],
    ];
    for (const [trigger, form] of tasks) {
      fireEvent.click(screen.getByRole("button", { name: trigger, exact: true }));
      expect(screen.getByRole("form", { name: form })).toBeVisible();
      if (trigger === "Add required skill") {
        expect(screen.getByRole("form", { name: form })).toHaveTextContent(/Each Client, Project, or Location rule is independent/);
        expect(screen.getByRole("form", { name: form })).toHaveTextContent(/never sums rules or publishes a change/);
      }
      if (trigger === "Add association") expect(screen.getByRole("form", { name: form })).toHaveTextContent(/grants no access/);
      fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    }
  });
  it("asks for the owning client before creating a project", () => {
    render(<CreateProjectForClient clients={[{ id, companyName: "Alpha" }, { id: "second", companyName: "Bravo" }]} employees={employees} />);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Client"), { target: { value: id } });
    expect(screen.getByRole("form", { name: "Create Project under this Client" })).toBeVisible();
    expect(screen.getByRole("form").querySelector('input[name="clientId"]')).toHaveValue(id);
  });
  it("keeps administrative access secondary and restricted to Admin accounts", () => {
    render(<ScopeManagementPanel target={{ type: "CLIENT", id }} employees={employees} grants={[]} />);
    const summary = screen.getByText("Admin access");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(screen.getByText(/Account Manager, Responsible Admin, Team/)).toBeInTheDocument();
    expect(screen.getByLabelText("Active Admin")).not.toHaveTextContent("Cora Bell");
  });
});
