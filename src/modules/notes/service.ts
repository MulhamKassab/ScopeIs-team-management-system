import "server-only";
import { db } from "@/db/client";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { canCreateManagementNote, canReadEmployee, canReadManagementNote } from "@/modules/employees/employee-policy";
import { NoteDomainError } from "@/modules/notes/domain-error";
import { noteRepository, type NoteExecutor } from "@/modules/notes/repositories";
import { looksLikeMarkup, managementNoteArchiveSchema, managementNoteCreateSchema, parseNote } from "@/modules/notes/validation";
import { foundationRepository } from "@/server/repositories/foundation-repository";
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

  /**
   * Rebuilds the actor from the database for every note operation. Current role, current active status,
   * and current scope grants are authoritative; authorship never overrides them, and a disabled,
   * removed, demoted, or re-scoped actor receives the same non-enumerating refusal as a missing note.
   */
  private async currentActor(actor: AuthenticatedActor): Promise<AuthenticatedActor> {
    const row = await noteRepository.actor(db, actor.id);
    if (!row || !row.active) throw new NoteDomainError("NOT_FOUND");
    return { ...actor, role: row.role, scopes: await foundationRepository.activeScopeGrants(actor.id) };
  }

  /** Resolves the current actor and subject together, applying the subject-visibility refusal once. */
  private async resolveVisible(actor: AuthenticatedActor, subjectUserId: string): Promise<{ current: AuthenticatedActor; subject: SubjectRow }> {
    const current = await this.currentActor(actor);
    const subject = await noteRepository.subject(db, subjectUserId);
    if (!subject) throw new NoteDomainError("NOT_FOUND");
    // The subject never sees a note about themselves, an employee never reads management notes, and an
    // Admin without the subject in their current scope gets the same refusal as a missing subject, so
    // the panel can never confirm that an out-of-scope employee exists.
    if (current.id === subject.userId || current.role === "EMPLOYEE") throw new NoteDomainError("NOT_FOUND");
    if (!canReadEmployee(current, { userId: subject.userId, team: subject.team, role: subject.role })) throw new NoteDomainError("NOT_FOUND");
    return { current, subject };
  }

  /**
   * Lists the notes an actor may read about one subject. Access is recomputed from the actor's current
   * role and scope; the stored author role is historical context only. The subject always receives the
   * same non-enumerating refusal as a nonexistent subject.
   */
  async listForSubject(actor: AuthenticatedActor, subjectUserId: string) {
    const { current, subject } = await this.resolveVisible(actor, subjectUserId);
    const rows = await noteRepository.notesForSubject(db, subject.userId);
    const authors = await this.displayNames([...rows.map((row) => row.authorUserId), subject.userId]);
    return { subject: { userId: subject.userId, displayName: authors.get(subject.userId) ?? subject.userId, role: subject.role }, notes: this.project(current, rows, subject, authors) };
  }

  /**
   * The actor's own notes. Authorship alone is not access: every row is re-filtered through the current
   * authorizations, so a demoted or re-scoped author sees nothing until the authorization is restored.
   */
  async listAuthoredByActor(actor: AuthenticatedActor) {
    const current = await this.currentActor(actor);
    if (current.role === "EMPLOYEE") return { notes: [] as ManagementNoteView[] };
    const rows = await noteRepository.notesByAuthor(db, current.id);
    const authors = await this.displayNames([current.id]);
    const projected: ManagementNoteView[] = [];
    for (const row of rows) {
      const subject = await noteRepository.subject(db, row.subjectUserId);
      if (!subject) continue;
      projected.push(...this.project(current, [row], subject, authors));
    }
    return { notes: projected };
  }

  /**
   * Everything the employee-detail page needs for one subject, or `null` when this actor must not see
   * the panel at all (the subject, an Employee, or an out-of-scope Admin). Returning null keeps the page
   * free of any branch that could render the panel for an unauthorized reader.
   */
  async panel(actor: AuthenticatedActor, subjectUserId: string) {
    let resolved: Awaited<ReturnType<ManagementNoteService["resolveVisible"]>>;
    try { resolved = await this.resolveVisible(actor, subjectUserId); }
    catch (error) { if (error instanceof NoteDomainError) return null; throw error; }
    const { current, subject } = resolved;
    const rows = await noteRepository.notesForSubject(db, subject.userId);
    const authors = await this.displayNames([...rows.map((row) => row.authorUserId), subject.userId]);
    return {
      subject: { userId: subject.userId, displayName: authors.get(subject.userId) ?? subject.userId, role: subject.role },
      notes: this.project(current, rows, subject, authors),
      canCreate: canCreateManagementNote(current, { userId: subject.userId, team: subject.team, role: subject.role }),
    };
  }

  /**
   * Policy-applied note count for one subject. Counts and existence signals must run through the same
   * authorization as reads, so an unauthorized actor receives the plain non-enumerating refusal instead
   * of a number that would confirm notes exist.
   */
  async countVisibleForSubject(actor: AuthenticatedActor, subjectUserId: string) {
    const listed = await this.listForSubject(actor, subjectUserId);
    return { count: listed.notes.filter((note) => note.archivedAt === null).length };
  }

  private async displayNames(userIds: string[]) {
    const rows = await noteRepository.displayNames(db, [...new Set(userIds.filter(Boolean))]);
    return new Map(rows.map((row) => [row.id, row.displayName]));
  }

  private project(actor: AuthenticatedActor, rows: (NonNullable<Awaited<ReturnType<typeof noteRepository.note>>>)[], subject: SubjectRow, authors: Map<string, string>): ManagementNoteView[] {
    return rows.filter((row) => canReadManagementNote(actor, { authorUserId: row.authorUserId, subjectUserId: row.subjectUserId, authorRole: row.authorRole, visibility: row.visibility, subject })).map((row) => ({
      id: row.id, subjectUserId: row.subjectUserId, visibility: row.visibility, content: row.content, authorRole: row.authorRole,
      authorName: authors.get(row.authorUserId) ?? row.authorUserId, isAuthor: row.authorUserId === actor.id,
      // Only rows this actor may currently read reach this point, so archive is limited to the current
      // author acting under valid authorization, or a Super Admin who may already read the note.
      canArchive: row.archivedAt === null && (row.authorUserId === actor.id || actor.role === "SUPER_ADMIN"),
      version: row.version,
      createdAt: row.createdAt.toISOString(), archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    }));
  }

  async create(actor: AuthenticatedActor, input: unknown) {
    const current = await this.currentActor(actor);
    const parsed = parseNote(managementNoteCreateSchema, input);
    if (looksLikeMarkup(parsed.content)) throw new NoteDomainError("VALIDATION_ERROR");
    const subject = await noteRepository.subject(db, parsed.subjectUserId);
    if (!subject) throw new NoteDomainError("NOT_FOUND");
    // Role, subject role, team scope, and the Super-Admin-subject prohibition all live in the shared policy.
    if (!canCreateManagementNote(current, { userId: subject.userId, team: subject.team, role: subject.role })) throw new NoteDomainError("NOT_FOUND");
    return db.transaction(async (tx) => {
      const row = await noteRepository.create(tx, { subjectUserId: subject.userId, authorUserId: current.id, authorRole: current.role, visibility: parsed.visibility, content: parsed.content });
      // Audit metadata never carries note content.
      await this.audit(tx, current, "management_note.created", row.id, { subjectUserId: row.subjectUserId, visibility: row.visibility, authorRole: row.authorRole, contentLength: row.content.length });
      return { note: row };
    });
  }

  async archive(actor: AuthenticatedActor, input: unknown) {
    const current = await this.currentActor(actor);
    if (current.role === "EMPLOYEE") throw new NoteDomainError("NOT_FOUND");
    const parsed = parseNote(managementNoteArchiveSchema, input);
    const existing = await noteRepository.note(db, parsed.noteId);
    if (!existing || existing.archivedAt) throw new NoteDomainError("NOT_FOUND");
    const subject = await noteRepository.subject(db, existing.subjectUserId);
    if (!subject) throw new NoteDomainError("NOT_FOUND");
    const readable = canReadManagementNote(current, { authorUserId: existing.authorUserId, subjectUserId: existing.subjectUserId, authorRole: existing.authorRole, visibility: existing.visibility, subject });
    // Archive is limited to the current author under valid authorization, or a Super Admin who may read it.
    const mayArchive = readable && (existing.authorUserId === current.id || current.role === "SUPER_ADMIN");
    if (!mayArchive) throw new NoteDomainError("NOT_FOUND");
    return db.transaction(async (tx) => {
      await noteRepository.lockNote(tx, existing.id);
      const row = await noteRepository.archive(tx, existing.id, parsed.expectedVersion);
      if (!row) throw new NoteDomainError("STALE_VERSION");
      await this.audit(tx, current, "management_note.archived", row.id, { subjectUserId: row.subjectUserId, visibility: row.visibility, previousVersion: parsed.expectedVersion, reasonProvided: true });
      return { note: row };
    });
  }
}

export const managementNoteService = new ManagementNoteService();
