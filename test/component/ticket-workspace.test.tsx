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
    expect(screen.queryByRole("button", { name: "Workspaces" })).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket 3")).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket 4")).not.toBeInTheDocument();
  });

  it("preserves all filters across overview, list and board and records reloadable URL state", () => {
    render(<TicketWorkspaceView initialData={data()} actor={employee} />);
    fireEvent.change(screen.getByLabelText("Search tickets"), { target: { value: "reader" } });
    fireEvent.change(screen.getByLabelText("Workspace", { exact: true }), { target: { value: "workspace" } });
    fireEvent.change(screen.getByLabelText("Board", { exact: true }), { target: { value: "board" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "HIGH" } });
    fireEvent.click(screen.getByRole("button", { name: "Board", exact: true }));
    expect(screen.getByRole("region", { name: "Ticket board" })).toBeInTheDocument();
    expect(screen.getByText("Repair access reader")).toBeInTheDocument();
    expect(screen.queryByText("Check cable")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    expect(screen.getByLabelText("Search tickets")).toHaveValue("reader");
    fireEvent.click(screen.getByRole("button", { name: "Tickets", exact: true }));
    expect(screen.getByLabelText("Board", { exact: true })).toHaveValue("board");
    expect(new URLSearchParams(window.location.search).get("priority")).toBe("HIGH");
    expect(new URLSearchParams(window.location.search).get("layout")).toBe("board");
  });

  it("drills into a specific manager board without clearing its selected board", () => {
    render(<TicketWorkspaceView initialData={data(true)} actor={manager} initialQuery={{ view: "workspaces" }} />);
    const boardCard = screen.getByRole("heading", { name: "Service desk" }).closest("article")!;
    fireEvent.click(within(boardCard).getByRole("button", { name: "Open tickets" }));
    expect(screen.getByLabelText("Workspace", { exact: true })).toHaveValue("workspace");
    expect(screen.getByLabelText("Board", { exact: true })).toHaveValue("board");
    expect(new URLSearchParams(window.location.search).get("board")).toBe("board");
  });

  it("retains board archive history and filters it separately from operational tickets", () => {
    const filters = { view: "tickets" as const, workspace: "", board: "", search: "", status: "", priority: "" };
    expect(filterCompanyTickets(data(true), filters).map((ticket) => ticket.id)).toEqual(["1", "2"]);
    expect(filterCompanyTickets(data(true), { ...filters, view: "archive" }).map((ticket) => ticket.id)).toEqual(["3", "4"]);
    render(<TicketWorkspaceView initialData={data(true)} actor={manager} initialQuery={{ view: "archive", board: "old" }} />);
    expect(screen.getByText("Ticket 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Board", { exact: true })).toHaveValue("old");
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
