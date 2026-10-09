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
async function fixture(page: Page, label: string) {
  const workspace = await command(page, { action: "createWorkspace", name: `${label} ${randomUUID().slice(0, 8)}` });
  let version = workspace.version;
  for (const userId of ["mock-employee-cora", "mock-employee-dan"]) version = (await command(page, { action: "setWorkspaceMember", workspaceId: workspace.id, userId, active: true, version })).version;
  const board = await command(page, { action: "createBoard", workspaceId: workspace.id, name: `Published ${label}`, status: "PUBLISHED", version });
  return { workspaceId: workspace.id, boardId: board.id, boardVersion: board.version };
}
async function closeDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible()) { await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); }
}
async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test("manager creates and edits Company workspaces, publishes boards and grants ticket people while retaining management navigation", async ({ page }) => {
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
  await page.getByRole("button", { name: `New board in ${name}` }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("UI Published board");
  await dialog.getByRole("combobox", { name: "Lifecycle", exact: true }).selectOption("PUBLISHED");
  await dialog.getByRole("button", { name: "Create board", exact: true }).click();
  await expect.poll(async () => {
    const current = await workspaceData(page);
    const workspaceId = current.workspaces.find((entry) => entry.name === name)?.id;
    return current.boards.some((entry) => entry.workspaceId === workspaceId && entry.name === "UI Published board" && entry.status === "PUBLISHED");
  }).toBe(true);
  await closeDialog(page);
  const data = await workspaceData(page);
  const workspace = data.workspaces.find((entry) => entry.name === name)!;
  const board = data.boards.find((entry) => entry.workspaceId === workspace.id)!;
  const ticket = await command(page, { action: "createTicket", boardId: board.id, version: board.version, subject: "UI manager grant", ticketDate: "2026-10-08" });
  await page.goto(`/tickets/${ticket.id}`);
  await page.getByRole("button", { name: "Manage ticket people", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Cora Bell", exact: true }).selectOption("ASSIGNEE");
  await dialog.getByRole("combobox", { name: "Dan Rowan", exact: true }).selectOption("OBSERVER");
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
  await dialog.getByRole("combobox", { name: "Board", exact: true }).selectOption(setup.boardId);
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

test("observers and unrelated members receive current read-only and non-enumerating ticket boundaries", async ({ page }) => {
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

test("Overview, Tickets, list and board retain shared filters across refresh and fit the viewport", async ({ page }, testInfo) => {
  await signIn(page, "Nora Albright");
  const setup = await fixture(page, "Shared filters");
  const subject = `Filtered ${randomUUID().slice(0, 8)}`;
  await command(page, { action: "createTicket", boardId: setup.boardId, version: setup.boardVersion, subject, ticketDate: "2026-10-08", priority: "HIGH" });
  await command(page, { action: "createTicket", boardId: setup.boardId, version: setup.boardVersion, subject: "Excluded search result", ticketDate: "2026-10-08", priority: "LOW" });
  await page.goto("/tickets");
  await page.getByRole("combobox", { name: "Workspace", exact: true }).selectOption(setup.workspaceId);
  await page.getByLabel("Search tickets", { exact: true }).fill(subject);
  await page.getByRole("combobox", { name: "Priority", exact: true }).selectOption("HIGH");
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await expect(page.locator(".ticket-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await expect(page.getByRole("region", { name: "Ticket board" })).toBeVisible();
  await expect(page.locator(".ticket-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByLabel("Search tickets", { exact: true })).toHaveValue(subject);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Workspace", exact: true })).toHaveValue(setup.workspaceId);
  await expect(page.getByLabel("Search tickets", { exact: true })).toHaveValue(subject);
  await expect(page.getByRole("combobox", { name: "Priority", exact: true })).toHaveValue("HIGH");
  await fitsViewport(page);
  await page.screenshot({ path: testInfo.outputPath("company-ticket-overview.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Tickets", exact: true }).click();
  await expect(page.getByRole("button", { name: "Board", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ticket-card")).toHaveCount(1);
  await fitsViewport(page);
  await page.screenshot({ path: testInfo.outputPath("company-ticket-workspace.png"), fullPage: true, animations: "disabled" });
});
