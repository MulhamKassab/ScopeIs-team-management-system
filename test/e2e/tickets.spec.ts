import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import type { TicketDetail, TicketWorkspaceData } from "@/modules/tickets/types";
import { signIn, signOut } from "./sign-in";

test.skip(process.env.SCOPEIS_TICKETS_E2E !== "true", "Run with the guarded Company ticket fixture runner.");

type Changed = { id: string; version: number };
async function command(page: Page, data: object) {
  const response = await page.request.post("/api/tickets/commands", { headers: { Origin: new URL(page.url()).origin }, data });
  expect(response.status()).toBe(200);
  return await response.json() as Changed;
}
async function workspaceData(page: Page) {
  const response = await page.request.get("/api/tickets"); expect(response.status()).toBe(200);
  return await response.json() as TicketWorkspaceData;
}
async function detail(page: Page, id: string) {
  const response = await page.request.get(`/api/tickets/${id}`); expect(response.status()).toBe(200);
  return (await response.json() as { ticket: TicketDetail }).ticket;
}
async function fixture(page: Page, label: string, memberIds = ["mock-employee-cora", "mock-employee-dan"]) {
  const workspaceName = `${label} ${randomUUID().slice(0, 8)}`;
  const workspace = await command(page, { action: "createWorkspace", name: workspaceName });
  let version = workspace.version;
  for (const userId of memberIds) version = (await command(page, { action: "setWorkspaceMember", workspaceId: workspace.id, userId, active: true, version })).version;
  const boardName = `Published ${label}`;
  const board = await command(page, { action: "createBoard", workspaceId: workspace.id, name: boardName, status: "PUBLISHED", version });
  return { workspaceId: workspace.id, workspaceName, boardId: board.id, boardName, boardVersion: board.version };
}
async function closeDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible()) { await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); }
}
async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test("manager creates and edits Company workspaces, publishes dashboards and grants ticket people while retaining management navigation", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Workspaces", exact: true }).click();
  await page.getByRole("button", { name: "New workspace", exact: true }).click();
  let name = `UI Company ${randomUUID().slice(0, 8)}`;
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByRole("button", { name: `Manage people in ${name}` })).toBeAttached();
  await closeDialog(page);
  await page.getByRole("button", { name: `Edit workspace ${name}`, exact: true }).click();
  dialog = page.getByRole("dialog");
  name = `${name} corrected`;
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Description · optional", { exact: true }).fill("Fictional company maintenance work");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  // A read during the save must complete safely; the UI then confirms the committed version.
  await workspaceData(page);
  await expect(page.getByRole("button", { name: `Manage people in ${name}`, exact: true })).toBeAttached();
  await expect.poll(async () => (await workspaceData(page)).workspaces.find((entry) => entry.name === name)?.description).toBe("Fictional company maintenance work");
  await closeDialog(page);
  for (const person of ["Cora Bell", "Dan Rowan"]) {
    await page.getByRole("button", { name: `Manage people in ${name}` }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Person", exact: true }).selectOption({ label: person });
    await dialog.getByRole("button", { name: "Add member", exact: true }).click();
    await expect.poll(async () => (await workspaceData(page)).workspaces.find((entry) => entry.name === name)?.members.some((entry) => entry.displayName === person)).toBe(true);
    await closeDialog(page);
  }
  await page.getByRole("button", { name: `New dashboard in ${name}` }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("UI Published dashboard");
  await dialog.getByRole("combobox", { name: "Lifecycle", exact: true }).selectOption("PUBLISHED");
  await dialog.getByRole("button", { name: "Create dashboard", exact: true }).click();
  await expect.poll(async () => {
    const current = await workspaceData(page);
    const workspaceId = current.workspaces.find((entry) => entry.name === name)?.id;
    return current.boards.some((entry) => entry.workspaceId === workspaceId && entry.name === "UI Published dashboard" && entry.status === "PUBLISHED");
  }).toBe(true);
  await closeDialog(page);
  const data = await workspaceData(page);
  const workspace = data.workspaces.find((entry) => entry.name === name)!;
  const board = data.boards.find((entry) => entry.workspaceId === workspace.id)!;
  const ticket = await command(page, { action: "createTicket", boardId: board.id, version: board.version, subject: "UI manager grant", ticketDate: "2026-10-08" });
  await page.goto(`/tickets/${ticket.id}`);
  await page.getByRole("button", { name: "Manage ticket people", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("group", { name: "Assignees", exact: true }).getByRole("checkbox", { name: "Cora Bell", exact: true }).check();
  await dialog.getByRole("group", { name: "Mentioned people · read only", exact: true }).getByRole("checkbox", { name: "Dan Rowan", exact: true }).check();
  await dialog.getByRole("button", { name: "Save people", exact: true }).click();
  await expect.poll(async () => (await detail(page, ticket.id)).participants.filter((entry) => entry.participation !== "CREATOR").length).toBe(2);
  await closeDialog(page);
  await fitsViewport(page);
  expect((await page.goto("/employees"))?.status()).toBe(200);
  expect((await page.goto("/schedule"))?.status()).toBe(200);
  expect((await page.goto("/audit"))?.status()).toBe(200);
});

test("Employee lands on tickets and creates, holds, closes, logs, archives and restores their own work", async ({ page }, testInfo) => {
  await signIn(page, "Nora Albright");
  const setup = await fixture(page, "Employee work");
  await signOut(page);
  await signIn(page, "Cora Bell", { destination: "landing" });
  await expect(page.getByRole("heading", { name: "My tickets", exact: true })).toBeVisible();
  expect((await page.goto("/employees"))?.status()).toBe(404);
  await page.goto("/tickets");
  await page.getByRole("button", { name: "New ticket", exact: true }).click();
  let dialog = page.getByRole("dialog");
  const subject = `Employee inspection ${randomUUID().slice(0, 8)}`;
  await dialog.getByRole("combobox", { name: "Workspace", exact: true }).selectOption(setup.workspaceId);
  await dialog.getByRole("combobox", { name: "Dashboard", exact: true }).selectOption(setup.boardId);
  await dialog.getByLabel("Subject", { exact: true }).fill(subject);
  await dialog.getByLabel("Ticket date", { exact: true }).fill("2026-10-08");
  await dialog.getByRole("combobox", { name: "Status", exact: true }).selectOption("ON_HOLD");
  await expect(dialog.getByLabel("On-hold reason", { exact: true })).toHaveAttribute("required", "");
  await dialog.getByRole("button", { name: "Create ticket", exact: true }).click();
  expect((await workspaceData(page)).tickets.some((entry) => entry.subject === subject)).toBe(false);
  await dialog.getByLabel("On-hold reason", { exact: true }).fill("Awaiting a fictional spare");
  await dialog.getByRole("button", { name: "Create ticket", exact: true }).click();
  await expect.poll(async () => (await workspaceData(page)).tickets.some((entry) => entry.subject === subject)).toBe(true);
  await closeDialog(page);
  await page.getByRole("link", { name: subject, exact: true }).click();
  await expect(page.getByRole("heading", { name: subject, exact: true })).toBeVisible();
  const ticketId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("button", { name: "Edit ticket", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Status", exact: true }).selectOption("CLOSED");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(async () => (await detail(page, ticketId)).status).toBe("CLOSED");
  await closeDialog(page);
  await page.getByRole("button", { name: "Add work log", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Work description", { exact: true }).fill("Completed a fictional inspection");
  await dialog.getByLabel("Minutes (optional)", { exact: true }).fill("25");
  await dialog.getByRole("button", { name: "Save work log", exact: true }).click();
  await expect.poll(async () => (await detail(page, ticketId)).workLogs.length).toBe(1);
  await closeDialog(page);
  await page.getByRole("button", { name: "Archive ticket", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Archive ticket", exact: true }).click();
  await expect(page.getByRole("button", { name: "Restore ticket", exact: true })).toBeAttached();
  await closeDialog(page);
  await page.getByRole("button", { name: "Restore ticket", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Restore ticket", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit ticket", exact: true })).toBeAttached();
  await closeDialog(page);
  expect((await detail(page, ticketId)).workLogs).toHaveLength(1);
  await fitsViewport(page);
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "My tickets", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("employee-ticket-workspace.png"), fullPage: true, animations: "disabled" });
  for (const path of ["/profile", "/schedule", "/leave"]) expect((await page.goto(path))?.status()).toBe(200);
});

test("company users create without enrollment, navigate nested dashboards, assign several people and mention with read-only notifications", async ({ page, browser }, testInfo) => {
  await signIn(page, "Nora Albright");
  const setup = await fixture(page, "Company collaboration", []);
  const initialWorkspace = (await workspaceData(page)).workspaces.find((entry) => entry.id === setup.workspaceId)!;
  expect(initialWorkspace.members.map((person) => person.userId)).toEqual(["mock-super-admin-nora"]);
  const secondDashboardName = `Additional dashboard ${randomUUID().slice(0, 8)}`;
  const secondDashboard = await command(page, { action: "createBoard", workspaceId: setup.workspaceId, version: initialWorkspace.version, name: secondDashboardName, status: "PUBLISHED" });
  const hidden = await command(page, { action: "createTicket", boardId: secondDashboard.id, version: secondDashboard.version, subject: `Unrelated dashboard work ${randomUUID().slice(0, 8)}`, ticketDate: "2026-10-09" });
  const anonymous = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    expect((await anonymous.request.get("/api/tickets")).status()).toBe(401);
    expect((await anonymous.request.post("/api/tickets/commands", { headers: { Origin: new URL(page.url()).origin }, data: { action: "createTicket", boardId: setup.boardId, version: setup.boardVersion, subject: "Anonymous refusal", ticketDate: "2026-10-09" } })).status()).toBe(401);
  } finally { await anonymous.close(); }
  await signOut(page);
  await signIn(page, "Cora Bell", { destination: "landing" });
  await page.getByRole("button", { name: "Workspaces", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workspaces and dashboards", exact: true })).toBeVisible();
  const company = page.locator(".ticket-managed-workspace").filter({ has: page.getByRole("heading", { name: setup.workspaceName, exact: true }) });
  const firstDashboard = company.locator("article").filter({ has: page.getByRole("heading", { name: setup.boardName, exact: true }) });
  const additionalDashboard = company.locator("article").filter({ has: page.getByRole("heading", { name: secondDashboardName, exact: true }) });
  await expect(firstDashboard).toBeVisible();
  await expect(additionalDashboard).toBeVisible();
  await expect(company.getByRole("button", { name: `Manage people in ${setup.workspaceName}`, exact: true })).toHaveCount(0);
  await expect(company.getByRole("button", { name: `New dashboard in ${setup.workspaceName}`, exact: true })).toHaveCount(0);
  await firstDashboard.getByRole("button", { name: "Open tickets", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Workspace", exact: true })).toHaveValue(setup.workspaceId);
  await expect(page.getByRole("combobox", { name: "Dashboard", exact: true })).toHaveValue(setup.boardId);
  await page.getByRole("button", { name: "New ticket", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox", { name: "Workspace", exact: true })).toHaveValue(setup.workspaceId);
  await expect(dialog.getByRole("combobox", { name: "Dashboard", exact: true })).toHaveValue(setup.boardId);
  const subject = `Collaborative reader repair ${randomUUID().slice(0, 8)}`;
  await dialog.getByLabel("Subject", { exact: true }).fill(subject);
  await dialog.getByLabel("Ticket date", { exact: true }).fill("2026-10-09");
  const assignees = dialog.getByRole("group", { name: "Assignees", exact: true });
  const mentioned = dialog.getByRole("group", { name: "Mentioned people · read only", exact: true });
  await expect(dialog.getByRole("checkbox", { name: "Cora Bell", exact: true })).toHaveCount(0);
  await assignees.getByRole("checkbox", { name: "Ben Iqbal", exact: true }).check();
  await assignees.getByRole("checkbox", { name: "Dan Rowan", exact: true }).check();
  await mentioned.getByRole("checkbox", { name: "Ava Mercer", exact: true }).check();
  await dialog.getByLabel("Find people", { exact: true }).fill("Ava");
  await expect(assignees.getByText("2 selected · Ben Iqbal, Dan Rowan", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("company-ticket-multiple-people.png"), fullPage: true, animations: "disabled" });
  await dialog.getByRole("button", { name: "Create ticket", exact: true }).click();
  await expect.poll(async () => (await workspaceData(page)).tickets.some((ticket) => ticket.subject === subject)).toBe(true);
  const created = (await workspaceData(page)).tickets.find((ticket) => ticket.subject === subject)!;
  const createdDetail = await detail(page, created.id);
  expect(createdDetail.permissions.managePeople).toBe(true);
  expect(createdDetail.assignees.map((person) => person.userId).sort()).toEqual(["mock-admin-ben", "mock-employee-dan"]);
  expect(createdDetail.participants.find((person) => person.userId === "mock-admin-ava")?.participation).toBe("OBSERVER");
  await closeDialog(page);
  await page.getByRole("button", { name: "New ticket", exact: true }).click();
  dialog = page.getByRole("dialog");
  const secondSubject = `Second company task ${randomUUID().slice(0, 8)}`;
  await dialog.getByLabel("Subject", { exact: true }).fill(secondSubject);
  await dialog.getByLabel("Ticket date", { exact: true }).fill("2026-10-09");
  await dialog.getByRole("button", { name: "Create ticket", exact: true }).click();
  await expect.poll(async () => (await workspaceData(page)).tickets.some((ticket) => ticket.subject === secondSubject)).toBe(true);
  const secondTicket = (await workspaceData(page)).tickets.find((ticket) => ticket.subject === secondSubject)!;
  await closeDialog(page);
  await page.getByRole("button", { name: "Workspaces", exact: true }).click();
  await expect(firstDashboard.getByText("2 tickets you can view", { exact: true })).toBeVisible();
  await expect(additionalDashboard.getByText("0 tickets you can view", { exact: true })).toBeVisible();
  await fitsViewport(page);
  await page.screenshot({ path: testInfo.outputPath("company-workspace-dashboard-hierarchy.png"), fullPage: true, animations: "disabled" });
  await additionalDashboard.getByRole("button", { name: "Open tickets", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Dashboard", exact: true })).toHaveValue(secondDashboard.id);
  await expect(page.locator(".ticket-card")).toHaveCount(0);
  expect((await page.request.get(`/api/tickets/${hidden.id}`)).status()).toBe(404);
  await page.getByRole("button", { name: "Workspaces", exact: true }).click();
  await firstDashboard.getByRole("button", { name: "Open tickets", exact: true }).click();
  await expect(page.locator(".ticket-card")).toHaveCount(2);
  await expect(page.getByRole("link", { name: subject, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: secondSubject, exact: true })).toBeVisible();
  expect((await page.goto("/employees"))?.status()).toBe(404);
  await signOut(page);

  await signIn(page, "Ava Mercer");
  await page.goto("/notifications?filter=unread");
  const mentionNotification = page.locator(".notification-list li").filter({ has: page.locator(`a[href="/tickets/${created.id}"]`) }).filter({ hasText: "Ticket created" });
  await expect(mentionNotification).toBeVisible();
  await mentionNotification.getByRole("link", { name: "View details", exact: true }).click();
  await expect(page.getByRole("heading", { name: subject, exact: true })).toBeVisible();
  await expect(page.getByText("You have read-only access to this ticket.", { exact: true })).toBeVisible();
  for (const name of ["Edit ticket", "Manage ticket people", "Archive ticket", "Add work log", "Attach file"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  const mentionedDetail = await detail(page, created.id);
  const refused = await page.request.post("/api/tickets/commands", { headers: { Origin: new URL(page.url()).origin }, data: { action: "updateTicket", ticketId: created.id, version: mentionedDetail.version, status: "CLOSED" } });
  expect(refused.status()).toBe(404);
  expect((await page.goto("/employees/mock-employee-dan"))?.status()).toBe(404);
  await signOut(page);

  await signIn(page, "Ben Iqbal");
  await page.goto(`/tickets/${created.id}`);
  await page.getByRole("button", { name: "Edit ticket", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Status", exact: true }).selectOption("IN_PROGRESS");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(async () => (await detail(page, created.id)).status).toBe("IN_PROGRESS");
  await closeDialog(page);
  await expect(page.getByRole("button", { name: "Manage ticket people", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive ticket", exact: true })).toHaveCount(0);
  expect((await page.request.get(`/api/tickets/${secondTicket.id}`)).status()).toBe(404);
  await signOut(page);

  await signIn(page, "Dan Rowan", { destination: "landing" });
  await page.goto(`/tickets/${created.id}`);
  await page.getByRole("button", { name: "Add work log", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Work description", { exact: true }).fill("Dan completed the assigned fictional cable inspection.");
  await dialog.getByRole("button", { name: "Save work log", exact: true }).click();
  await expect.poll(async () => (await detail(page, created.id)).workLogs.some((log) => log.authorUserId === "mock-employee-dan")).toBe(true);
  await closeDialog(page);
  await fitsViewport(page);
  await page.screenshot({ path: testInfo.outputPath("company-assignee-ticket-details.png"), fullPage: true, animations: "disabled" });
  expect((await page.request.get(`/api/tickets/${secondTicket.id}`)).status()).toBe(404);
  await signOut(page);
  await signIn(page, "Nora Albright");
  expect((await workspaceData(page)).workspaces.find((entry) => entry.id === setup.workspaceId)?.members.map((person) => person.userId)).toEqual(["mock-super-admin-nora"]);
});

test("mentioned people and unrelated members receive current read-only and non-enumerating ticket boundaries", async ({ page }) => {
  await signIn(page, "Nora Albright");
  const setup = await fixture(page, "Observer work");
  const observed = await command(page, { action: "createTicket", boardId: setup.boardId, version: setup.boardVersion, subject: `Observed ticket ${randomUUID().slice(0, 8)}`, ticketDate: "2026-10-08", assigneeIds: ["mock-employee-cora"], observerIds: ["mock-employee-dan"] });
  const hidden = await command(page, { action: "createTicket", boardId: setup.boardId, version: setup.boardVersion, subject: "Unrelated private ticket", ticketDate: "2026-10-08", assigneeIds: ["mock-employee-cora"] });
  await signOut(page);
  await signIn(page, "Dan Rowan", { destination: "landing" });
  await page.goto(`/tickets/${observed.id}`);
  await expect(page.getByText("You have read-only access to this ticket.", { exact: true })).toBeVisible();
  for (const name of ["Edit ticket", "Manage ticket people", "Archive ticket", "Add work log", "Attach file"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  const refused = await page.request.post("/api/tickets/commands", { headers: { Origin: new URL(page.url()).origin }, data: { action: "updateTicket", ticketId: observed.id, version: observed.version, status: "CLOSED" } });
  expect(refused.status()).toBe(404);
  expect((await page.goto(`/tickets/${hidden.id}`))?.status()).toBe(404);
  expect((await page.request.get(`/api/tickets/${hidden.id}`)).status()).toBe(404);
  expect((await workspaceData(page)).tickets.some((entry) => entry.id === hidden.id)).toBe(false);
});

test("private upload and download work through current participant access and stop after revocation", async ({ page, browser }) => {
  await signIn(page, "Nora Albright");
  const setup = await fixture(page, "Private files");
  const ticket = await command(page, { action: "createTicket", boardId: setup.boardId, version: setup.boardVersion, subject: `Private file work ${randomUUID().slice(0, 8)}`, ticketDate: "2026-10-08", assigneeIds: ["mock-employee-cora"], observerIds: ["mock-employee-dan"] });
  await signOut(page);
  await signIn(page, "Cora Bell", { destination: "landing" });
  await page.goto(`/tickets/${ticket.id}`);
  await page.getByRole("button", { name: "Attach file", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const bytes = Buffer.from("%PDF-1.4\nFictional ticket browser attachment\n%%EOF");
  await dialog.getByLabel("Choose file", { exact: true }).setInputFiles({ name: "Fictional work.pdf", mimeType: "application/pdf", buffer: bytes });
  await dialog.getByRole("button", { name: "Upload private file", exact: true }).click();
  await expect(page.getByRole("link", { name: "Download Fictional work.pdf", exact: true })).toBeAttached();
  await closeDialog(page);
  const file = (await detail(page, ticket.id)).files[0]!;
  const path = `/api/tickets/${ticket.id}/files/${file.id}`;
  const delivered = await page.request.get(path);
  expect(delivered.status()).toBe(200); expect(await delivered.body()).toEqual(bytes); expect(delivered.headers()["cache-control"]).toContain("no-store");
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const manager = await context.newPage();
    await signIn(manager, "Nora Albright");
    const current = await detail(manager, ticket.id);
    await command(manager, { action: "setParticipants", ticketId: ticket.id, version: current.version, assigneeIds: [], observerIds: ["mock-employee-dan"] });
    expect((await page.request.get(path)).status()).toBe(404);
    expect((await page.goto(`/tickets/${ticket.id}`))?.status()).toBe(404);
  } finally { await context.close(); }
});

test("Overview, Tickets, list and Kanban retain shared filters across refresh and fit the viewport", async ({ page }, testInfo) => {
  await signIn(page, "Nora Albright");
  const setup = await fixture(page, "Shared filters");
  const subject = `Filtered ${randomUUID().slice(0, 8)}`;
  await command(page, { action: "createTicket", boardId: setup.boardId, version: setup.boardVersion, subject, ticketDate: "2026-10-08", priority: "HIGH" });
  await command(page, { action: "createTicket", boardId: setup.boardId, version: setup.boardVersion, subject: "Excluded search result", ticketDate: "2026-10-08", priority: "LOW" });
  await page.goto("/tickets");
  await page.getByRole("combobox", { name: "Workspace", exact: true }).selectOption(setup.workspaceId);
  await page.getByRole("combobox", { name: "Dashboard", exact: true }).selectOption(setup.boardId);
  await page.getByLabel("Search tickets", { exact: true }).fill(subject);
  await page.getByRole("combobox", { name: "Priority", exact: true }).selectOption("HIGH");
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await expect(page.locator(".ticket-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await expect(page.getByRole("region", { name: "Ticket Kanban" })).toBeVisible();
  await expect(page.locator(".ticket-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByLabel("Search tickets", { exact: true })).toHaveValue(subject);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Workspace", exact: true })).toHaveValue(setup.workspaceId);
  await expect(page.getByRole("combobox", { name: "Dashboard", exact: true })).toHaveValue(setup.boardId);
  await expect(page.getByLabel("Search tickets", { exact: true })).toHaveValue(subject);
  await expect(page.getByRole("combobox", { name: "Priority", exact: true })).toHaveValue("HIGH");
  await fitsViewport(page);
  await page.screenshot({ path: testInfo.outputPath("company-ticket-overview.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await expect(page.getByRole("button", { name: "Kanban", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ticket-card")).toHaveCount(1);
  await fitsViewport(page);
  await page.screenshot({ path: testInfo.outputPath("company-ticket-workspace.png"), fullPage: true, animations: "disabled" });
});
