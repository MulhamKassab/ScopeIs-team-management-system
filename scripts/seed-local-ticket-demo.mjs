/** Fictional ticket examples through the normal local HTTP authorization boundary. */
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";

const apply = process.argv.includes("--apply");
if (process.argv.slice(2).some((argument) => argument !== "--apply")) throw new Error("Only --apply is supported.");
const values = parse(await readFile(new URL("../.env", import.meta.url), "utf8"));
const target = new URL(values.DATABASE_URL);
if (values.APP_ENV !== "development" || values.SCOPEIS_DEMO_WORKSPACE !== "true" || !["localhost", "127.0.0.1", "::1"].includes(target.hostname) || !decodeURIComponent(target.pathname).startsWith("/scopeis_company_demo_") || !values.SCOPEIS_LOCAL_DEMO_PASSWORD) throw new Error("Fictional ticket examples require the explicitly configured local company demo.");
if (!apply) {
  process.stdout.write("Dry run: create fictional Company support examples through http://127.0.0.1:3000. Pass --apply to save.\n");
  process.exit(0);
}
const origin = "http://127.0.0.1:3000";
const signIn = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ identifier: "raafat", password: values.SCOPEIS_LOCAL_DEMO_PASSWORD }) });
if (!signIn.ok) throw new Error("The ordinary local demo sign-in failed.");
const cookie = signIn.headers.getSetCookie().map((entry) => entry.split(";")[0]).join("; ");
if (!cookie) throw new Error("No session was issued.");
async function workspace() {
  const response = await fetch(`${origin}/api/tickets`, { headers: { Cookie: cookie }, cache: "no-store" });
  if (!response.ok) throw new Error("The local ticket workspace could not be read.");
  return response.json();
}
async function command(input) {
  const response = await fetch(`${origin}/api/tickets/commands`, { method: "POST", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error(`Local demo ${input.action} refused (${response.status}).`);
  return response.json();
}
function fictionalPdf() {
  const text = "BT /F1 14 Tf 50 740 Td (Fictional ticket attachment) Tj 0 -24 Td (Use this example to explore private files in the local demo.) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf));
}
try {
  let snapshot = await workspace();
  const name = "Company support · Local demo";
  let container = snapshot.workspaces.find((entry) => entry.name === name);
  if (!container) { await command({ action: "createWorkspace", name, description: "Fictional examples for exploring company tickets." }); snapshot = await workspace(); container = snapshot.workspaces.find((entry) => entry.name === name); }
  const employees = snapshot.people.filter((person) => person.role === "EMPLOYEE");
  if (employees.length !== 3) throw new Error("Expected the three fictional demo Employees.");
  for (const person of employees) {
    snapshot = await workspace(); container = snapshot.workspaces.find((entry) => entry.name === name);
    if (!container.members.some((member) => member.userId === person.userId)) await command({ action: "setWorkspaceMember", workspaceId: container.id, userId: person.userId, active: true, version: container.version });
  }
  snapshot = await workspace(); container = snapshot.workspaces.find((entry) => entry.name === name);
  let board = snapshot.boards.find((entry) => entry.workspaceId === container.id && entry.name === "Operations");
  if (!board) { await command({ action: "createBoard", workspaceId: container.id, name: "Operations", status: "PUBLISHED", version: container.version }); snapshot = await workspace(); board = snapshot.boards.find((entry) => entry.workspaceId === container.id && entry.name === "Operations"); }
  if (board.status !== "PUBLISHED") throw new Error("The existing demo board was changed; no lifecycle will be overwritten.");
  const mulham = employees.find((entry) => entry.displayName === "Mulham") ?? employees[0];
  const ahmad = employees.find((entry) => entry.displayName === "Ahmad") ?? employees[1];
  const omar = employees.find((entry) => entry.displayName === "Omar") ?? employees[2];
  const ticketDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());
  const examples = [
    { subject: "Check the reception access reader", status: "OPEN", priority: "HIGH", assigneeIds: [mulham.userId], observerIds: [ahmad.userId], summary: "Confirm the access reader works and record the result." },
    { subject: "Prepare the weekly support handover", status: "IN_PROGRESS", priority: "MEDIUM", assigneeIds: [mulham.userId, omar.userId], summary: "Collect the completed work and list anything that needs follow-up." },
    { subject: "Replace the meeting room cable", status: "ON_HOLD", priority: "MEDIUM", assigneeIds: [omar.userId], observerIds: [mulham.userId], summary: "Fit a replacement cable and test the screen connection.", onHoldReason: "Waiting for the replacement cable to arrive." },
    { subject: "Review next week's equipment checks", status: "PLANNED", priority: "LOW", assigneeIds: [ahmad.userId], summary: "Plan the routine equipment checks for next week." },
    { subject: "Complete the workstation inspection", status: "CLOSED", priority: "LOW", assigneeIds: [ahmad.userId], summary: "Inspect the workstation and confirm it is ready.", workCompleted: "Routine checks completed." },
  ];
  let created = 0;
  for (const example of examples) {
    snapshot = await workspace(); board = snapshot.boards.find((entry) => entry.id === board.id);
    if (!snapshot.tickets.some((ticket) => ticket.boardId === board.id && ticket.subject === example.subject)) { await command({ action: "createTicket", boardId: board.id, version: board.version, ticketDate, ...example }); created++; }
  }
  snapshot = await workspace();
  const firstTicket = snapshot.tickets.find((ticket) => ticket.boardId === board.id && ticket.subject === examples[0].subject);
  const fileResponse = await fetch(`${origin}/api/tickets/${firstTicket.id}/files`, { headers: { Cookie: cookie }, cache: "no-store" });
  if (!fileResponse.ok) throw new Error("The example's private files could not be read.");
  const fileData = await fileResponse.json();
  const filename = "Fictional-ticket-guide.pdf";
  let fileCreated = false;
  if (!fileData.files.some((file) => file.fileName === filename)) {
    const form = new FormData(); form.set("version", String(fileData.version)); form.set("file", new Blob([fictionalPdf()], { type: "application/pdf" }), filename);
    const response = await fetch(`${origin}/api/tickets/${firstTicket.id}/files`, { method: "POST", headers: { Origin: origin, Cookie: cookie }, body: form });
    if (!response.ok) throw new Error(`Fictional attachment refused (${response.status}).`);
    fileCreated = true;
  }
  process.stdout.write(JSON.stringify({ fictional: true, created, fileCreated, workspace: name, board: "Operations" }) + "\n");
} finally {
  await fetch(`${origin}/api/auth/logout`, { method: "POST", headers: { Origin: origin, Cookie: cookie } });
}
