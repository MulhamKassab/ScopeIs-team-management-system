// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketWorkspaceView, filterCompanyTickets } from "@/modules/tickets/workspace";
import type { TicketSummary, TicketWorkspaceData } from "@/modules/tickets/types";

const employee = { id: "worker", displayName: "Worker", role: "EMPLOYEE" as const };
const manager = { id: "manager", displayName: "Manager", role: "SUPER_ADMIN" as const };
const permissions = { edit: true, managePeople: false, archive: true, restore: false, log: true, files: true };
function ticket(id: string, boardId: string, overrides: Partial<TicketSummary> = {}): TicketSummary {
  return { id, boardId, number: Number(id), subject: `Ticket ${id}`, status: "OPEN", priority: "MEDIUM", ticketDate: "2026-10-08", dueDate: null, creatorName: "Worker", assignees: [], version: 1, archivedAt: null, permissions, ...overrides };
}
function data(managed = false): TicketWorkspaceData {
  return {
    workspaces: [{ id: "workspace", name: "Support", description: null, clientId: null, projectId: null, version: 3, canManage: managed, members: managed ? [{ userId: "worker", displayName: "Worker", role: "EMPLOYEE" }] : [] }],
    boards: [{ id: "board", workspaceId: "workspace", name: "Service desk", status: "PUBLISHED", version: 2, canManage: managed }, { id: "old", workspaceId: "workspace", name: "Previous work", status: "ARCHIVED", version: 1, canManage: managed }],
    tickets: [ticket("1", "board", { subject: "Repair access reader", priority: "HIGH", assignees: [{ userId: "worker", displayName: "Worker" }] }), ticket("2", "board", { subject: "Check cable", status: "CLOSED" }), ticket("3", "board", { archivedAt: "2026-10-08T06:00:00Z" }), ticket("4", "old")],
    people: [], clients: [], projects: [],
  };
}
beforeEach(() => window.history.replaceState({}, "", "/tickets"));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Company ticket workspace", () => {
  it("keeps employee work primary and omits manager container tools", () => {
    render(<TicketWorkspaceView initialData={data()} actor={employee} />);
    expect(screen.getByRole("heading", { name: "My tickets" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tickets", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "New ticket" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Workspaces" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Workspaces" }));
    expect(screen.getByRole("heading", { name: "Service desk" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New workspace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit workspace Support" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit dashboard Service desk" })).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket 3")).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket 4")).not.toBeInTheDocument();
  });

  it("preserves all filters across overview, list and Kanban and records reloadable URL state", () => {
    render(<TicketWorkspaceView initialData={data()} actor={employee} />);
    fireEvent.change(screen.getByLabelText("Search tickets"), { target: { value: "reader" } });
    fireEvent.change(screen.getByLabelText("Workspace", { exact: true }), { target: { value: "workspace" } });
    fireEvent.change(screen.getByLabelText("Dashboard", { exact: true }), { target: { value: "board" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "HIGH" } });
    fireEvent.click(screen.getByRole("button", { name: "Kanban", exact: true }));
    expect(screen.getByRole("region", { name: "Ticket Kanban" })).toBeInTheDocument();
    expect(screen.getByText("Repair access reader")).toBeInTheDocument();
    expect(screen.queryByText("Check cable")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    expect(screen.getByLabelText("Search tickets")).toHaveValue("reader");
    fireEvent.click(screen.getByRole("button", { name: "Tickets", exact: true }));
    expect(screen.getByLabelText("Dashboard", { exact: true })).toHaveValue("board");
    expect(new URLSearchParams(window.location.search).get("priority")).toBe("HIGH");
    expect(new URLSearchParams(window.location.search).get("layout")).toBe("board");
  });

  it("drills into a specific manager dashboard without clearing its selection", () => {
    render(<TicketWorkspaceView initialData={data(true)} actor={manager} initialQuery={{ view: "workspaces" }} />);
    const boardCard = screen.getByRole("heading", { name: "Service desk" }).closest("article")!;
    fireEvent.click(within(boardCard).getByRole("button", { name: "Open tickets" }));
    expect(screen.getByLabelText("Workspace", { exact: true })).toHaveValue("workspace");
    expect(screen.getByLabelText("Dashboard", { exact: true })).toHaveValue("board");
    expect(new URLSearchParams(window.location.search).get("board")).toBe("board");
  });

  it("retains board archive history and filters it separately from operational tickets", () => {
    const filters = { view: "tickets" as const, workspace: "", board: "", search: "", status: "", priority: "" };
    expect(filterCompanyTickets(data(true), filters).map((ticket) => ticket.id)).toEqual(["1", "2"]);
    expect(filterCompanyTickets(data(true), { ...filters, view: "archive" }).map((ticket) => ticket.id)).toEqual(["3", "4"]);
    render(<TicketWorkspaceView initialData={data(true)} actor={manager} initialQuery={{ view: "archive", board: "old" }} />);
    expect(screen.getByText("Ticket 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Dashboard", { exact: true })).toHaveValue("old");
    expect(screen.queryByText("Repair access reader")).not.toBeInTheDocument();
  });

  it("does not create on draft boards for employees and labels observer cards read only", () => {
    const snapshot = data();
    snapshot.boards = [{ ...snapshot.boards[0], status: "DRAFT" }];
    snapshot.tickets = [ticket("1", "board", { permissions: { edit: false, managePeople: false, archive: false, restore: false, log: false, files: false } })];
    render(<TicketWorkspaceView initialData={snapshot} actor={employee} />);
    expect(screen.queryByRole("button", { name: "New ticket" })).not.toBeInTheDocument();
    expect(screen.getByText("Read only")).toBeInTheDocument();
  });

  it("keeps a successful creation saved when the following refresh fails", async () => {
    const fetch = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? { ok: true, status: 200, json: async () => ({ id: "created" }) } : { ok: false, status: 503, json: async () => ({ message: "Try later" }) });
    vi.stubGlobal("fetch", fetch);
    render(<TicketWorkspaceView initialData={data()} actor={employee} />);
    fireEvent.click(screen.getByRole("button", { name: "New ticket" }));
    const form = screen.getByRole("form", { name: "Create ticket" });
    fireEvent.change(within(form).getByLabelText("Subject"), { target: { value: "Inspect reader" } });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByText("Saved. Reload the page to see the latest record.")).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({ action: "createTicket", version: 2, assigneeIds: [], observerIds: [] });
  });

  it("lets an unenrolled employee assign several company people and mention another", async () => {
    const snapshot = data();
    snapshot.people = [
      { userId: employee.id, displayName: employee.displayName, role: employee.role },
      { userId: "outside-admin", displayName: "Outside Admin", role: "ADMIN" },
      { userId: "outside-worker", displayName: "Outside Worker", role: "EMPLOYEE" },
      { userId: "mentioned", displayName: "Company Director", role: "SUPER_ADMIN" },
    ];
    const fetch = vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, status: 200, json: async () => options?.method === "POST" ? { id: "created" } : snapshot }));
    vi.stubGlobal("fetch", fetch);
    render(<TicketWorkspaceView initialData={snapshot} actor={employee} />);
    fireEvent.click(screen.getByRole("button", { name: "New ticket" }));
    const form = screen.getByRole("form", { name: "Create ticket" });
    expect(within(form).getByLabelText("Workspace", { exact: true })).toHaveValue("workspace");
    expect(within(form).getByLabelText("Dashboard", { exact: true })).toHaveValue("board");
    fireEvent.change(within(form).getByLabelText("Subject"), { target: { value: "Shared company work" } });
    const assignees = within(form).getByRole("group", { name: "Assignees", exact: true });
    fireEvent.click(within(assignees).getByRole("checkbox", { name: "Outside Admin" }));
    fireEvent.click(within(assignees).getByRole("checkbox", { name: "Outside Worker" }));
    fireEvent.change(within(form).getByLabelText("Find people"), { target: { value: "Director" } });
    fireEvent.click(within(within(form).getByRole("group", { name: "Mentioned people · read only" })).getByRole("checkbox", { name: "Company Director" }));
    fireEvent.submit(form);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({ action: "createTicket", boardId: "board", assigneeIds: ["outside-admin", "outside-worker"], observerIds: ["mentioned"] });
  });

  it("opens dashboard children for employees and carries the selection into ticket creation", () => {
    const snapshot = data();
    snapshot.boards.push({ id: "second", workspaceId: "workspace", name: "Facilities", status: "PUBLISHED", version: 1, canManage: false });
    snapshot.tickets.push(ticket("5", "second"), ticket("6", "second"));
    snapshot.workspaces.push({ ...snapshot.workspaces[0], id: "other", name: "Other workspace" });
    snapshot.boards.push({ id: "other-board", workspaceId: "other", name: "Other dashboard", status: "PUBLISHED", version: 1, canManage: false });
    render(<TicketWorkspaceView initialData={snapshot} actor={employee} initialQuery={{ view: "overview" }} />);
    const workspaceCard = screen.getByRole("heading", { name: "Support" }).closest("article")!;
    fireEvent.click(within(workspaceCard).getByRole("button", { name: "Open dashboards" }));
    expect(screen.queryByRole("heading", { name: "Other workspace" })).not.toBeInTheDocument();
    const dashboardCard = screen.getByRole("heading", { name: "Facilities" }).closest("article")!;
    expect(within(dashboardCard).getByText("2 tickets you can view")).toBeInTheDocument();
    fireEvent.click(within(dashboardCard).getByRole("button", { name: "Open tickets" }));
    expect(screen.getByText("Ticket 5")).toBeInTheDocument();
    expect(screen.getByText("Ticket 6")).toBeInTheDocument();
    expect(screen.queryByText("Repair access reader")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New ticket" }));
    const form = screen.getByRole("form", { name: "Create ticket" });
    expect(within(form).getByLabelText("Dashboard", { exact: true })).toHaveValue("second");
    fireEvent.change(within(form).getByLabelText("Workspace", { exact: true }), { target: { value: "other" } });
    expect(within(form).getByLabelText("Dashboard", { exact: true })).toHaveValue("other-board");
    expect(within(form).queryByRole("option", { name: "Facilities" })).not.toBeInTheDocument();
  });

  it("lets management correct workspace text using the current container version", async () => {
    const snapshot = data(true);
    const updated = { ...snapshot, workspaces: [{ ...snapshot.workspaces[0], name: "Customer support", version: 4 }] };
    const fetch = vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, status: 200, json: async () => options?.method === "POST" ? { id: "workspace", version: 4 } : updated }));
    vi.stubGlobal("fetch", fetch);
    render(<TicketWorkspaceView initialData={snapshot} actor={manager} initialQuery={{ view: "workspaces" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit workspace Support" }));
    const form = screen.getByRole("form", { name: "Edit workspace Support" });
    fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "Customer support" } });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Customer support" })).toBeInTheDocument());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ action: "updateWorkspace", workspaceId: "workspace", version: 3, name: "Customer support", description: "" });
  });
});
