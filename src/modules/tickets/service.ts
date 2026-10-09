import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { createNotification } from "@/modules/notifications/notification-service";
import { mockAuthenticationIsAllowed } from "@/server/env";
import { AppError, errors } from "@/shared/errors/app-error";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import { canManageTicketWorkspace, canReadTicket, ticketPermissions, ticketPersonInScope } from "./policy";
import { ticketRepository, type TicketExecutor, type TicketRow, type TicketSnapshot, type TicketTransaction, type WorkspaceRow } from "./repositories";
import type { TicketDetail, TicketFileAccess, TicketPermissions, TicketSummary, TicketWorkspaceData } from "./types";
import { parseTicketCommand, validateParticipantIds, validateTicketState } from "./validation";
export type { TicketDetail, TicketFileSummary, TicketSummary, TicketWorkspaceData } from "./types";
export type { TicketCommand } from "./validation";

const unavailable = () => new AppError("FORBIDDEN", "This resource is unavailable.", 404);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type TicketContext = { actor: AuthenticatedActor; ticket: TicketRow; workspace: WorkspaceRow; permissions: TicketPermissions; snapshot: TicketSnapshot; manager: boolean };
export class TicketService {
  constructor(private readonly auditWriter: typeof writeAuditEvent = writeAuditEvent, private readonly notificationWriter: typeof createNotification = createNotification) {}

  private async consistentRead<T>(read: (tx: TicketTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await db.transaction(read, { isolationLevel: "repeatable read" });
      } catch (error) {
        // SHARE locks can meet a newer committed row after the snapshot starts.
        // Restart the entire read so identity, permissions and content are fresh together.
        let cause: unknown = error;
        let serializationFailure = false;
        for (let depth = 0; depth < 4 && cause && typeof cause === "object"; depth++) {
          if ("code" in cause && cause.code === "40001") { serializationFailure = true; break; }
          cause = "cause" in cause ? cause.cause : undefined;
        }
        if (!serializationFailure) throw error;
        if (attempt === 2) throw errors.stale();
      }
    }
    throw errors.stale();
  }

  /** Every call uses current database identity. Mutation callers also hold session/user/grant locks. */
  private async currentActor(executor: TicketExecutor, supplied: AuthenticatedActor, lock = false): Promise<AuthenticatedActor> {
    if (!uuid.test(supplied.sessionId)) throw errors.unauthenticated();
    if (lock) await ticketRepository.lockActor(executor as TicketTransaction, supplied.id, supplied.sessionId);
    const user = await ticketRepository.user(executor, supplied.id);
    const session = await ticketRepository.session(executor, supplied.sessionId);
    const credential = await ticketRepository.credential(executor, supplied.id);
    const grants = await ticketRepository.grants(executor, supplied.id);
    if (!user?.active || !session || session.userId !== user.id || session.revokedAt || session.expiresAt <= new Date() || session.sessionVersion !== user.sessionVersion || supplied.sessionVersion !== user.sessionVersion || credential?.mustChangePassword || (session.authenticationMode === "mock" && !mockAuthenticationIsAllowed())) throw errors.unauthenticated();
    return { id: user.id, displayName: user.displayName, role: user.role, sessionId: session.id, sessionVersion: user.sessionVersion, authenticationMode: session.authenticationMode, scopes: grants.map((grant) => ({ type: grant.scopeType, reference: grant.scopeReference })) };
  }
  private isMember(snapshot: TicketSnapshot, workspaceId: string, userId: string) { return snapshot.memberships.some((membership) => membership.workspaceId === workspaceId && membership.userId === userId && membership.active); }
  private managesWorkspace(actor: AuthenticatedActor, workspace: WorkspaceRow, snapshot: TicketSnapshot) { return canManageTicketWorkspace(actor, workspace, this.isMember(snapshot, workspace.id, actor.id)); }
  private peopleInScope(actor: AuthenticatedActor, ids: string[], snapshot: TicketSnapshot) {
    return ids.every((id) => { const person = snapshot.people.find((entry) => entry.user.id === id); return Boolean(person && (person.user.role !== "EMPLOYEE" || ticketPersonInScope(actor, { id: person.user.id, role: person.user.role, team: person.team }))); });
  }
  private managesTicket(actor: AuthenticatedActor, ticket: TicketRow, workspace: WorkspaceRow, snapshot: TicketSnapshot) {
    if (!this.managesWorkspace(actor, workspace, snapshot)) return false;
    if (actor.role === "SUPER_ADMIN") return true;
    // A CLIENT/PROJECT grant never exposes a different TEAM's people or retained log/file facts.
    const ids = [ticket.creatorUserId, ...snapshot.participants.filter((entry) => entry.ticketId === ticket.id && entry.active).map((entry) => entry.userId), ...snapshot.workLogAuthors.filter((entry) => entry.ticketId === ticket.id).map((entry) => entry.userId), ...snapshot.fileAuthors.filter((entry) => entry.ticketId === ticket.id).flatMap((entry) => [entry.uploaderUserId, entry.ownerUserId])];
    return this.peopleInScope(actor, ids, snapshot);
  }
  private ticketContext(actor: AuthenticatedActor, ticket: TicketRow, snapshot: TicketSnapshot): TicketContext | null {
    const board = snapshot.boards.find((entry) => entry.id === ticket.boardId);
    const workspace = board && snapshot.workspaces.find((entry) => entry.id === board.workspaceId);
    if (!board || !workspace) return null;
    const manager = this.managesTicket(actor, ticket, workspace, snapshot);
    const participation = snapshot.participants.find((entry) => entry.ticketId === ticket.id && entry.userId === actor.id && entry.active)?.role ?? null;
    const policy = { manager, member: this.isMember(snapshot, workspace.id, actor.id), boardStatus: board.status, creatorUserId: ticket.creatorUserId, participation, archived: Boolean(ticket.archivedAt) };
    if (!canReadTicket(actor, policy)) return null;
    return { actor, ticket, workspace, manager, snapshot, permissions: ticketPermissions(actor, policy) };
  }
  private summary(context: TicketContext): TicketSummary {
    const { ticket, snapshot, permissions } = context;
    return { id: ticket.id, number: ticket.number, subject: ticket.subject, status: ticket.status, priority: ticket.priority, ticketDate: ticket.ticketDate, dueDate: ticket.dueDate, boardId: ticket.boardId, creatorName: snapshot.people.find((person) => person.user.id === ticket.creatorUserId)?.user.displayName ?? "Former colleague", assignees: snapshot.participants.filter((entry) => entry.ticketId === ticket.id && entry.active && entry.role === "ASSIGNEE").map((entry) => ({ userId: entry.userId, displayName: snapshot.people.find((person) => person.user.id === entry.userId)?.user.displayName ?? "Former colleague" })), version: ticket.version, archivedAt: ticket.archivedAt?.toISOString() ?? null, permissions };
  }
  async workspace(supplied: AuthenticatedActor): Promise<TicketWorkspaceData> {
    return this.consistentRead(async (tx) => {
    // Ordered SHARE locks serialize revocation; the repeatable snapshot also excludes new-container phantoms.
    await ticketRepository.lockReadSnapshot(tx);
    const actor = await this.currentActor(tx, supplied, true);
    const snapshot = await ticketRepository.snapshot(tx);
    const workspaces = snapshot.workspaces.filter((workspace) => this.managesWorkspace(actor, workspace, snapshot) || snapshot.boards.some((board) => board.workspaceId === workspace.id && board.status === "PUBLISHED")).map((workspace) => {
      const manager = this.managesWorkspace(actor, workspace, snapshot);
      return { id: workspace.id, name: workspace.name, description: manager ? workspace.description : null, clientId: manager ? workspace.clientId : null, projectId: manager ? workspace.projectId : null, version: workspace.version, canManage: manager, members: manager ? snapshot.memberships.filter((membership) => membership.workspaceId === workspace.id && membership.active).flatMap((membership) => { const person = snapshot.people.find((entry) => entry.user.id === membership.userId && entry.user.active); return person && ticketPersonInScope(actor, { id: person.user.id, role: person.user.role, team: person.team }) ? [{ userId: person.user.id, displayName: person.user.displayName, role: person.user.role }] : []; }) : [] };
    });
    const boards = snapshot.boards.filter((board) => workspaces.some((workspace) => workspace.id === board.workspaceId && (workspace.canManage || board.status === "PUBLISHED"))).map((board) => ({ id: board.id, workspaceId: board.workspaceId, name: board.name, status: board.status, version: board.version, canManage: workspaces.find((workspace) => workspace.id === board.workspaceId)!.canManage }));
    const summaries = snapshot.tickets.flatMap((ticket) => { const context = this.ticketContext(actor, ticket, snapshot); return context ? [this.summary(context)] : []; });
    // The company ticket picker exposes names and role labels only, never profile or scope facts.
    const people = snapshot.people.filter((entry) => entry.user.active).map((entry) => ({ userId: entry.user.id, displayName: entry.user.displayName, role: entry.user.role }));
    const clients = actor.role === "EMPLOYEE" ? [] : snapshot.clients.filter((client) => client.status === "ACTIVE" && (actor.role === "SUPER_ADMIN" || actor.scopes.some((grant) => grant.type === "CLIENT" && grant.reference === client.id))).map(({ id, name }) => ({ id, name }));
    const projects = actor.role === "EMPLOYEE" ? [] : snapshot.projects.filter((project) => project.status !== "ARCHIVED" && (actor.role === "SUPER_ADMIN" || actor.scopes.some((grant) => (grant.type === "PROJECT" && grant.reference === project.id) || (grant.type === "CLIENT" && grant.reference === project.clientId)))).map(({ id, name, clientId }) => ({ id, name, clientId }));
    return { workspaces, boards, tickets: summaries, people, clients, projects };
    });
  }
  async detail(supplied: AuthenticatedActor, id: string): Promise<TicketDetail> {
    if (!uuid.test(id)) throw unavailable();
    return this.consistentRead(async (tx) => {
    const context = await this.loadTicketContext(supplied, tx, id, {}, "share");
    const { actor, ticket, snapshot } = context;
    const logs = await ticketRepository.logs(tx, id);
    const files = await ticketRepository.files(tx, id);
    const ids = [{ userId: ticket!.creatorUserId, participation: "CREATOR" as const }, ...snapshot.participants.filter((entry) => entry.ticketId === id && entry.active && entry.userId !== ticket!.creatorUserId).map((entry) => ({ userId: entry.userId, participation: entry.role }))];
    return { ...this.summary(context), creatorUserId: ticket!.creatorUserId, workspaceId: context.workspace.id, summary: ticket!.summary, planning: ticket!.planning, workCompleted: ticket!.workCompleted, notes: ticket!.notes, onHoldReason: ticket!.onHoldReason, createdAt: ticket!.createdAt.toISOString(), updatedAt: ticket!.updatedAt.toISOString(), participants: ids.map((entry) => { const person = snapshot.people.find((person) => person.user.id === entry.userId)!; return { ...entry, displayName: person.user.displayName, role: person.user.role }; }), workLogs: logs.map(({ log, authorName }) => ({ id: log.id, authorUserId: log.authorUserId, authorName, description: log.description, loggedAt: log.loggedAt.toISOString(), durationMinutes: log.durationMinutes, version: log.version, canEdit: context.permissions.log && log.authorUserId === actor.id })), files: files.filter(({ file }) => !file.archivedAt).map(({ file, uploaderName }) => ({ id: file.id, ticketId: file.ticketId, fileName: file.fileName, contentType: file.contentType, byteSize: file.byteSize, uploaderUserId: file.uploaderUserId, uploaderName, version: file.version, createdAt: file.createdAt.toISOString(), archivedAt: null, canArchive: context.permissions.files && (context.manager || file.uploaderUserId === actor.id), canRestore: false })) };
    });
  }
  private async lockTicketTree(tx: TicketTransaction, id: string, mode: "share" | "update") {
    const ticket = await ticketRepository.ticket(tx, id);
    const board = ticket && await ticketRepository.board(tx, ticket.boardId);
    if (!ticket || !board) throw unavailable();
    if (mode === "share") {
      await tx.execute(sql`select id from ticket_workspaces where id = ${board.workspaceId} for share`);
      await tx.execute(sql`select id from ticket_boards where id = ${board.id} for share`);
      await tx.execute(sql`select id from tickets where id = ${ticket.id} for share`);
    } else {
      await ticketRepository.lockWorkspace(tx, board.workspaceId);
      await ticketRepository.lockBoard(tx, board.id);
      await ticketRepository.lockTicket(tx, ticket.id);
    }
  }
  private async loadTicketContext(supplied: AuthenticatedActor, tx: TicketTransaction, id: string, input: { write?: boolean; version?: number }, mode: "share" | "update"): Promise<TicketContext> {
    if (!uuid.test(id)) throw unavailable();
    await this.lockTicketTree(tx, id, mode);
    const actor = await this.currentActor(tx, supplied, true);
    await tx.execute(sql`select u.id from users u where u.id in (select creator_user_id from tickets where id = ${id} union select user_id from ticket_participants where ticket_id = ${id} and active union select author_user_id from ticket_work_logs where ticket_id = ${id} union select uploader_user_id from ticket_files where ticket_id = ${id} union select owner_user_id from ticket_files where ticket_id = ${id}) order by u.id for share`);
    await tx.execute(sql`select ep.user_id from employee_profiles ep where ep.user_id in (select creator_user_id from tickets where id = ${id} union select user_id from ticket_participants where ticket_id = ${id} and active union select author_user_id from ticket_work_logs where ticket_id = ${id} union select uploader_user_id from ticket_files where ticket_id = ${id} union select owner_user_id from ticket_files where ticket_id = ${id}) order by ep.user_id for share`);
    const snapshot = await ticketRepository.snapshot(tx);
    const ticket = snapshot.tickets.find((entry) => entry.id === id);
    const context = ticket && this.ticketContext(actor, ticket, snapshot);
    if (!context || (input.write && !context.permissions.files)) throw unavailable();
    if (input.version !== undefined && context.ticket.version !== input.version) throw errors.stale();
    return context;
  }
  async accessInTransaction(supplied: AuthenticatedActor, tx: TicketTransaction, id: string, input: { write?: boolean; version?: number } = {}): Promise<TicketFileAccess & { ticket: TicketRow }> {
    const context = await this.loadTicketContext(supplied, tx, id, input, "update");
    return { ticketId: id, ticket: context.ticket, canWrite: context.permissions.files, canManage: context.manager, version: context.ticket.version, actor: context.actor };
  }
  async fileAccess(supplied: AuthenticatedActor, id: string, input: { write?: boolean } = {}): Promise<TicketFileAccess> {
    return this.consistentRead(async (tx) => { const context = await this.loadTicketContext(supplied, tx, id, input, "share"); return { ticketId: id, canWrite: context.permissions.files, canManage: context.manager, version: context.ticket.version, actor: context.actor }; });
  }
  async notifyTicket(tx: TicketTransaction, ticket: TicketRow, actor: AuthenticatedActor, eventType: string) {
    const snapshot = await ticketRepository.snapshot(tx);
    const recipientIds = new Set([ticket.creatorUserId, ...snapshot.participants.filter((entry) => entry.ticketId === ticket.id && entry.active).map((entry) => entry.userId), ...snapshot.people.filter((entry) => entry.user.role !== "EMPLOYEE").map((entry) => entry.user.id)]);
    for (const id of recipientIds) {
      const person = snapshot.people.find((entry) => entry.user.id === id && entry.user.active);
      if (!person || id === actor.id) continue;
      const grants = await ticketRepository.grants(tx, id);
      const recipient = { ...actor, id, role: person.user.role, scopes: grants.map((grant) => ({ type: grant.scopeType, reference: grant.scopeReference })) };
      if (!this.ticketContext(recipient, ticket, snapshot)) continue;
      await this.notificationWriter(tx, { recipientUserId: id, eventType, relatedRecordType: "ticket", relatedRecordId: ticket.id });
    }
  }
  private audit(tx: TicketTransaction, actor: AuthenticatedActor, action: string, id: string, type = "ticket", metadata: Record<string, unknown> = {}) { return this.auditWriter(tx, { actor, action, targetType: type, targetId: id, metadata }); }
  private async requireWorkspace(tx: TicketTransaction, supplied: AuthenticatedActor, id: string) {
    await ticketRepository.lockWorkspace(tx, id);
    const actor = await this.currentActor(tx, supplied, true);
    const snapshot = await ticketRepository.snapshot(tx);
    const workspace = snapshot.workspaces.find((entry) => entry.id === id);
    if (!workspace || !this.managesWorkspace(actor, workspace, snapshot)) throw unavailable();
    return { actor, workspace, snapshot };
  }
  private async participants(tx: TicketTransaction, assigneeIds: string[], observerIds: string[], creatorUserId: string) {
    validateParticipantIds(assigneeIds, observerIds);
    const selectedIds = [...assigneeIds, ...observerIds];
    for (const id of [...new Set([...selectedIds, creatorUserId])].sort()) {
      await tx.execute(sql`select id from users where id = ${id} for share`);
      await tx.execute(sql`select user_id from employee_profiles where user_id = ${id} for share`);
    }
    const people = await ticketRepository.people(tx);
    for (const id of selectedIds) {
      const person = people.find((entry) => entry.user.id === id && entry.user.active);
      if (!person) throw unavailable();
    }
  }
  async command(supplied: AuthenticatedActor, input: unknown): Promise<{ id: string; version: number; workLogId?: string }> {
    const parsed = parseTicketCommand(input);
    return db.transaction(async (tx) => {
      if (parsed.action === "createWorkspace") {
        const actor = await this.currentActor(tx, supplied, true);
        if (actor.role === "EMPLOYEE") throw unavailable();
        const initial = await ticketRepository.snapshot(tx);
        const initialProject = parsed.projectId ? initial.projects.find((entry) => entry.id === parsed.projectId) : null;
        await ticketRepository.lockLinkedRecords(tx, parsed.clientId ?? initialProject?.clientId, parsed.projectId);
        const snapshot = await ticketRepository.snapshot(tx);
        const project = parsed.projectId ? snapshot.projects.find((entry) => entry.id === parsed.projectId && entry.status !== "ARCHIVED") : null;
        if (parsed.projectId && !project) throw unavailable();
        const clientId = parsed.clientId ?? project?.clientId ?? null;
        if (clientId && !snapshot.clients.some((client) => client.id === clientId && client.status === "ACTIVE")) throw unavailable();
        if (project && project.clientId !== clientId) throw errors.validation();
        if (!canManageTicketWorkspace(actor, { clientId, projectId: project?.id ?? null }, true)) throw unavailable();
        const workspace = await ticketRepository.createWorkspace(tx, { name: parsed.name, description: parsed.description, clientId, projectId: project?.id ?? null, createdByUserId: actor.id });
        await ticketRepository.setMember(tx, workspace.id, actor.id, true, actor.id);
        await this.audit(tx, actor, "ticket.workspace_created", workspace.id, "ticket_workspace", { linked: Boolean(clientId || project) });
        return { id: workspace.id, version: workspace.version };
      }
      if (parsed.action === "setWorkspaceMember" || parsed.action === "createBoard" || parsed.action === "updateWorkspace") {
        const { actor, workspace, snapshot } = await this.requireWorkspace(tx, supplied, parsed.workspaceId);
        if (workspace.version !== parsed.version) throw errors.stale();
        if (parsed.action === "updateWorkspace") {
          const updated = await ticketRepository.updateWorkspace(tx, workspace.id, parsed.version, { ...(parsed.name !== undefined ? { name: parsed.name } : {}), ...(parsed.description !== undefined ? { description: parsed.description } : {}) });
          if (!updated) throw errors.stale();
          await this.audit(tx, actor, "ticket.workspace_updated", workspace.id, "ticket_workspace", { version: updated.version });
          return { id: updated.id, version: updated.version };
        }
        if (parsed.action === "createBoard") {
          const board = await ticketRepository.createBoard(tx, { workspaceId: workspace.id, name: parsed.name, status: parsed.status, createdByUserId: actor.id });
          await ticketRepository.touchWorkspace(tx, workspace.id, workspace.version);
          await this.audit(tx, actor, "ticket.board_created", board.id, "ticket_board", { workspaceId: workspace.id, status: board.status });
          return { id: board.id, version: board.version };
        }
        await tx.execute(sql`select id from users where id = ${parsed.userId} for share`);
        await tx.execute(sql`select user_id from employee_profiles where user_id = ${parsed.userId} for share`);
        const person = (await ticketRepository.people(tx)).find((entry) => entry.user.id === parsed.userId);
        if (!person || (parsed.active && !person.user.active) || !ticketPersonInScope(actor, { id: person.user.id, role: person.user.role, team: person.team })) throw unavailable();
        if (parsed.active && person.user.role === "ADMIN") {
          await tx.execute(sql`select id from admin_scope_grants where user_id = ${person.user.id} order by id for share`);
          const grants = await ticketRepository.grants(tx, person.user.id);
          const target = { ...actor, id: person.user.id, role: person.user.role, scopes: grants.map((grant) => ({ type: grant.scopeType, reference: grant.scopeReference })) };
          // A new manager grant must be usable under the manager's own current TEAM and operational authority.
          if (!canManageTicketWorkspace(target, workspace, true)) throw unavailable();
        }
        await ticketRepository.setMember(tx, workspace.id, parsed.userId, parsed.active, actor.id);
        const updated = await ticketRepository.touchWorkspace(tx, workspace.id, parsed.version);
        if (!updated) throw errors.stale();
        await this.audit(tx, actor, parsed.active ? "ticket.member_granted" : "ticket.member_revoked", workspace.id, "ticket_workspace", { userId: parsed.userId });
        return { id: workspace.id, version: updated.version };
      }
      if (parsed.action === "updateBoard" || parsed.action === "createTicket") {
        const board = await ticketRepository.board(tx, parsed.boardId);
        if (!board) throw unavailable();
        await ticketRepository.lockWorkspace(tx, board.workspaceId);
        await ticketRepository.lockBoard(tx, board.id);
        const actor = await this.currentActor(tx, supplied, true);
        const snapshot = await ticketRepository.snapshot(tx);
        const currentBoard = snapshot.boards.find((entry) => entry.id === board.id)!;
        const workspace = snapshot.workspaces.find((entry) => entry.id === board.workspaceId)!;
        const manager = this.managesWorkspace(actor, workspace, snapshot);
        if (parsed.action === "updateBoard") {
          if (!manager) throw unavailable();
          if (currentBoard.version !== parsed.version) throw errors.stale();
          const updated = await ticketRepository.updateBoard(tx, board.id, parsed.version, { ...(parsed.name !== undefined ? { name: parsed.name } : {}), ...(parsed.status !== undefined ? { status: parsed.status } : {}) });
          if (!updated) throw errors.stale();
          await this.audit(tx, actor, "ticket.board_updated", board.id, "ticket_board", { status: updated.status });
          if (updated.status === "PUBLISHED" && currentBoard.status !== "PUBLISHED") for (const ticket of snapshot.tickets.filter((ticket) => ticket.boardId === board.id && !ticket.archivedAt)) await this.notifyTicket(tx, ticket, actor, "ticket.board_published");
          return { id: updated.id, version: updated.version };
        }
        if (currentBoard.status === "ARCHIVED" || (!manager && currentBoard.status !== "PUBLISHED")) throw unavailable();
        if (currentBoard.version !== parsed.version) throw errors.stale();
        // Creation checks the board's current configuration/publication version; independent tickets do not change that version.
        if ([...parsed.assigneeIds, ...parsed.observerIds].includes(actor.id)) throw errors.validation();
        validateTicketState(parsed);
        await this.participants(tx, parsed.assigneeIds, parsed.observerIds, actor.id);
        const { action: _action, version: _version, assigneeIds, observerIds, ...values } = parsed;
        const ticket = await ticketRepository.createTicket(tx, { ...values, creatorUserId: actor.id, onHoldReason: parsed.status === "ON_HOLD" ? parsed.onHoldReason : null });
        await ticketRepository.setParticipants(tx, ticket.id, assigneeIds, observerIds, actor.id);
        await this.audit(tx, actor, "ticket.created", ticket.id, "ticket", { boardId: board.id, status: ticket.status, participantCount: assigneeIds.length + observerIds.length });
        await this.notifyTicket(tx, ticket, actor, "ticket.created");
        return { id: ticket.id, version: ticket.version };
      }
      const access = await this.accessInTransaction(supplied, tx, parsed.ticketId, { version: parsed.version });
      const snapshot = await ticketRepository.snapshot(tx);
      const context = this.ticketContext(access.actor, access.ticket, snapshot)!;
      const { actor, ticket, permissions } = context;
      let updated: TicketRow | null = null;
      let event = "ticket.updated";
      let workLogId: string | undefined;
      if (parsed.action === "archiveTicket" || parsed.action === "restoreTicket") {
        if (parsed.action === "archiveTicket" ? !permissions.archive : !permissions.restore) throw unavailable();
        updated = await ticketRepository.updateTicket(tx, ticket.id, ticket.version, { archivedAt: parsed.action === "archiveTicket" ? new Date() : null, archivedByUserId: parsed.action === "archiveTicket" ? actor.id : null });
        event = parsed.action === "archiveTicket" ? "ticket.archived" : "ticket.restored";
      } else if (parsed.action === "setParticipants") {
        if (!permissions.managePeople) throw unavailable();
        if ([...parsed.assigneeIds, ...parsed.observerIds].includes(ticket.creatorUserId)) throw errors.validation();
        await this.participants(tx, parsed.assigneeIds, parsed.observerIds, ticket.creatorUserId);
        await ticketRepository.setParticipants(tx, ticket.id, parsed.assigneeIds, parsed.observerIds, actor.id);
        updated = await ticketRepository.updateTicket(tx, ticket.id, ticket.version, {});
        event = "ticket.participants_updated";
      } else if (parsed.action === "updateTicket") {
        if (!permissions.edit) throw unavailable();
        const { action: _action, ticketId: _ticketId, version: _version, ...values } = parsed;
        validateTicketState({ ...ticket, ...values });
        updated = await ticketRepository.updateTicket(tx, ticket.id, ticket.version, { ...values, onHoldReason: (values.status ?? ticket.status) === "ON_HOLD" ? values.onHoldReason ?? ticket.onHoldReason : null });
      } else {
        if (!permissions.log) throw unavailable();
        const values = { description: parsed.description, loggedAt: parsed.loggedAt ? new Date(parsed.loggedAt) : new Date(), durationMinutes: parsed.durationMinutes ?? null };
        if (parsed.action === "editWorkLog") {
          const log = await ticketRepository.log(tx, parsed.workLogId);
          if (!log || log.ticketId !== ticket.id || log.authorUserId !== actor.id) throw unavailable();
          if (!parsed.loggedAt) values.loggedAt = log.loggedAt;
          const edited = await ticketRepository.updateLog(tx, log.id, values);
          workLogId = edited.id; event = "ticket.work_log_updated";
        } else { const log = await ticketRepository.createLog(tx, { ...values, ticketId: ticket.id, authorUserId: actor.id }); workLogId = log.id; event = "ticket.work_log_created"; }
        updated = await ticketRepository.updateTicket(tx, ticket.id, ticket.version, {});
      }
      if (!updated) throw errors.stale();
      await this.audit(tx, actor, event, ticket.id, "ticket", { version: updated.version, ...(workLogId ? { workLogId } : {}) });
      await this.notifyTicket(tx, updated, actor, event);
      return { id: updated.id, version: updated.version, ...(workLogId ? { workLogId } : {}) };
    });
  }
}
export const ticketService = new TicketService();
