import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, auditEvents, clients, employeeProfiles, notifications, operationalNotes, projects, sessions, ticketBoards, tickets, ticketWorkspaceMembers, ticketWorkLogs, ticketWorkspaces, userCredentials, users } from "@/db/schema";
import { createSessionRecord } from "@/modules/auth/session-record";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { TicketService, ticketService } from "@/modules/tickets/service";
import { ticketRepository } from "@/modules/tickets/repositories";
import { operationalService } from "@/modules/operations/service";
import { notificationService } from "@/modules/notifications/service";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const ids = { nora: "mock-super-admin-nora", ava: "mock-admin-ava", ben: "mock-admin-ben", cora: "mock-employee-cora", dan: "mock-employee-dan" };
let actors: Record<keyof typeof ids, AuthenticatedActor>;
let clientId: string;
let projectId: string;
async function sessionActor(id: string): Promise<AuthenticatedActor> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  const grants = await db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, id), eq(adminScopeGrants.active, true)));
  const actor: AuthenticatedActor = { id, displayName: user!.displayName, role: user!.role, sessionId: "pending", sessionVersion: user!.sessionVersion, scopes: grants.map((grant) => ({ type: grant.scopeType, reference: grant.scopeReference })), authenticationMode: "mock" };
  return db.transaction(async (tx) => (await createSessionRecord(tx, actor, new Date(), 24)).actor);
}
beforeAll(async () => {
  await db.insert(employeeProfiles).values([{ userId: ids.cora, employeeCode: "TICKET-CORA", team: "team:alpha" }, { userId: ids.dan, employeeCode: "TICKET-DAN", team: "team:bravo" }]).onConflictDoNothing();
});
beforeEach(async () => {
  for (const key of Object.keys(ids) as (keyof typeof ids)[]) await db.update(users).set({ active: true, role: key === "nora" ? "SUPER_ADMIN" : key === "ava" || key === "ben" ? "ADMIN" : "EMPLOYEE" }).where(eq(users.id, ids[key]));
  await db.update(userCredentials).set({ mustChangePassword: false }).where(sql`true`);
  await db.update(employeeProfiles).set({ team: "team:alpha" }).where(eq(employeeProfiles.userId, ids.cora));
  await db.update(employeeProfiles).set({ team: "team:bravo" }).where(eq(employeeProfiles.userId, ids.dan));
  await db.update(adminScopeGrants).set({ active: true }).where(sql`true`);
  const [client] = await db.insert(clients).values({ companyName: `Fictional Ticket Client ${randomUUID()}`, serviceSummary: "MANAGEMENT SECRET" }).returning(); clientId = client!.id;
  const [project] = await db.insert(projects).values({ clientId, name: "Fictional Rack Inspection" }).returning(); projectId = project!.id;
  await db.insert(adminScopeGrants).values({ userId: ids.ava, scopeType: "CLIENT", scopeReference: clientId }).onConflictDoNothing();
  actors = {} as typeof actors;
  for (const key of Object.keys(ids) as (keyof typeof ids)[]) actors[key] = await sessionActor(ids[key]);
});
async function workspace(options: { linked?: boolean; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"; includeDan?: boolean; noMembers?: boolean } = {}) {
  const created = await ticketService.command(actors.nora, { action: "createWorkspace", name: `Fictional Company ${randomUUID()}`, ...(options.linked === false ? {} : { clientId, projectId }) });
  let version = created.version;
  for (const userId of options.noMembers ? [] : [...(options.linked === false ? [] : [ids.ava]), ids.cora, ...(options.includeDan ? [ids.dan] : [])]) version = (await ticketService.command(actors.nora, { action: "setWorkspaceMember", workspaceId: created.id, userId, active: true, version })).version;
  const board = await ticketService.command(actors.nora, { action: "createBoard", workspaceId: created.id, name: "Fictional Operations", status: options.status ?? "PUBLISHED", version });
  return { workspaceId: created.id, boardId: board.id, boardVersion: board.version };
}
async function create(boardId: string, version: number, actor = actors.nora, extra: Record<string, unknown> = {}) { return ticketService.command(actor, { action: "createTicket", boardId, version, subject: "Fictional inspection", ticketDate: "2026-10-08", ...extra }); }
async function countAudit(id: string) { return (await db.select().from(auditEvents).where(and(eq(auditEvents.targetType, "ticket"), eq(auditEvents.targetId, id)))).length; }

describe("Company tickets PostgreSQL access boundaries", () => {
  it("lets every company role create in published dashboards and shares only explicit tickets without enrollment", async () => {
    const space = await workspace({ noMembers: true });
    await ticketService.command(actors.nora, { action: "updateWorkspace", workspaceId: space.workspaceId, version: 2, description: "WORKSPACE PRIVATE DESCRIPTION" });
    const initial = await ticketService.workspace(actors.dan);
    expect(initial.workspaces.find((entry) => entry.id === space.workspaceId)).toMatchObject({ name: expect.any(String), description: null, clientId: null, projectId: null, members: [], canManage: false });
    expect(initial.boards.find((entry) => entry.id === space.boardId)?.status).toBe("PUBLISHED");
    const ownTickets: { id: string; version: number }[] = [];
    for (const actor of Object.values(actors)) ownTickets.push(await create(space.boardId, space.boardVersion, actor, { subject: `Fictional own ticket ${actor.id}` }));
    const ticket = await create(space.boardId, space.boardVersion, actors.cora, { assigneeIds: [ids.dan, ids.ben], observerIds: [ids.ava] });
    for (const key of ["dan", "ben"] as const) expect((await ticketService.detail(actors[key], ticket.id)).permissions).toMatchObject({ edit: true, log: true, files: true, managePeople: false, archive: false });
    expect((await ticketService.detail(actors.ava, ticket.id)).permissions).toMatchObject({ edit: false, log: false, files: false, managePeople: false });
    const listing = await ticketService.workspace(actors.dan);
    expect(listing.tickets.filter((entry) => entry.boardId === space.boardId).map((entry) => entry.id).sort()).toEqual([ownTickets[4]!.id, ticket.id].sort());
    await expect(ticketService.detail(actors.dan, ownTickets[3]!.id)).rejects.toMatchObject({ status: 404 });
    const memberships = await db.select().from(ticketWorkspaceMembers).where(eq(ticketWorkspaceMembers.workspaceId, space.workspaceId));
    expect(memberships.map((entry) => entry.userId)).toEqual([ids.nora]);
    expect((await ticketService.workspace(actors.ben)).workspaces.find((entry) => entry.id === space.workspaceId)?.canManage).toBe(false);
    await expect(operationalService.getClientDetail(actors.ben, clientId)).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });
    await expect(operationalService.getClientDetail(actors.dan, clientId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const notices = await db.select().from(notifications).where(and(eq(notifications.relatedRecordId, ticket.id), eq(notifications.eventType, "ticket.created")));
    for (const id of [ids.dan, ids.ben, ids.ava]) expect(notices.some((notice) => notice.recipientUserId === id)).toBe(true);
    const mentionedNotice = notices.find((notice) => notice.recipientUserId === ids.ava)!;
    expect((await notificationService.inbox(actors.ava)).items.find((item) => item.id === mentionedNotice.id)?.href).toBe(`/tickets/${ticket.id}`);
    await expect(ticketService.command(actors.dan, { action: "setParticipants", ticketId: ticket.id, version: ticket.version, assigneeIds: [], observerIds: [] })).rejects.toMatchObject({ status: 404 });
    const updated = await ticketService.command(actors.cora, { action: "setParticipants", ticketId: ticket.id, version: ticket.version, assigneeIds: [ids.dan], observerIds: [ids.ben] });
    await expect(ticketService.detail(actors.ava, ticket.id)).rejects.toMatchObject({ status: 404 });
    expect((await notificationService.inbox(actors.ava)).items.find((item) => item.id === mentionedNotice.id)?.href).toBeNull();
    expect((await ticketService.detail(actors.ben, ticket.id)).permissions.edit).toBe(false);
    await expect(ticketService.command(actors.cora, { action: "setParticipants", ticketId: ticket.id, version: ticket.version, assigneeIds: [ids.ava], observerIds: [] })).rejects.toMatchObject({ status: 409 });
    expect((await ticketService.detail(actors.cora, ticket.id)).version).toBe(updated.version);
  });
  it("preserves multiple dashboards and tickets and validates every selected active person under the creation transaction", async () => {
    const space = await workspace({ linked: false, noMembers: true });
    const workspaceVersion = (await ticketService.workspace(actors.nora)).workspaces.find((entry) => entry.id === space.workspaceId)!.version;
    const second = await ticketService.command(actors.nora, { action: "createBoard", workspaceId: space.workspaceId, name: "Fictional second dashboard", status: "PUBLISHED", version: workspaceVersion });
    const firstTicket = await create(space.boardId, space.boardVersion, actors.cora, { assigneeIds: [ids.dan], observerIds: [ids.ben] });
    const secondTicket = await create(space.boardId, space.boardVersion, actors.cora);
    const otherDashboardTicket = await create(second.id, second.version, actors.dan, { observerIds: [ids.cora] });
    const listing = await ticketService.workspace(actors.cora);
    expect(listing.boards.filter((entry) => entry.workspaceId === space.workspaceId)).toHaveLength(2);
    expect(listing.tickets.filter((entry) => entry.boardId === space.boardId).map((entry) => entry.id).sort()).toEqual([firstTicket.id, secondTicket.id].sort());
    expect(listing.tickets.some((entry) => entry.id === otherDashboardTicket.id && entry.boardId === second.id)).toBe(true);
    const count = (await db.select().from(tickets).where(eq(tickets.boardId, space.boardId))).length;
    await db.update(users).set({ active: false }).where(eq(users.id, ids.dan));
    await expect(create(space.boardId, space.boardVersion, actors.cora, { assigneeIds: [ids.dan], observerIds: [ids.ben] })).rejects.toMatchObject({ status: 404 });
    await expect(create(space.boardId, space.boardVersion, actors.cora, { assigneeIds: ["deleted-company-user"] })).rejects.toMatchObject({ status: 404 });
    await expect(create(space.boardId, space.boardVersion, actors.cora, { assigneeIds: [ids.cora] })).rejects.toMatchObject({ status: 400 });
    await expect(create(space.boardId, space.boardVersion, actors.cora, { assigneeIds: [ids.ben], observerIds: [ids.ben] })).rejects.toMatchObject({ status: 400 });
    expect((await db.select().from(tickets).where(eq(tickets.boardId, space.boardId))).length).toBe(count);
    expect((await ticketService.workspace(actors.cora)).people.some((person) => person.userId === ids.dan)).toBe(false);
    const draft = await workspace({ status: "DRAFT", noMembers: true });
    const archived = await workspace({ status: "ARCHIVED", noMembers: true });
    for (const board of [draft, archived]) {
      await expect(create(board.boardId, board.boardVersion, actors.cora)).rejects.toMatchObject({ status: 404 });
      expect((await ticketService.workspace(actors.cora)).boards.some((entry) => entry.id === board.boardId)).toBe(false);
    }
  });
  it.each(["workspace", "detail", "fileAccess"] as const)("restarts the whole %s read after a real PostgreSQL snapshot/SHARE-lock conflict", async (mode) => {
    const space = await workspace();
    const ticket = await create(space.boardId, space.boardVersion, actors.cora);
    let signal!: () => void; const reached = new Promise<void>((resolve) => { signal = resolve; });
    let release!: () => void; const barrier = new Promise<void>((resolve) => { release = resolve; });
    const originalSnapshotLock = ticketRepository.lockReadSnapshot;
    const originalTicket = ticketRepository.ticket;
    const spy = mode === "workspace"
      ? vi.spyOn(ticketRepository, "lockReadSnapshot").mockImplementationOnce(async (tx) => {
        await tx.execute(sql`select id from ticket_workspaces where id = ${space.workspaceId}`);
        signal(); await barrier; return originalSnapshotLock.call(ticketRepository, tx);
      })
      : vi.spyOn(ticketRepository, "ticket").mockImplementationOnce(async (executor, id) => {
        const row = await originalTicket.call(ticketRepository, executor, id);
        signal(); await barrier; return row;
      });
    try {
      const read = mode === "workspace" ? ticketService.workspace(actors.cora) : mode === "detail" ? ticketService.detail(actors.cora, ticket.id) : ticketService.fileAccess(actors.cora, ticket.id);
      await reached;
      // Commit on another connection after the reader's repeatable snapshot, before its SHARE lock.
      if (mode === "workspace") await db.update(ticketWorkspaces).set({ name: "Fictional concurrent correction", version: sql`${ticketWorkspaces.version} + 1` }).where(eq(ticketWorkspaces.id, space.workspaceId));
      else await db.update(tickets).set({ status: "IN_PROGRESS", version: ticket.version + 1 }).where(eq(tickets.id, ticket.id));
      release();
      const result = await read;
      expect(spy).toHaveBeenCalledTimes(2);
      if ("workspaces" in result) expect(result.workspaces.find((entry) => entry.id === space.workspaceId)?.name).toBe("Fictional concurrent correction");
      else { expect(result.version).toBe(ticket.version + 1); if ("status" in result) expect(result.status).toBe("IN_PROGRESS"); }
    } finally { release(); spy.mockRestore(); }
  });
  it("rechecks revoked participation when a conflicted read restarts", async () => {
    const space = await workspace();
    const ticket = await create(space.boardId, space.boardVersion, actors.nora, { assigneeIds: [ids.cora] });
    let signal!: () => void; const reached = new Promise<void>((resolve) => { signal = resolve; });
    let release!: () => void; const barrier = new Promise<void>((resolve) => { release = resolve; });
    const original = ticketRepository.ticket;
    const spy = vi.spyOn(ticketRepository, "ticket").mockImplementationOnce(async (executor, id) => { const row = await original.call(ticketRepository, executor, id); signal(); await barrier; return row; });
    try {
      const read = ticketService.detail(actors.cora, ticket.id);
      const rejection = expect(read).rejects.toMatchObject({ status: 404 });
      await reached;
      await ticketService.command(actors.nora, { action: "setParticipants", ticketId: ticket.id, version: ticket.version, assigneeIds: [], observerIds: [] });
      release(); await rejection;
      expect(spy).toHaveBeenCalledTimes(3); // First snapshot, command lookup, fresh unauthorized snapshot.
    } finally { release(); spy.mockRestore(); }
  });
  it("bounds serialization retries and propagates other failures without retrying", async () => {
    const conflict = new Error("Fictional wrapped query failure", { cause: Object.assign(new Error("Fictional serialization failure"), { code: "40001" }) });
    const spy = vi.spyOn(ticketRepository, "lockReadSnapshot").mockRejectedValue(conflict);
    try {
      await expect(ticketService.workspace(actors.cora)).rejects.toMatchObject({ status: 409, code: "STALE_UPDATE" });
      expect(spy).toHaveBeenCalledTimes(3);
      spy.mockClear();
      const infrastructure = Object.assign(new Error("Fictional connection failure"), { code: "08006" });
      spy.mockRejectedValue(infrastructure);
      await expect(ticketService.workspace(actors.cora)).rejects.toBe(infrastructure);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally { spy.mockRestore(); }
  });
  it("permits scoped workspace corrections, refuses stale and unauthorized changes, and rolls back a failed audit", async () => {
    const space = await workspace();
    const current = (await ticketService.workspace(actors.nora)).workspaces.find((entry) => entry.id === space.workspaceId)!;
    const input = { action: "updateWorkspace", workspaceId: space.workspaceId, version: current.version, name: "Fictional Support", description: "Fictional corrected description" };
    await expect(ticketService.command(actors.cora, input)).rejects.toMatchObject({ status: 404 });
    await expect(ticketService.command(actors.ben, input)).rejects.toMatchObject({ status: 404 });
    const updated = await ticketService.command(actors.ava, input);
    expect(updated.version).toBe(current.version + 1);
    await expect(ticketService.command(actors.nora, input)).rejects.toMatchObject({ status: 409 });
    const failed = new TicketService(async () => { throw new Error("Fictional audit failure"); });
    await expect(failed.command(actors.nora, { ...input, version: updated.version, name: "Must roll back" })).rejects.toThrow("Fictional audit failure");
    const retained = (await ticketService.workspace(actors.nora)).workspaces.find((entry) => entry.id === space.workspaceId)!;
    expect(retained).toMatchObject({ name: "Fictional Support", description: "Fictional corrected description", version: updated.version, clientId, projectId });
    const audit = await db.select().from(auditEvents).where(and(eq(auditEvents.targetId, space.workspaceId), eq(auditEvents.action, "ticket.workspace_updated")));
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit[0]!.metadata)).not.toContain("Fictional corrected");
  });
  it("keeps manager access current and Employees on published explicit work with private projections", async () => {
    const space = await workspace();
    const ticket = await create(space.boardId, space.boardVersion, actors.nora, { assigneeIds: [ids.cora] });
    await db.insert(operationalNotes).values({ clientId, authorUserId: ids.nora, content: "PRIVATE CLIENT NOTE" });
    const admin = await ticketService.detail(actors.ava, ticket.id);
    expect(admin.permissions).toMatchObject({ edit: true, managePeople: true });
    const employee = await ticketService.workspace(actors.cora);
    expect(employee.tickets.some((entry) => entry.id === ticket.id)).toBe(true);
    expect(employee.people.map((person) => person.userId).sort()).toEqual(Object.values(ids).sort());
    expect(employee.people.every((person) => Object.keys(person).sort().join(",") === "displayName,role,userId")).toBe(true);
    expect(employee.clients).toEqual([]); expect(employee.projects).toEqual([]);
    expect(employee.workspaces.find((entry) => entry.id === space.workspaceId)).toMatchObject({ clientId: null, projectId: null, members: [], canManage: false });
    expect(JSON.stringify(employee)).not.toContain("MANAGEMENT SECRET"); expect(JSON.stringify(employee)).not.toContain("PRIVATE CLIENT NOTE");
    await expect(ticketService.detail(actors.dan, ticket.id)).rejects.toMatchObject({ status: 404 });
    await expect(ticketService.detail(actors.ben, ticket.id)).rejects.toMatchObject({ status: 404 });
    const draft = await workspace({ status: "DRAFT" });
    const unpublished = await create(draft.boardId, draft.boardVersion, actors.nora, { assigneeIds: [ids.cora] });
    await expect(ticketService.detail(actors.cora, unpublished.id)).rejects.toMatchObject({ status: 404 });
    await expect(create(draft.boardId, draft.boardVersion, actors.cora)).rejects.toMatchObject({ status: 404 });
  });
  it("keeps container supervision scoped while explicit tickets can cross all company roles and teams", async () => {
    await expect(ticketService.command(actors.ava, { action: "createWorkspace", name: "Fictional unlinked" })).rejects.toMatchObject({ status: 404 });
    await expect(ticketService.command(actors.cora, { action: "createWorkspace", name: "Fictional Employee container", clientId })).rejects.toMatchObject({ status: 404 });
    const unlinked = await workspace({ linked: false });
    const ownUnlinked = await create(unlinked.boardId, unlinked.boardVersion, actors.ava);
    expect((await ticketService.detail(actors.ava, ownUnlinked.id)).permissions).toMatchObject({ edit: true, managePeople: true });
    const unlinkedVersion = (await ticketService.workspace(actors.nora)).workspaces.find((entry) => entry.id === unlinked.workspaceId)!.version;
    await expect(ticketService.command(actors.nora, { action: "setWorkspaceMember", workspaceId: unlinked.workspaceId, userId: ids.ava, active: true, version: unlinkedVersion })).rejects.toMatchObject({ status: 404 });
    const created = await ticketService.command(actors.ava, { action: "createWorkspace", name: "Fictional scoped", clientId, projectId });
    await expect(ticketService.command(actors.ava, { action: "setWorkspaceMember", workspaceId: created.id, userId: ids.dan, active: true, version: created.version })).rejects.toMatchObject({ status: 404 });
    const member = await ticketService.command(actors.ava, { action: "setWorkspaceMember", workspaceId: created.id, userId: ids.cora, active: true, version: created.version });
    expect(member.version).toBe(2);
    await expect(ticketService.command(actors.ava, { action: "createBoard", workspaceId: created.id, name: "Fictional stale board", version: 1 })).rejects.toMatchObject({ status: 409 });
    const board = await ticketService.command(actors.ava, { action: "createBoard", workspaceId: created.id, name: "Fictional scoped board", status: "PUBLISHED", version: member.version });
    const assignedBravo = await create(board.id, board.version, actors.ava, { assigneeIds: [ids.dan] });
    expect((await ticketService.detail(actors.dan, assignedBravo.id)).permissions).toMatchObject({ edit: true, managePeople: false });
    const mixed = await workspace({ includeDan: true });
    const sharedAdmin = await create(mixed.boardId, mixed.boardVersion, actors.nora, { assigneeIds: [ids.ava, ids.dan] });
    expect((await ticketService.detail(actors.ava, sharedAdmin.id)).permissions).toMatchObject({ edit: true, managePeople: false });
    const managerAssigned = await create(mixed.boardId, mixed.boardVersion, actors.nora, { assigneeIds: [ids.ava, ids.cora] });
    expect((await ticketService.detail(actors.ava, managerAssigned.id)).permissions.edit).toBe(true);
    const crossTeam = await create(mixed.boardId, mixed.boardVersion, actors.nora, { assigneeIds: [ids.cora, ids.dan] });
    await expect(ticketService.detail(actors.ava, crossTeam.id)).rejects.toMatchObject({ status: 404 });
  });
  it("allows creator grants across teams while assignees work and mentioned people remain read-only", async () => {
    const space = await workspace({ includeDan: true });
    const owned = await create(space.boardId, space.boardVersion, actors.cora, { assigneeIds: [ids.dan], observerIds: [ids.ben] });
    const closed = await ticketService.command(actors.cora, { action: "updateTicket", ticketId: owned.id, version: owned.version, status: "CLOSED", workCompleted: "Fictional work completed" });
    expect((await ticketService.detail(actors.cora, owned.id)).status).toBe("CLOSED");
    await ticketService.command(actors.cora, { action: "setParticipants", ticketId: owned.id, version: closed.version, assigneeIds: [ids.dan], observerIds: [ids.ava, ids.ben] });
    const observed = await create(space.boardId, space.boardVersion, actors.nora, { assigneeIds: [ids.cora], observerIds: [ids.dan] });
    expect((await ticketService.detail(actors.dan, observed.id)).permissions).toMatchObject({ edit: false, log: false, files: false, archive: false });
    await expect(ticketService.command(actors.dan, { action: "updateTicket", ticketId: observed.id, version: observed.version, status: "CLOSED" })).rejects.toMatchObject({ status: 404 });
    await expect(ticketService.command(actors.dan, { action: "addWorkLog", ticketId: observed.id, version: observed.version, description: "Fictional observer change" })).rejects.toMatchObject({ status: 404 });
    await expect(ticketService.fileAccess(actors.dan, observed.id, { write: true })).rejects.toMatchObject({ status: 404 });
    const changed = await ticketService.command(actors.cora, { action: "updateTicket", ticketId: observed.id, version: observed.version, status: "IN_PROGRESS" });
    const granted = await ticketService.command(actors.nora, { action: "setParticipants", ticketId: observed.id, version: changed.version, assigneeIds: [ids.cora, ids.dan], observerIds: [] });
    await ticketService.command(actors.dan, { action: "updateTicket", ticketId: observed.id, version: granted.version, status: "CLOSED" });
  });
  it("rechecks board versions, lifecycle and required hold reasons on every transition", async () => {
    const space = await workspace(); const ticket = await create(space.boardId, space.boardVersion, actors.cora);
    await expect(ticketService.command(actors.cora, { action: "updateTicket", ticketId: ticket.id, version: ticket.version, status: "ON_HOLD" })).rejects.toMatchObject({ status: 400 });
    const held = await ticketService.command(actors.cora, { action: "updateTicket", ticketId: ticket.id, version: ticket.version, status: "ON_HOLD", onHoldReason: "Fictional awaiting spare" });
    await expect(ticketService.command(actors.cora, { action: "updateTicket", ticketId: ticket.id, version: held.version, onHoldReason: "" })).rejects.toMatchObject({ status: 400 });
    const reopened = await ticketService.command(actors.cora, { action: "updateTicket", ticketId: ticket.id, version: held.version, status: "OPEN" });
    expect((await ticketService.detail(actors.cora, ticket.id)).onHoldReason).toBeNull();
    const board = await ticketService.command(actors.nora, { action: "updateBoard", boardId: space.boardId, version: space.boardVersion, status: "DRAFT" });
    await expect(ticketService.detail(actors.cora, ticket.id)).rejects.toMatchObject({ status: 404 });
    await expect(create(space.boardId, space.boardVersion)).rejects.toMatchObject({ status: 409 });
    const published = await ticketService.command(actors.ava, { action: "updateBoard", boardId: space.boardId, version: board.version, status: "PUBLISHED" });
    expect((await ticketService.detail(actors.cora, ticket.id)).version).toBe(reopened.version);
    await ticketService.command(actors.nora, { action: "updateBoard", boardId: space.boardId, version: published.version, status: "ARCHIVED" });
    await expect(create(space.boardId, published.version + 1)).rejects.toMatchObject({ status: 404 });
  });
  it("keeps explicit sharing independent of membership while participation and supervisory scopes revoke immediately", async () => {
    const space = await workspace(); const ticket = await create(space.boardId, space.boardVersion, actors.nora, { assigneeIds: [ids.cora] });
    let version = (await ticketService.workspace(actors.nora)).workspaces.find((entry) => entry.id === space.workspaceId)!.version;
    version = (await ticketService.command(actors.nora, { action: "setWorkspaceMember", workspaceId: space.workspaceId, userId: ids.cora, active: false, version })).version;
    expect((await ticketService.detail(actors.cora, ticket.id)).permissions.edit).toBe(true);
    await ticketService.command(actors.nora, { action: "setWorkspaceMember", workspaceId: space.workspaceId, userId: ids.cora, active: true, version });
    const revoked = await ticketService.command(actors.nora, { action: "setParticipants", ticketId: ticket.id, version: ticket.version, assigneeIds: [], observerIds: [] });
    await expect(ticketService.detail(actors.cora, ticket.id)).rejects.toMatchObject({ status: 404 });
    await ticketService.command(actors.nora, { action: "setParticipants", ticketId: ticket.id, version: revoked.version, assigneeIds: [ids.cora], observerIds: [] });
    await db.update(adminScopeGrants).set({ active: false }).where(and(eq(adminScopeGrants.userId, ids.ava), eq(adminScopeGrants.scopeType, "CLIENT"), eq(adminScopeGrants.scopeReference, clientId)));
    await expect(ticketService.detail(actors.ava, ticket.id)).rejects.toMatchObject({ status: 404 });
    await db.update(adminScopeGrants).set({ active: true }).where(and(eq(adminScopeGrants.userId, ids.ava), eq(adminScopeGrants.scopeType, "CLIENT"), eq(adminScopeGrants.scopeReference, clientId)));
    await db.update(adminScopeGrants).set({ active: false }).where(and(eq(adminScopeGrants.userId, ids.ava), eq(adminScopeGrants.scopeType, "TEAM")));
    await expect(ticketService.detail(actors.ava, ticket.id)).rejects.toMatchObject({ status: 404 });
  });
  it("refuses stale or revoked sessions, deactivated users and stale elevated roles", async () => {
    const space = await workspace(); const ticket = await create(space.boardId, space.boardVersion, actors.cora);
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, actors.cora.sessionId));
    await expect(ticketService.detail(actors.cora, ticket.id)).rejects.toMatchObject({ status: 401 });
    actors.cora = await sessionActor(ids.cora);
    await db.update(users).set({ active: false }).where(eq(users.id, ids.cora));
    await expect(ticketService.command(actors.cora, { action: "updateTicket", ticketId: ticket.id, version: ticket.version, status: "CLOSED" })).rejects.toMatchObject({ status: 401 });
    await db.update(users).set({ active: true }).where(eq(users.id, ids.cora));
    await db.update(userCredentials).set({ mustChangePassword: true }).where(eq(userCredentials.userId, ids.cora));
    await expect(ticketService.workspace(actors.cora)).rejects.toMatchObject({ status: 401 });
    await db.update(userCredentials).set({ mustChangePassword: false }).where(eq(userCredentials.userId, ids.cora));
    await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, ids.cora));
    await expect(ticketService.workspace(actors.cora)).rejects.toMatchObject({ status: 401 });
    actors.cora = await sessionActor(ids.cora);
    await db.update(sessions).set({ expiresAt: new Date(0) }).where(eq(sessions.id, actors.cora.sessionId));
    await expect(ticketService.workspace(actors.cora)).rejects.toMatchObject({ status: 401 });
    await db.update(users).set({ role: "EMPLOYEE" }).where(eq(users.id, ids.nora));
    await expect(ticketService.command(actors.nora, { action: "createWorkspace", name: "Fictional stale elevated role" })).rejects.toMatchObject({ status: 404 });
  });
  it("preserves TEAM boundaries for retained work after a cross-team participant is revoked", async () => {
    const space = await workspace({ includeDan: true });
    const ticket = await create(space.boardId, space.boardVersion, actors.nora, { assigneeIds: [ids.cora, ids.dan] });
    const logged = await ticketService.command(actors.dan, { action: "addWorkLog", ticketId: ticket.id, version: ticket.version, description: "Fictional Bravo retained work" });
    await ticketService.command(actors.nora, { action: "setParticipants", ticketId: ticket.id, version: logged.version, assigneeIds: [ids.cora], observerIds: [] });
    await expect(ticketService.detail(actors.ava, ticket.id)).rejects.toMatchObject({ status: 404 });
    expect((await ticketService.workspace(actors.ava)).tickets.some((entry) => entry.id === ticket.id)).toBe(false);
    expect((await ticketService.detail(actors.nora, ticket.id)).workLogs[0]?.description).toBe("Fictional Bravo retained work");
  });
  it("serializes current grant/activity revocation with list and detail projection reads", async () => {
    const space = await workspace(); const ticket = await create(space.boardId, space.boardVersion, actors.nora, { assigneeIds: [ids.cora] });
    for (const mode of ["workspace", "detail"] as const) {
      let signal!: () => void; const reached = new Promise<void>((resolve) => { signal = resolve; });
      let release!: () => void; const barrier = new Promise<void>((resolve) => { release = resolve; });
      const original = ticketRepository.snapshot;
      const spy = vi.spyOn(ticketRepository, "snapshot").mockImplementationOnce(async function (executor) { signal(); await barrier; return original.call(ticketRepository, executor); });
      try {
        const read = mode === "workspace" ? ticketService.workspace(actors.ava) : ticketService.detail(actors.cora, ticket.id);
        await reached;
        let revoked = false;
        const revocation = (mode === "workspace"
          ? db.update(adminScopeGrants).set({ active: false }).where(and(eq(adminScopeGrants.userId, ids.ava), eq(adminScopeGrants.scopeType, "CLIENT"), eq(adminScopeGrants.scopeReference, clientId)))
          : db.update(users).set({ active: false }).where(eq(users.id, ids.cora))).then(() => { revoked = true; });
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(revoked).toBe(false);
        release(); await read; await revocation;
        if (mode === "workspace") expect((await ticketService.workspace(actors.ava)).tickets.some((entry) => entry.id === ticket.id)).toBe(false);
        else await expect(ticketService.detail(actors.cora, ticket.id)).rejects.toMatchObject({ status: 401 });
      } finally { release(); spy.mockRestore(); }
    }
  });
  it("uses retained archives, restores creator access and limits work-log edits to authors", async () => {
    const space = await workspace(); const ticket = await create(space.boardId, space.boardVersion, actors.cora);
    const first = await ticketService.command(actors.cora, { action: "addWorkLog", ticketId: ticket.id, version: ticket.version, description: "Fictional owner work", durationMinutes: 45 });
    await expect(ticketService.command(actors.nora, { action: "editWorkLog", ticketId: ticket.id, workLogId: first.workLogId, version: first.version, description: "Fictional forged log" })).rejects.toMatchObject({ status: 404 });
    const edited = await ticketService.command(actors.cora, { action: "editWorkLog", ticketId: ticket.id, workLogId: first.workLogId, version: first.version, description: "Fictional owner correction", durationMinutes: 30 });
    const archived = await ticketService.command(actors.cora, { action: "archiveTicket", ticketId: ticket.id, version: edited.version });
    expect((await ticketService.detail(actors.cora, ticket.id)).permissions).toMatchObject({ edit: false, restore: true });
    await expect(ticketService.command(actors.cora, { action: "addWorkLog", ticketId: ticket.id, version: archived.version, description: "Fictional archived edit" })).rejects.toMatchObject({ status: 404 });
    const restored = await ticketService.command(actors.cora, { action: "restoreTicket", ticketId: ticket.id, version: archived.version });
    expect((await ticketService.detail(actors.cora, ticket.id)).workLogs).toHaveLength(1);
    expect(restored.version).toBe(archived.version + 1);
    expect(await db.select().from(tickets).where(eq(tickets.id, ticket.id))).toHaveLength(1);
  });
  it("serializes competing edits and commits primary state, audit and notifications atomically", async () => {
    const space = await workspace(); const ticket = await create(space.boardId, space.boardVersion, actors.cora);
    const beforeAudit = await countAudit(ticket.id);
    const competing = await Promise.allSettled([ticketService.command(actors.cora, { action: "updateTicket", ticketId: ticket.id, version: ticket.version, subject: "Fictional first edit" }), ticketService.command(actors.ava, { action: "updateTicket", ticketId: ticket.id, version: ticket.version, subject: "Fictional second edit" })]);
    expect(competing.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    const rejected = competing.find((entry) => entry.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409 });
    expect(await countAudit(ticket.id)).toBe(beforeAudit + 1);
    const current = await ticketService.detail(actors.cora, ticket.id);
    const faultAudit = new TicketService(async () => { throw new Error("Fictional audit failure"); });
    await expect(faultAudit.command(actors.cora, { action: "addWorkLog", ticketId: ticket.id, version: current.version, description: "ROLLBACK LOG SECRET" })).rejects.toThrow("Fictional audit failure");
    expect((await ticketService.detail(actors.cora, ticket.id)).version).toBe(current.version);
    expect(await db.select().from(ticketWorkLogs).where(eq(ticketWorkLogs.ticketId, ticket.id))).toHaveLength(0);
    const beforeNotifications = (await db.select().from(notifications).where(eq(notifications.relatedRecordId, ticket.id))).length;
    const faultNotification = new TicketService(writeAuditEvent, async () => { throw new Error("Fictional notification failure"); });
    await expect(faultNotification.command(actors.cora, { action: "updateTicket", ticketId: ticket.id, version: current.version, notes: "ROLLBACK NOTE SECRET" })).rejects.toThrow("Fictional notification failure");
    expect((await ticketService.detail(actors.cora, ticket.id)).version).toBe(current.version);
    expect(await countAudit(ticket.id)).toBe(beforeAudit + 1);
    expect((await db.select().from(notifications).where(eq(notifications.relatedRecordId, ticket.id))).length).toBe(beforeNotifications);
    const auditMetadata = JSON.stringify(await db.select({ metadata: auditEvents.metadata }).from(auditEvents).where(eq(auditEvents.targetId, ticket.id)));
    expect(auditMetadata).not.toContain("ROLLBACK LOG SECRET"); expect(auditMetadata).not.toContain("ROLLBACK NOTE SECRET"); expect(auditMetadata).not.toContain("Fictional inspection");
  });
  it("handles membership/board changes under shared parent locks without changing schedules or leave", async () => {
    const space = await workspace(); const ticket = await create(space.boardId, space.boardVersion, actors.cora);
    const workforceBefore = await db.execute(sql`select (select count(*) from schedule_assignments)::int as assignments, (select count(*) from leave_requests)::int as leave`);
    const held = await ticketService.command(actors.cora, { action: "updateTicket", ticketId: ticket.id, version: ticket.version, status: "ON_HOLD", onHoldReason: "Fictional hold" });
    await ticketService.command(actors.cora, { action: "archiveTicket", ticketId: ticket.id, version: held.version });
    const workforceAfter = await db.execute(sql`select (select count(*) from schedule_assignments)::int as assignments, (select count(*) from leave_requests)::int as leave`);
    expect(workforceAfter.rows).toEqual(workforceBefore.rows);
    const version = (await ticketService.workspace(actors.nora)).workspaces.find((entry) => entry.id === space.workspaceId)!.version;
    const results = await Promise.allSettled([ticketService.command(actors.nora, { action: "setWorkspaceMember", workspaceId: space.workspaceId, userId: ids.cora, active: false, version }), ticketService.command(actors.nora, { action: "createBoard", workspaceId: space.workspaceId, name: "Fictional competing board", version })]);
    expect(results.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    expect((results.find((entry) => entry.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ status: 409 });
    expect(await db.select().from(ticketWorkspaceMembers).where(eq(ticketWorkspaceMembers.workspaceId, space.workspaceId))).toHaveLength(3);
    expect(await db.select().from(ticketBoards).where(eq(ticketBoards.workspaceId, space.workspaceId))).toHaveLength(results[1]!.status === "fulfilled" ? 2 : 1);
  });
});
