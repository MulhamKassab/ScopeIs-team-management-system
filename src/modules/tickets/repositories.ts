import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { adminScopeGrants, clients, employeeProfiles, projects, sessions, ticketBoards, ticketFiles, ticketParticipants, tickets, ticketWorkLogs, ticketWorkspaceMembers, ticketWorkspaces, userCredentials, users } from "@/db/schema";
export type TicketTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type TicketExecutor = typeof db | TicketTransaction;
export type TicketRow = typeof tickets.$inferSelect;
export type WorkspaceRow = typeof ticketWorkspaces.$inferSelect;
export type BoardRow = typeof ticketBoards.$inferSelect;
export const ticketRepository = {
  user(executor: TicketExecutor, id: string) { return executor.select().from(users).where(eq(users.id, id)).limit(1).then(([row]) => row ?? null); },
  session(executor: TicketExecutor, id: string) { return executor.select().from(sessions).where(eq(sessions.id, id)).limit(1).then(([row]) => row ?? null); },
  credential(executor: TicketExecutor, id: string) { return executor.select({ mustChangePassword: userCredentials.mustChangePassword }).from(userCredentials).where(eq(userCredentials.userId, id)).limit(1).then(([row]) => row ?? null); },
  grants(executor: TicketExecutor, id: string) { return executor.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, id), eq(adminScopeGrants.active, true))); },
  people(executor: TicketExecutor) { return executor.select({ user: users, team: employeeProfiles.team }).from(users).leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).orderBy(asc(users.displayName)); },
  workspaces(executor: TicketExecutor) { return executor.select().from(ticketWorkspaces).orderBy(asc(ticketWorkspaces.name)); },
  workspace(executor: TicketExecutor, id: string) { return executor.select().from(ticketWorkspaces).where(eq(ticketWorkspaces.id, id)).limit(1).then(([row]) => row ?? null); },
  memberships(executor: TicketExecutor) { return executor.select().from(ticketWorkspaceMembers); },
  boards(executor: TicketExecutor) { return executor.select().from(ticketBoards).orderBy(asc(ticketBoards.name)); },
  board(executor: TicketExecutor, id: string) { return executor.select().from(ticketBoards).where(eq(ticketBoards.id, id)).limit(1).then(([row]) => row ?? null); },
  tickets(executor: TicketExecutor) { return executor.select().from(tickets).orderBy(asc(tickets.number)); },
  ticket(executor: TicketExecutor, id: string) { return executor.select().from(tickets).where(eq(tickets.id, id)).limit(1).then(([row]) => row ?? null); },
  participants(executor: TicketExecutor) { return executor.select().from(ticketParticipants); },
  workLogAuthors(executor: TicketExecutor) { return executor.select({ ticketId: ticketWorkLogs.ticketId, userId: ticketWorkLogs.authorUserId }).from(ticketWorkLogs); },
  fileAuthors(executor: TicketExecutor) { return executor.select({ ticketId: ticketFiles.ticketId, uploaderUserId: ticketFiles.uploaderUserId, ownerUserId: ticketFiles.ownerUserId }).from(ticketFiles); },
  clients(executor: TicketExecutor) { return executor.select({ id: clients.id, name: clients.companyName, status: clients.status }).from(clients).orderBy(asc(clients.companyName)); },
  projects(executor: TicketExecutor) { return executor.select({ id: projects.id, name: projects.name, clientId: projects.clientId, status: projects.status }).from(projects).orderBy(asc(projects.name)); },
  logs(executor: TicketExecutor, ticketId: string) { return executor.select({ log: ticketWorkLogs, authorName: users.displayName }).from(ticketWorkLogs).innerJoin(users, eq(users.id, ticketWorkLogs.authorUserId)).where(eq(ticketWorkLogs.ticketId, ticketId)).orderBy(asc(ticketWorkLogs.loggedAt), asc(ticketWorkLogs.id)); },
  files(executor: TicketExecutor, ticketId: string) { return executor.select({ file: ticketFiles, uploaderName: users.displayName }).from(ticketFiles).innerJoin(users, eq(users.id, ticketFiles.uploaderUserId)).where(eq(ticketFiles.ticketId, ticketId)).orderBy(asc(ticketFiles.createdAt)); },
  async snapshot(executor: TicketExecutor) {
    if (executor !== db) {
      // A PostgreSQL transaction owns one client. Keep its statements sequential for pg@9 compatibility.
      const people = await this.people(executor); const workspaces = await this.workspaces(executor); const memberships = await this.memberships(executor); const boards = await this.boards(executor); const tickets = await this.tickets(executor); const participants = await this.participants(executor); const clients = await this.clients(executor); const projects = await this.projects(executor); const workLogAuthors = await this.workLogAuthors(executor); const fileAuthors = await this.fileAuthors(executor);
      return { people, workspaces, memberships, boards, tickets, participants, clients, projects, workLogAuthors, fileAuthors };
    }
    const [people, workspaces, memberships, boards, tickets, participants, clients, projects, workLogAuthors, fileAuthors] = await Promise.all([this.people(executor), this.workspaces(executor), this.memberships(executor), this.boards(executor), this.tickets(executor), this.participants(executor), this.clients(executor), this.projects(executor), this.workLogAuthors(executor), this.fileAuthors(executor)]);
    return { people, workspaces, memberships, boards, tickets, participants, clients, projects, workLogAuthors, fileAuthors };
  },
  lockWorkspace(tx: TicketTransaction, id: string) { return tx.execute(sql`select id from ticket_workspaces where id = ${id} for update`); },
  lockBoard(tx: TicketTransaction, id: string) { return tx.execute(sql`select id from ticket_boards where id = ${id} for update`); },
  lockTicket(tx: TicketTransaction, id: string) { return tx.execute(sql`select id from tickets where id = ${id} for update`); },
  async lockReadSnapshot(tx: TicketTransaction) {
    await tx.execute(sql`select id from ticket_workspaces order by id for share`);
    await tx.execute(sql`select id from ticket_boards order by id for share`);
    await tx.execute(sql`select id from tickets order by id for share`);
    await tx.execute(sql`select id from users order by id for share`);
    await tx.execute(sql`select user_id from employee_profiles order by user_id for share`);
  },
  async lockLinkedRecords(tx: TicketTransaction, clientId?: string | null, projectId?: string | null) {
    if (clientId) await tx.execute(sql`select id from clients where id = ${clientId} for share`);
    if (projectId) await tx.execute(sql`select id from projects where id = ${projectId} for share`);
  },
  /** Prevents an in-flight mutation from racing activity/session/scope revocation. Resource locks precede actor locks. */
  async lockActor(tx: TicketTransaction, id: string, sessionId: string) {
    await tx.execute(sql`select id from users where id = ${id} for share`);
    await tx.execute(sql`select id from sessions where id = ${sessionId} for share`);
    await tx.execute(sql`select id from admin_scope_grants where user_id = ${id} for share`);
    await tx.execute(sql`select user_id from user_credentials where user_id = ${id} for share`);
  },
  createWorkspace(tx: TicketTransaction, values: typeof ticketWorkspaces.$inferInsert) { return tx.insert(ticketWorkspaces).values(values).returning().then(([row]) => row!); },
  updateWorkspace(tx: TicketTransaction, id: string, version: number, values: { name?: string; description?: string | null }) { return tx.update(ticketWorkspaces).set({ ...values, version: sql`${ticketWorkspaces.version} + 1`, updatedAt: new Date() }).where(and(eq(ticketWorkspaces.id, id), eq(ticketWorkspaces.version, version))).returning().then(([row]) => row ?? null); },
  touchWorkspace(tx: TicketTransaction, id: string, version: number) { return tx.update(ticketWorkspaces).set({ version: sql`${ticketWorkspaces.version} + 1`, updatedAt: new Date() }).where(and(eq(ticketWorkspaces.id, id), eq(ticketWorkspaces.version, version))).returning().then(([row]) => row ?? null); },
  setMember(tx: TicketTransaction, workspaceId: string, userId: string, active: boolean, actorId: string) { return tx.insert(ticketWorkspaceMembers).values({ workspaceId, userId, active, grantedByUserId: actorId }).onConflictDoUpdate({ target: [ticketWorkspaceMembers.workspaceId, ticketWorkspaceMembers.userId], set: { active, grantedByUserId: actorId, updatedAt: new Date() } }); },
  createBoard(tx: TicketTransaction, values: typeof ticketBoards.$inferInsert) { return tx.insert(ticketBoards).values(values).returning().then(([row]) => row!); },
  updateBoard(tx: TicketTransaction, id: string, version: number, values: Partial<typeof ticketBoards.$inferInsert>) { return tx.update(ticketBoards).set({ ...values, version: sql`${ticketBoards.version} + 1`, updatedAt: new Date() }).where(and(eq(ticketBoards.id, id), eq(ticketBoards.version, version))).returning().then(([row]) => row ?? null); },
  createTicket(tx: TicketTransaction, values: typeof tickets.$inferInsert) { return tx.insert(tickets).values(values).returning().then(([row]) => row!); },
  updateTicket(tx: TicketTransaction, id: string, version: number, values: Partial<typeof tickets.$inferInsert>) { return tx.update(tickets).set({ ...values, version: sql`${tickets.version} + 1`, updatedAt: new Date() }).where(and(eq(tickets.id, id), eq(tickets.version, version))).returning().then(([row]) => row ?? null); },
  async setParticipants(tx: TicketTransaction, ticketId: string, assigneeIds: string[], observerIds: string[], actorId: string) {
    await tx.update(ticketParticipants).set({ active: false, updatedAt: new Date() }).where(eq(ticketParticipants.ticketId, ticketId));
    for (const [role, ids] of [["ASSIGNEE", assigneeIds], ["OBSERVER", observerIds]] as const) for (const userId of ids) await tx.insert(ticketParticipants).values({ ticketId, userId, role, active: true, grantedByUserId: actorId }).onConflictDoUpdate({ target: [ticketParticipants.ticketId, ticketParticipants.userId], set: { role, active: true, grantedByUserId: actorId, updatedAt: new Date() } });
  },
  createLog(tx: TicketTransaction, values: typeof ticketWorkLogs.$inferInsert) { return tx.insert(ticketWorkLogs).values(values).returning().then(([row]) => row!); },
  log(tx: TicketTransaction, id: string) { return tx.select().from(ticketWorkLogs).where(eq(ticketWorkLogs.id, id)).limit(1).then(([row]) => row ?? null); },
  updateLog(tx: TicketTransaction, id: string, values: Partial<typeof ticketWorkLogs.$inferInsert>) { return tx.update(ticketWorkLogs).set({ ...values, version: sql`${ticketWorkLogs.version} + 1`, updatedAt: new Date() }).where(eq(ticketWorkLogs.id, id)).returning().then(([row]) => row!); },
};
export type TicketSnapshot = Awaited<ReturnType<typeof ticketRepository.snapshot>>;
