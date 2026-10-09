import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, auditEvents, clients, employeeProfiles, notifications, sessions, teams, ticketFiles, ticketWorkspaces, users } from "@/db/schema";
import { TicketFilesService } from "@/modules/tickets/files";
import { ticketService } from "@/modules/tickets/service";
import { createLocalEvidenceStorage, type EvidenceStorage } from "@/server/providers/evidence-storage";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const actor = (id: string, role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id, role, displayName: `Fictional ${id}`, sessionId: randomUUID(), sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const superAdmin = actor("files-super-admin", "SUPER_ADMIN");
const manager = actor("files-scoped-admin", "ADMIN");
const creator = actor("files-creator", "EMPLOYEE");
const assignee = actor("files-assignee", "EMPLOYEE");
const observer = actor("files-observer", "EMPLOYEE");
const outsider = actor("files-other-member", "EMPLOYEE");
const actors = [superAdmin, manager, creator, assignee, observer, outsider];
const pdf = () => new TextEncoder().encode("%PDF-1.4\nFictional retained attachment\n%%EOF");
let root = "";
let storage: EvidenceStorage;
let workspaceId = "";
let boardId = "";
let clientId = "";
const service = () => new TicketFilesService(() => storage);

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "scopeis-ticket-files-it-"));
  storage = createLocalEvidenceStorage(root);
  await db.insert(users).values(actors.map(({ id, displayName, role }) => ({ id, displayName, role })));
  await db.insert(teams).values({ id: "team:ticket-files", name: "Fictional ticket files team" });
  await db.insert(employeeProfiles).values(actors.filter(({ role }) => role === "EMPLOYEE").map(({ id }) => ({ userId: id, employeeCode: `CODE-${id}`, team: "team:ticket-files" })));
  await db.insert(sessions).values(actors.map(({ id, sessionId }) => ({ id: sessionId, userId: id, tokenHash: randomUUID(), sessionVersion: 1, expiresAt: new Date(Date.now() + 3_600_000), authenticationMode: "mock" as const })));
  const [client] = await db.insert(clients).values({ companyName: "Fictional ticket file client" }).returning(); clientId = client.id;
  await db.insert(adminScopeGrants).values([{ userId: manager.id, scopeType: "TEAM", scopeReference: "team:ticket-files" }, { userId: manager.id, scopeType: "CLIENT", scopeReference: clientId }]);
  const workspace = await ticketService.command(superAdmin, { action: "createWorkspace", name: "Private file integration", clientId }); workspaceId = workspace.id;
  let version = workspace.version;
  for (const person of actors.filter(({ id }) => id !== superAdmin.id)) {
    const result = await ticketService.command(superAdmin, { action: "setWorkspaceMember", workspaceId, userId: person.id, active: true, version }); version = result.version;
  }
  const board = await ticketService.command(superAdmin, { action: "createBoard", workspaceId, name: "Published file work", status: "PUBLISHED", version }); boardId = board.id;
});

afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

async function newTicket(subject: string) {
  const board = (await ticketService.workspace(superAdmin)).boards.find(({ id }) => id === boardId)!;
  const ticket = await ticketService.command(creator, { action: "createTicket", boardId, version: board.version, subject, ticketDate: "2026-10-08", status: "OPEN", priority: "MEDIUM" });
  const participants = await ticketService.command(superAdmin, { action: "setParticipants", ticketId: ticket.id, version: ticket.version, assigneeIds: [assignee.id], observerIds: [observer.id] });
  return { id: ticket.id, version: participants.version };
}
const attach = (ticket: { id: string; version: number }, person = creator, files = service()) => files.attach(person, { ticketId: ticket.id, version: ticket.version, bytes: pdf(), contentType: "application/pdf", filename: "Private ticket evidence.pdf" });
async function ticketVersion(ticketId: string) { return (await ticketService.fileAccess(superAdmin, ticketId)).version; }

describe("Company private ticket files", () => {
  it("authorizes live participants, gives scoped management access, and withholds storage keys", async () => {
    const ticket = await newTicket("Fictional safe attachment");
    const attached = await attach(ticket);
    expect(attached.version).toBe(ticket.version + 1);
    expect(attached.file).toMatchObject({ uploaderUserId: creator.id, canArchive: true, canRestore: false, version: 1 });
    for (const person of [creator, assignee, observer, manager, superAdmin]) {
      const delivered = await service().read(person, ticket.id, attached.file.id);
      expect(delivered.bytes).toEqual(pdf());
      expect(delivered.headers["Content-Disposition"]).toMatch(/^attachment;/);
      expect(delivered.headers["Cache-Control"]).toContain("no-store");
      expect(delivered.headers["Content-Security-Policy"]).toContain("sandbox");
      expect(JSON.stringify(delivered)).not.toContain("storageKey");
    }
    const [stored] = await db.select().from(ticketFiles).where(eq(ticketFiles.id, attached.file.id));
    for (const projection of [attached, await service().list(observer, ticket.id), await ticketService.detail(observer, ticket.id)]) {
      expect(JSON.stringify(projection)).not.toContain(stored.storageKey);
      expect(JSON.stringify(projection)).not.toContain("storageKey");
    }
    await expect(service().read(outsider, ticket.id, attached.file.id)).rejects.toMatchObject({ status: 404 });
    await expect(service().read(observer, ticket.id, randomUUID())).rejects.toMatchObject({ status: 404 });
    await expect(service().read(observer, ticket.id, "../../private.pdf")).rejects.toMatchObject({ status: 404 });
    const other = await newTicket("Fictional different ticket");
    await expect(service().read(observer, other.id, attached.file.id)).rejects.toMatchObject({ status: 404 });
    const [event] = await db.select().from(auditEvents).where(and(eq(auditEvents.targetId, ticket.id), eq(auditEvents.action, "ticket.file_created")));
    expect(JSON.stringify(event.metadata)).not.toContain(stored.fileName);
    expect(JSON.stringify(event.metadata)).not.toContain(stored.storageKey);
    expect(await db.select().from(notifications).where(and(eq(notifications.recipientUserId, observer.id), eq(notifications.relatedRecordId, ticket.id), eq(notifications.eventType, "ticket.file_created")))).toHaveLength(1);
  });

  it("keeps observers read-only and restricts employee file archive to their own uploads", async () => {
    const ticket = await newTicket("Fictional retained file history");
    await expect(attach(ticket, observer)).rejects.toMatchObject({ status: 404 });
    const attached = await attach(ticket, assignee);
    const command = { ticketId: ticket.id, fileId: attached.file.id, version: attached.version, fileVersion: attached.file.version, action: "archive" };
    await expect(service().change(observer, command)).rejects.toMatchObject({ status: 404 });
    await expect(service().change(creator, command)).rejects.toMatchObject({ status: 404 });
    const archived = await service().change(manager, command);
    expect(archived.file).toMatchObject({ version: 2, canArchive: false, canRestore: true });
    expect(archived.file.archivedAt).not.toBeNull();
    await expect(service().read(assignee, ticket.id, attached.file.id)).rejects.toMatchObject({ status: 404 });
    expect((await service().list(assignee, ticket.id)).files).toHaveLength(0);
    expect((await service().list(assignee, ticket.id, { includeArchived: true })).files).toHaveLength(1);
    expect((await service().list(manager, ticket.id, { includeArchived: true })).files).toHaveLength(1);
    expect((await service().list(creator, ticket.id, { includeArchived: true })).files).toHaveLength(0);
    expect((await service().list(observer, ticket.id, { includeArchived: true })).files).toHaveLength(0);
    const [stored] = await db.select().from(ticketFiles).where(eq(ticketFiles.id, attached.file.id));
    expect(await storage.read(stored.storageKey)).toEqual(pdf());
    await expect(service().change(assignee, { ...command, version: archived.version, action: "restore" })).rejects.toMatchObject({ status: 409 });
    const restored = await service().change(assignee, { ...command, version: archived.version, fileVersion: archived.file.version, action: "restore" });
    expect(restored.file).toMatchObject({ version: 3, archivedAt: null, canArchive: true });
    expect((await service().read(observer, ticket.id, restored.file.id)).bytes).toEqual(pdf());
    expect(await db.select().from(ticketFiles).where(eq(ticketFiles.ticketId, ticket.id))).toHaveLength(1);
  });

  it("refuses stale ticket/file versions and prevents archived ticket writes", async () => {
    const ticket = await newTicket("Fictional archived parent");
    const attached = await attach(ticket);
    await expect(attach(ticket)).rejects.toMatchObject({ status: 409 });
    const archived = await ticketService.command(creator, { action: "archiveTicket", ticketId: ticket.id, version: attached.version });
    expect((await service().read(observer, ticket.id, attached.file.id)).bytes).toEqual(pdf());
    await expect(attach({ id: ticket.id, version: archived.version })).rejects.toMatchObject({ status: 404 });
    await expect(service().change(superAdmin, { ticketId: ticket.id, fileId: attached.file.id, version: archived.version, fileVersion: 1, action: "archive" })).rejects.toMatchObject({ status: 404 });
    expect((await service().list(creator, ticket.id)).files[0].canArchive).toBe(false);
  });

  it("revokes participant, supervisory scope and session access while creator access is independent of workspace enrollment", async () => {
    const ticket = await newTicket("Fictional revocable files");
    const attached = await attach(ticket);
    await ticketService.command(superAdmin, { action: "setParticipants", ticketId: ticket.id, version: attached.version, assigneeIds: [], observerIds: [] });
    await expect(service().read(assignee, ticket.id, attached.file.id)).rejects.toMatchObject({ status: 404 });
    await expect(service().read(observer, ticket.id, attached.file.id)).rejects.toMatchObject({ status: 404 });
    const [workspace] = await db.select().from(ticketWorkspaces).where(eq(ticketWorkspaces.id, workspaceId));
    const revoked = await ticketService.command(superAdmin, { action: "setWorkspaceMember", workspaceId, userId: creator.id, active: false, version: workspace.version });
    expect((await service().read(creator, ticket.id, attached.file.id)).bytes).toEqual(pdf());
    await ticketService.command(superAdmin, { action: "setWorkspaceMember", workspaceId, userId: creator.id, active: true, version: revoked.version });
    await db.update(adminScopeGrants).set({ active: false }).where(and(eq(adminScopeGrants.userId, manager.id), eq(adminScopeGrants.scopeType, "CLIENT")));
    await expect(service().read(manager, ticket.id, attached.file.id)).rejects.toMatchObject({ status: 404 });
    await db.update(adminScopeGrants).set({ active: true }).where(and(eq(adminScopeGrants.userId, manager.id), eq(adminScopeGrants.scopeType, "CLIENT")));
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, creator.sessionId));
    await expect(service().read(creator, ticket.id, attached.file.id)).rejects.toMatchObject({ status: 401 });
    await db.update(sessions).set({ revokedAt: null }).where(eq(sessions.id, creator.sessionId));
  });

  it("compensates a private upload when parent archive or participation removal wins the race", async () => {
    for (const cause of ["archive", "revoke"] as const) {
      const ticket = await newTicket(`Fictional upload ${cause} race`);
      const putKeys: string[] = [];
      const racingStorage: EvidenceStorage = {
        async put(input) {
          putKeys.push(input.storageKey); await storage.put(input);
          await ticketService.command(superAdmin, cause === "archive" ? { action: "archiveTicket", ticketId: ticket.id, version: ticket.version } : { action: "setParticipants", ticketId: ticket.id, version: ticket.version, assigneeIds: [], observerIds: [] });
        }, read: (key) => storage.read(key), remove: (key) => storage.remove(key),
      };
      await expect(attach(ticket, cause === "revoke" ? assignee : creator, new TicketFilesService(() => racingStorage))).rejects.toMatchObject({ status: 404 });
      expect(await db.select().from(ticketFiles).where(eq(ticketFiles.ticketId, ticket.id))).toHaveLength(0);
      expect(putKeys).toHaveLength(1);
      expect(await storage.read(putKeys[0])).toBeNull();
      expect(await db.select().from(auditEvents).where(and(eq(auditEvents.targetId, ticket.id), eq(auditEvents.action, "ticket.file_created")))).toHaveLength(0);
    }
  });

  it("rolls back metadata, versions and notifications when audit fails, and refuses storage failure", async () => {
    const ticket = await newTicket("Fictional atomic file write");
    const keys: string[] = [];
    const tracking: EvidenceStorage = { async put(input) { keys.push(input.storageKey); await storage.put(input); }, read: (key) => storage.read(key), remove: (key) => storage.remove(key) };
    const failing = new TicketFilesService(() => tracking, async () => { throw new Error("forced file audit failure"); });
    await expect(attach(ticket, creator, failing)).rejects.toThrow("forced file audit failure");
    expect(await ticketVersion(ticket.id)).toBe(ticket.version);
    expect(await db.select().from(ticketFiles).where(eq(ticketFiles.ticketId, ticket.id))).toHaveLength(0);
    expect(await storage.read(keys[0])).toBeNull();
    expect(await db.select().from(notifications).where(and(eq(notifications.relatedRecordId, ticket.id), eq(notifications.eventType, "ticket.file_created")))).toHaveLength(0);
    const storageFailure: EvidenceStorage = { async put() { throw new Error("forced private storage failure"); }, read: (key) => storage.read(key), remove: (key) => storage.remove(key) };
    await expect(attach(ticket, creator, new TicketFilesService(() => storageFailure))).rejects.toMatchObject({ status: 503 });
    expect(await ticketVersion(ticket.id)).toBe(ticket.version);
  });

  it("commits one simultaneous upload for a shared ticket version and removes the losing bytes", async () => {
    const ticket = await newTicket("Fictional simultaneous uploads");
    const keys: string[] = [];
    let arrivals = 0;
    let release!: () => void;
    const bothStored = new Promise<void>((resolve) => { release = resolve; });
    const simultaneous: EvidenceStorage = {
      async put(input) { keys.push(input.storageKey); await storage.put(input); if (++arrivals === 2) release(); await bothStored; },
      read: (key) => storage.read(key), remove: (key) => storage.remove(key),
    };
    const files = new TicketFilesService(() => simultaneous);
    const results = await Promise.allSettled([attach(ticket, creator, files), attach(ticket, assignee, files)]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409 });
    expect(await db.select().from(ticketFiles).where(eq(ticketFiles.ticketId, ticket.id))).toHaveLength(1);
    expect(await ticketVersion(ticket.id)).toBe(ticket.version + 1);
    expect((await Promise.all(keys.map((key) => storage.read(key)))).filter(Boolean)).toHaveLength(1);
  });
});
