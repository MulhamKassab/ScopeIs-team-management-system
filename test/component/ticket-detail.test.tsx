// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TicketDetailView } from "@/modules/tickets/ticket-detail";
import type { TicketDetail, TicketPermissions, TicketWorkspaceData } from "@/modules/tickets/types";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const ticketId = "10000000-0000-4000-8000-000000000001";
const boardId = "10000000-0000-4000-8000-000000000002";
const workspaceId = "10000000-0000-4000-8000-000000000003";
const fileId = "10000000-0000-4000-8000-000000000004";
const creator = { userId: "creator", displayName: "Creator One", role: "EMPLOYEE" as const };
const assignee = { userId: "worker", displayName: "Worker Two", role: "EMPLOYEE" as const };
const observer = { userId: "observer", displayName: "Observer Three", role: "EMPLOYEE" as const };
const actor = { id: creator.userId, displayName: creator.displayName, role: creator.role };
const noPermissions: TicketPermissions = { edit: false, managePeople: false, archive: false, restore: false, log: false, files: false };
const ownerPermissions: TicketPermissions = { edit: true, managePeople: false, archive: true, restore: false, log: true, files: true };
const workspace: TicketWorkspaceData = {
  workspaces: [{ id: workspaceId, name: "Company work", description: null, clientId: null, projectId: null, version: 1, canManage: true, members: [creator, assignee, observer] }],
  boards: [{ id: boardId, workspaceId, name: "Support board", status: "PUBLISHED", version: 1, canManage: true }],
  tickets: [], people: [creator, assignee, observer, { userId: "outside", displayName: "Outside workspace", role: "EMPLOYEE" }], clients: [], projects: [],
};

function detail(overrides: Partial<TicketDetail> = {}): TicketDetail {
  return {
    id: ticketId, number: 12, subject: "Repair the access reader", status: "OPEN", priority: "HIGH", ticketDate: "2026-10-08", dueDate: "2026-10-10",
    boardId, workspaceId, creatorUserId: creator.userId, creatorName: creator.displayName, assignees: [assignee], version: 3, archivedAt: null,
    permissions: ownerPermissions, summary: "Inspect the reader at reception.", planning: "Confirm power first.", workCompleted: null, notes: "Reception knows about the visit.", onHoldReason: null,
    createdAt: "2026-10-08T04:00:00.000Z", updatedAt: "2026-10-08T05:00:00.000Z",
    participants: [{ ...creator, participation: "CREATOR" }, { ...assignee, participation: "ASSIGNEE" }, { ...observer, participation: "OBSERVER" }],
    workLogs: [{ id: "10000000-0000-4000-8000-000000000005", authorUserId: creator.userId, authorName: creator.displayName, description: "Inspected power supply.", loggedAt: "2026-10-08T04:30:00.000Z", durationMinutes: 30, version: 1, canEdit: true }, { id: "10000000-0000-4000-8000-000000000006", authorUserId: assignee.userId, authorName: assignee.displayName, description: "Checked cable.", loggedAt: "2026-10-08T05:30:00.000Z", durationMinutes: null, version: 1, canEdit: false }],
    files: [{ id: fileId, ticketId, fileName: "Reader manual.pdf", contentType: "application/pdf", byteSize: 2048, uploaderUserId: creator.userId, uploaderName: creator.displayName, version: 2, createdAt: "2026-10-08T04:45:00.000Z", archivedAt: null, canArchive: true, canRestore: false }],
    ...overrides,
  };
}

function json(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function fetchWithRefresh(next: TicketDetail, commandStatus = 200) {
  return vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST") return json(commandStatus === 409 ? { message: "This record changed. Reload and try again." } : { id: ticketId, version: next.version }, commandStatus);
    if (url.includes("/files?")) return json({ files: next.files, version: next.version, canWrite: next.permissions.files, canManage: next.permissions.managePeople });
    return json({ ticket: next });
  });
}

beforeEach(() => { refresh.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Company ticket detail", () => {
  it("keeps observer access read-only and uses server permissions even for a management actor", () => {
    render(<TicketDetailView initialData={detail({ permissions: noPermissions })} workspace={workspace} actor={{ ...actor, role: "SUPER_ADMIN" }} />);
    expect(screen.getByRole("heading", { name: "Repair the access reader" })).toBeInTheDocument();
    expect(screen.getByText("Inspect the reader at reception.")).toBeInTheDocument();
    expect(screen.getByText("You have read-only access to this ticket.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download Reader manual.pdf" })).toHaveAttribute("href", `/api/tickets/${ticketId}/files/${fileId}`);
    for (const label of ["Edit ticket", "Archive ticket", "Manage ticket people", "Add work log", "Attach file", "Archive Reader manual.pdf"]) expect(screen.queryByRole("button", { name: label, exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit work log/ })).not.toBeInTheDocument();
  });

  it("lets a creator edit all five states and requires an on-hold reason without granting people access", () => {
    render(<TicketDetailView initialData={detail()} workspace={workspace} actor={actor} />);
    expect(screen.getByRole("button", { name: "Archive ticket", exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage ticket people" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit ticket", exact: true }));
    const form = screen.getByRole("form", { name: "Edit ticket" });
    const status = within(form).getByLabelText("Status");
    expect(within(status).getAllByRole("option").map((entry) => entry.textContent)).toEqual(["Planned", "Open", "In progress", "On hold", "Closed"]);
    fireEvent.change(status, { target: { value: "ON_HOLD" } });
    expect(within(form).getByLabelText("On-hold reason")).toBeRequired();
  });

  it("allows assignees to work and edit only logs the server marks editable, while archive remains unavailable", () => {
    render(<TicketDetailView initialData={detail({ permissions: { ...ownerPermissions, archive: false } })} workspace={workspace} actor={{ id: assignee.userId, displayName: assignee.displayName, role: assignee.role }} />);
    expect(screen.getByRole("button", { name: "Add work log" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach file" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Edit work log/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Archive ticket", exact: true })).not.toBeInTheDocument();
  });

  it("preserves archived content and private download, suppresses every write and offers authorized restore", () => {
    render(<TicketDetailView initialData={detail({ archivedAt: "2026-10-08T06:00:00.000Z", permissions: { ...ownerPermissions, managePeople: true, restore: true } })} workspace={workspace} actor={actor} />);
    expect(screen.getByText(/read-only until restored/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore ticket", exact: true })).toBeInTheDocument();
    expect(screen.getByText("Inspected power supply.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download Reader manual.pdf" })).toBeInTheDocument();
    for (const label of ["Edit ticket", "Archive ticket", "Manage ticket people", "Add work log", "Attach file", "Archive Reader manual.pdf"]) expect(screen.queryByRole("button", { name: label, exact: true })).not.toBeInTheDocument();
  });

  it("offers participant choices only for authorized workspace members, excludes creator and preserves exclusive participation", async () => {
    const next = detail({ version: 4, permissions: { ...ownerPermissions, managePeople: true } });
    const fetch = fetchWithRefresh(next);
    vi.stubGlobal("fetch", fetch);
    render(<TicketDetailView initialData={detail({ permissions: { ...ownerPermissions, managePeople: true } })} workspace={workspace} actor={{ ...actor, role: "SUPER_ADMIN" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage ticket people" }));
    const form = screen.getByRole("form", { name: "Manage ticket people" });
    expect(within(form).getAllByRole("combobox")).toHaveLength(2);
    expect(within(form).queryByLabelText("Creator One")).not.toBeInTheDocument();
    expect(within(form).queryByLabelText("Outside workspace")).not.toBeInTheDocument();
    fireEvent.change(within(form).getByLabelText("Worker Two"), { target: { value: "OBSERVER" } });
    fireEvent.change(within(form).getByLabelText("Observer Three"), { target: { value: "NONE" } });
    fireEvent.submit(form);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ action: "setParticipants", ticketId, version: 3, assigneeIds: [], observerIds: [assignee.userId] });
  });

  it("waits for an explicit reload after a conflict, replaces old fields and submits the latest version", async () => {
    const next = detail({ subject: "Reader replaced by a colleague", version: 4 });
    const fetch = fetchWithRefresh(next, 409);
    vi.stubGlobal("fetch", fetch);
    render(<TicketDetailView initialData={detail()} workspace={workspace} actor={actor} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit ticket", exact: true }));
    const form = screen.getByRole("form", { name: "Edit ticket" });
    fireEvent.change(within(form).getByLabelText("Subject"), { target: { value: "My unfinished edit" } });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("button", { name: "Reload latest record" })).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(within(form).getByLabelText("Subject")).toHaveValue("My unfinished edit");
    fireEvent.click(screen.getByRole("button", { name: "Reload latest record" }));
    await waitFor(() => expect(within(form).getByLabelText("Subject")).toHaveValue(next.subject));
    expect(fetch.mock.calls.map((entry) => entry[0])).toContain(`/api/tickets/${ticketId}/files?archived=false`);
    fireEvent.submit(form);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));
    expect(JSON.parse(String(fetch.mock.calls[3][1]?.body)).version).toBe(4);
  });

  it("uses Dubai work dates, sends optional minutes and refreshes before the next mutation", async () => {
    const next = detail({ version: 4 });
    const fetch = fetchWithRefresh(next);
    vi.stubGlobal("fetch", fetch);
    render(<TicketDetailView initialData={detail()} workspace={workspace} actor={actor} />);
    fireEvent.click(screen.getByRole("button", { name: "Add work log" }));
    const form = screen.getByRole("form", { name: "Add work log" });
    fireEvent.change(within(form).getByLabelText("Work description"), { target: { value: "Replaced the reader." } });
    fireEvent.change(within(form).getByLabelText("Work date and time"), { target: { value: "2026-10-08T12:00" } });
    fireEvent.change(within(form).getByLabelText("Minutes (optional)"), { target: { value: "45" } });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByText("Work log saved.")).toBeInTheDocument());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ action: "addWorkLog", ticketId, version: 3, description: "Replaced the reader.", durationMinutes: 45, loggedAt: "2026-10-08T08:00:00.000Z" });
    fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Archive ticket", exact: true }));
    fireEvent.submit(screen.getByRole("form", { name: "Archive ticket" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(6));
    expect(JSON.parse(String(fetch.mock.calls[3][1]?.body)).version).toBe(4);
  });

  it("uploads private bytes with the ticket version and rejects files over the announced bound", async () => {
    const fetch = fetchWithRefresh(detail({ version: 4 }));
    vi.stubGlobal("fetch", fetch);
    render(<TicketDetailView initialData={detail()} workspace={workspace} actor={actor} />);
    fireEvent.click(screen.getByRole("button", { name: "Attach file" }));
    const form = screen.getByRole("form", { name: "Attach private file" });
    const input = within(form).getByLabelText("Choose file");
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })] } });
    fireEvent.submit(form);
    expect(screen.getByRole("alert")).toHaveTextContent("5 MiB or less");
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [new File(["%PDF-1.7"], "note.pdf", { type: "application/pdf" })] } });
    fireEvent.submit(form);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const multipart = fetch.mock.calls[0][1]?.body as FormData;
    expect(multipart.get("version")).toBe("3");
    expect(multipart.get("file")).toBeInstanceOf(File);
    expect(fetch.mock.calls[0][0]).toBe(`/api/tickets/${ticketId}/files`);
  });

  it("announces the hosted 4 MiB limit, refuses oversized bytes locally and permits the boundary", async () => {
    const fetch = fetchWithRefresh(detail({ version: 4 }));
    vi.stubGlobal("fetch", fetch);
    const limit = 4 * 1024 * 1024;
    render(<TicketDetailView initialData={detail()} workspace={workspace} actor={actor} maxUploadBytes={limit} />);
    fireEvent.click(screen.getByRole("button", { name: "Attach file" }));
    const form = screen.getByRole("form", { name: "Attach private file" });
    expect(within(form).getByText("PDF, JPEG, PNG or Word document, up to 4 MiB.")).toBeInTheDocument();
    const input = within(form).getByLabelText("Choose file");
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(limit + 1)], "large.pdf", { type: "application/pdf" })] } });
    fireEvent.submit(form);
    expect(screen.getByRole("alert")).toHaveTextContent("4 MiB or less");
    expect(fetch).not.toHaveBeenCalled();
    const bytes = new Uint8Array(limit); bytes.set(new TextEncoder().encode("%PDF-1.7"));
    fireEvent.change(input, { target: { files: [new File([bytes], "hosted.pdf", { type: "application/pdf" })] } });
    fireEvent.submit(form);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const multipart = fetch.mock.calls[0][1]?.body as FormData;
    expect((multipart.get("file") as File).size).toBe(limit);
    expect(multipart.get("version")).toBe("3");
  });

  it("reloads a file conflict explicitly and uses both current ticket and file versions", async () => {
    const next = detail({ version: 5, files: detail().files.map((file) => ({ ...file, version: 3 })) });
    const fetch = fetchWithRefresh(next, 409);
    vi.stubGlobal("fetch", fetch);
    render(<TicketDetailView initialData={detail()} workspace={workspace} actor={actor} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive Reader manual.pdf" }));
    const form = screen.getByRole("form", { name: "Archive Reader manual.pdf" });
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("button", { name: "Reload latest record" })).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ action: "archive", version: 3, fileVersion: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Reload latest record" }));
    await waitFor(() => expect(screen.getByText(/Latest record loaded/)).toBeInTheDocument());
    fireEvent.submit(form);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));
    expect(JSON.parse(String(fetch.mock.calls[3][1]?.body))).toEqual({ action: "archive", version: 5, fileVersion: 3 });
  });

  it("removes previously visible content when a refresh reports revoked access", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "This resource is unavailable." }, 404)));
    render(<TicketDetailView initialData={detail()} workspace={workspace} actor={actor} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh ticket" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ticket unavailable" })).toBeInTheDocument());
    expect(screen.queryByText("Inspect the reader at reception.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download Reader manual.pdf" })).not.toBeInTheDocument();
  });
});
