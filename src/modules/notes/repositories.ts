import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { employeeManagementNotes, employeeProfiles, users } from "@/db/schema";

export type NoteTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type NoteExecutor = typeof db | NoteTransaction;

export const noteRepository = {
  /** Role/team facts for the note subject, so visibility uses the canonical employee record. */
  subject(executor: NoteExecutor, userId: string) {
    return executor.select({ userId: users.id, role: users.role, active: users.active, team: employeeProfiles.team }).from(users).leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(eq(users.id, userId)).limit(1).then(([row]) => row ?? null);
  },
  note(executor: NoteExecutor, noteId: string) { return executor.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.id, noteId)).limit(1).then(([row]) => row ?? null); },
  displayNames(executor: NoteExecutor, userIds: string[]) {
    if (!userIds.length) return Promise.resolve([] as { id: string; displayName: string }[]);
    return executor.select({ id: users.id, displayName: users.displayName }).from(users).where(inArray(users.id, userIds));
  },
  lockNote(tx: NoteTransaction, noteId: string) { return tx.execute(sql`select id from employee_management_notes where id = ${noteId} for update`); },
  /** Candidate rows for a subject; the service applies the authoritative visibility policy to each row. */
  notesForSubject(executor: NoteExecutor, subjectUserId: string) {
    return executor.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.subjectUserId, subjectUserId)).orderBy(desc(employeeManagementNotes.createdAt));
  },
  /** Notes authored by the actor, so an author keeps access to their own notes without a subject page. */
  notesByAuthor(executor: NoteExecutor, authorUserId: string) {
    return executor.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.authorUserId, authorUserId)).orderBy(desc(employeeManagementNotes.createdAt));
  },
  activeNoteCount(executor: NoteExecutor, subjectUserId: string) {
    return executor.select({ id: employeeManagementNotes.id }).from(employeeManagementNotes).where(and(eq(employeeManagementNotes.subjectUserId, subjectUserId), isNull(employeeManagementNotes.archivedAt))).orderBy(asc(employeeManagementNotes.createdAt));
  },
  create(tx: NoteTransaction, values: typeof employeeManagementNotes.$inferInsert) { return tx.insert(employeeManagementNotes).values(values).returning().then(([row]) => row!); },
  archive(tx: NoteTransaction, noteId: string, expectedVersion: number) {
    return tx.update(employeeManagementNotes).set({ archivedAt: new Date(), version: expectedVersion + 1, updatedAt: new Date() })
      .where(and(eq(employeeManagementNotes.id, noteId), eq(employeeManagementNotes.version, expectedVersion), isNull(employeeManagementNotes.archivedAt))).returning().then(([row]) => row ?? null);
  },
};
