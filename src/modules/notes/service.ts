import "server-only";
import { db } from "@/db/client";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { canCreateManagementNote, canReadEmployee, canReadManagementNote } from "@/modules/employees/employee-policy";
import { NoteDomainError } from "@/modules/notes/domain-error";
import { noteRepository, type NoteExecutor } from "@/modules/notes/repositories";
import { looksLikeMarkup, managementNoteArchiveSchema, managementNoteCreateSchema, parseNote } from "@/modules/notes/validation";
import type { AuthenticatedActor } from "@/shared/types/foundation";

type AuditWriter = typeof writeAuditEvent;

export type ManagementNoteView = {
  id: string; subjectUserId: string; visibility: "private_to_author" | "shared_upward"; content: string;
  authorRole: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE"; authorName: string; isAuthor: boolean; canArchive: boolean;
  version: number; createdAt: string; archivedAt: string | null;
};

type SubjectRow = NonNullable<Awaited<ReturnType<typeof noteRepository.subject>>>;

export class ManagementNoteService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent) {}

  private audit(executor: NoteExecutor, actor: AuthenticatedActor, action: string, targetId: string, metadata: Record<string, unknown>) {
    return this.auditWriter(executor, { actor, action, targetType: "employee_management_note", targetId, metadata });
  }

  private async requireVisibleSubject(actor: AuthenticatedActor, subjectUserId: string): Promise<SubjectRow> {
    const subject = await noteRepository.subject(db, subjectUserId);
    if (!subject) throw new NoteDomainError("NOT_FOUND");
    // The subject can never read a note about themselves, and an employee never reads management notes.
    if (actor.id === subject.userId || actor.role === "EMPLOYEE") throw new NoteDomainError("NOT_FOUND");
    // An Admin without the subject in their current scope receives the same refusal as a missing subject,
    // so the panel can never be used to confirm that an out-of-scope employee exists.
    if (!canReadEmployee(actor, { userId: subject.userId, team: subject.team, role: subject.role })) throw new NoteDomainError("NOT_FOUND");
    return subject;
  }

  /**
   * Lists the notes an actor may read about one subject. Access is recomputed from the actor's current
   * role and scope; the stored author role is historical context only. The subject always receives the
   * same non-enumerating refusal as a nonexistent subject.
   */
  async listForSubject(actor: AuthenticatedActor, subjectUserId: string) {
    const subject = await this.requireVisibleSubject(actor, subjectUserId);
    const rows = await noteRepository.notesForSubject(db, subject.userId);
    const authors = await this.displayNames([...rows.map((row) => row.authorUserId), subject.userId]);
    return { subject: { userId: subject.userId, displayName: authors.get(subject.userId) ?? subject.userId, role: subject.role }, notes: this.project(actor, rows, subject, authors) };
  }

  /** The author's own notes, so a demoted or re-scoped author keeps access to what they wrote. */
  async listAuthoredByActor(actor: AuthenticatedActor) {
    const rows = await noteRepository.notesByAuthor(db, actor.id);
    const authors = await this.displayNames([actor.id]);
    const projected: ManagementNoteView[] = [];
    for (const row of rows) {
      const subject = await noteRepository.subject(db, row.subjectUserId);
      if (!subject) continue;
      projected.push(...this.project(actor, [row], subject, authors));
    }
    return { notes: projected };
  }

  /**
   * Everything the employee-detail page needs for one subject, or `null` when this actor must not see
   * the panel at all (the subject, an Employee, or an out-of-scope Admin). Returning null keeps the page
   * free of any branch that could render the panel for an unauthorized reader.
   */
  async panel(actor: AuthenticatedActor, subjectUserId: string) {
    let listed: Awaited<ReturnType<ManagementNoteService["listForSubject"]>>;
    try { listed = await this.listForSubject(actor, subjectUserId); }
    catch (error) { if (error instanceof NoteDomainError) return null; throw error; }
    const subject = { userId: listed.subject.userId, team: await this.teamOf(listed.subject.userId), role: listed.subject.role };
    return { subject: listed.subject, notes: listed.notes, canCreate: canCreateManagementNote(actor, subject) };
  }

  private async teamOf(userId: string) { return (await noteRepository.subject(db, userId))?.team ?? null; }

  private async displayNames(userIds: string[]) {
    const rows = await noteRepository.displayNames(db, [...new Set(userIds.filter(Boolean))]);
    return new Map(rows.map((row) => [row.id, row.displayName]));
  }

  private project(actor: AuthenticatedActor, rows: (NonNullable<Awaited<ReturnType<typeof noteRepository.note>>>)[], subject: SubjectRow, authors: Map<string, string>): ManagementNoteView[] {
    return rows.filter((row) => canReadManagementNote(actor, { authorUserId: row.authorUserId, subjectUserId: row.subjectUserId, authorRole: row.authorRole, visibility: row.visibility, subject })).map((row) => ({
      id: row.id, subjectUserId: row.subjectUserId, visibility: row.visibility, content: row.content, authorRole: row.authorRole,
      authorName: authors.get(row.authorUserId) ?? row.authorUserId, isAuthor: row.authorUserId === actor.id,
      // Governance archive is limited to the author, or a Super Admin who may already read the note.
      canArchive: row.archivedAt === null && (row.authorUserId === actor.id || (actor.role === "SUPER_ADMIN" && canReadManagementNote(actor, { authorUserId: row.authorUserId, subjectUserId: row.subjectUserId, authorRole: row.authorRole, visibility: row.visibility, subject }))),
      version: row.version,
      createdAt: row.createdAt.toISOString(), archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    }));
  }

  async create(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseNote(managementNoteCreateSchema, input);
    if (looksLikeMarkup(parsed.content)) throw new NoteDomainError("VALIDATION_ERROR");
    const subject = await noteRepository.subject(db, parsed.subjectUserId);
    if (!subject) throw new NoteDomainError("NOT_FOUND");
    // Role, subject role, team scope, and the Super-Admin-subject prohibition all live in the shared policy.
    if (!canCreateManagementNote(actor, { userId: subject.userId, team: subject.team, role: subject.role })) throw new NoteDomainError("NOT_FOUND");
    return db.transaction(async (tx) => {
      const row = await noteRepository.create(tx, { subjectUserId: subject.userId, authorUserId: actor.id, authorRole: actor.role, visibility: parsed.visibility, content: parsed.content });
      // Audit metadata never carries note content.
      await this.audit(tx, actor, "management_note.created", row.id, { subjectUserId: row.subjectUserId, visibility: row.visibility, authorRole: row.authorRole, contentLength: row.content.length });
      return { note: row };
    });
  }

  async archive(actor: AuthenticatedActor, input: unknown) {
    if (actor.role === "EMPLOYEE") throw new NoteDomainError("NOT_FOUND");
    const parsed = parseNote(managementNoteArchiveSchema, input);
    const existing = await noteRepository.note(db, parsed.noteId);
    if (!existing || existing.archivedAt) throw new NoteDomainError("NOT_FOUND");
    const subject = await noteRepository.subject(db, existing.subjectUserId);
    if (!subject) throw new NoteDomainError("NOT_FOUND");
    const readable = canReadManagementNote(actor, { authorUserId: existing.authorUserId, subjectUserId: existing.subjectUserId, authorRole: existing.authorRole, visibility: existing.visibility, subject });
    if (!readable) throw new NoteDomainError("NOT_FOUND");
    return db.transaction(async (tx) => {
      await noteRepository.lockNote(tx, existing.id);
      const row = await noteRepository.archive(tx, existing.id, parsed.expectedVersion);
      if (!row) throw new NoteDomainError("STALE_VERSION");
      await this.audit(tx, actor, "management_note.archived", row.id, { subjectUserId: row.subjectUserId, visibility: row.visibility, previousVersion: parsed.expectedVersion, reasonProvided: true });
      return { note: row };
    });
  }
}

export const managementNoteService = new ManagementNoteService();
