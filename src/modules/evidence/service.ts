import "server-only";
import { db } from "@/db/client";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { EvidenceDomainError } from "@/modules/evidence/domain-error";
import { assessUploadForMalware, validateEvidenceFile } from "@/modules/evidence/file-validation";
import { evidenceRepository, type EvidenceTransaction } from "@/modules/evidence/repositories";
import {
  assertExpiryOrdering, deriveExpiryStatus, evidenceCreateSchema, evidenceReviewSchema, evidenceUpdateSchema, evidenceVersionSchema, isNewOrUpdated, parseEvidence, type EvidenceKind,
} from "@/modules/evidence/validation";
import { createNotification } from "@/modules/notifications/notification-service";
import { canReadEmployee } from "@/modules/employees/employee-policy";
import { evidenceObjectKey, evidenceStorage, type EvidenceStorage } from "@/server/providers/evidence-storage";
import { evidenceFileHeaders, inlinePreviewTypes } from "@/modules/evidence/delivery";
import type { AuthenticatedActor } from "@/shared/types/foundation";

type AuditWriter = typeof writeAuditEvent;
type NotificationWriter = typeof createNotification;
type StorageResolver = () => EvidenceStorage;

export type EvidenceFileView = { id: string; originalFilename: string; contentType: string; sizeBytes: number; version: number; uploadedAt: string; canPreview: boolean; archivedAt: string | null };
export type EvidenceItemView = {
  id: string; kind: EvidenceKind; title: string; issuer: string | null; issueDate: string | null; expiryDate: string | null; expiryStatus: "no_expiry" | "valid" | "expired";
  details: string | null; externalUrl: string | null; relatedSkillId: string | null; relatedSkillName: string | null;
  reviewState: "unreviewed" | "reviewed" | "verified"; isNewOrUpdated: boolean; version: number; archivedAt: string | null; files: EvidenceFileView[]; isActiveCv: boolean;
};
/** The locked scoped-Admin projection: certification summary facts only, never files, links, or detail. */
export type CertificationSummaryView = { id: string; title: string; issuer: string | null; issueDate: string | null; expiryDate: string | null; expiryStatus: "no_expiry" | "valid" | "expired"; reviewState: "unreviewed" | "reviewed" | "verified"; relatedSkillName: string | null };

function fileView(row: { id: string; originalFilename: string; contentType: string; sizeBytes: number; version: number; createdAt: Date; archivedAt: Date | null }): EvidenceFileView {
  return { id: row.id, originalFilename: row.originalFilename, contentType: row.contentType, sizeBytes: row.sizeBytes, version: row.version, uploadedAt: row.createdAt.toISOString(), canPreview: inlinePreviewTypes.has(row.contentType), archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null };
}

export class EvidenceService {
  constructor(
    private readonly auditWriter: AuditWriter = writeAuditEvent,
    private readonly notificationWriter: NotificationWriter = createNotification,
    private readonly storageResolver: StorageResolver = evidenceStorage,
  ) {}

  private audit(tx: EvidenceTransaction, actor: AuthenticatedActor, action: string, targetId: string, metadata: Record<string, unknown>) { return this.auditWriter(tx, { actor, action, targetType: "employee_evidence", targetId, metadata }); }

  /** Only safe, non-content metadata reaches the audit log. Titles, issuers, filenames, and URLs never do. */
  private auditFileSafety(actor: AuthenticatedActor, action: string, targetId: string, metadata: Record<string, unknown>) { return this.auditWriter(db, { actor, action, targetType: "employee_evidence", targetId, metadata }); }

  private async notifySuperAdmins(tx: EvidenceTransaction, ownerUserId: string, eventType: string, evidenceId: string) {
    for (const recipient of await evidenceRepository.activeSuperAdmins(tx)) if (recipient.id !== ownerUserId) await this.notificationWriter(tx, { recipientUserId: recipient.id, eventType, relatedRecordType: "employee_evidence", relatedRecordId: evidenceId });
  }

  private async requireOwnedActiveEvidence(executor: Parameters<typeof evidenceRepository.evidenceById>[0], actor: AuthenticatedActor, evidenceId: string) {
    const evidence = await evidenceRepository.evidenceById(executor, evidenceId);
    // Non-enumerating: a foreign, missing, or archived id is indistinguishable from a nonexistent one.
    if (!evidence || evidence.ownerUserId !== actor.id || evidence.archivedAt) throw new EvidenceDomainError("NOT_FOUND");
    return evidence;
  }

  private async itemViews(executor: Parameters<typeof evidenceRepository.ownerEvidence>[0], rows: Awaited<ReturnType<typeof evidenceRepository.ownerEvidence>>): Promise<EvidenceItemView[]> {
    const files = await evidenceRepository.filesForEvidence(executor, rows.map((row) => row.evidence.id));
    return rows.map(({ evidence, skillName }) => ({
      id: evidence.id, kind: evidence.kind, title: evidence.title, issuer: evidence.issuer, issueDate: evidence.issueDate, expiryDate: evidence.expiryDate,
      expiryStatus: deriveExpiryStatus(evidence.expiryDate), details: evidence.details, externalUrl: evidence.externalUrl, relatedSkillId: evidence.relatedSkillId, relatedSkillName: skillName ?? null,
      reviewState: evidence.reviewState, isNewOrUpdated: isNewOrUpdated({ lastSubmittedAt: evidence.lastSubmittedAt, reviewedAt: evidence.reviewedAt }),
      version: evidence.version, archivedAt: evidence.archivedAt ? evidence.archivedAt.toISOString() : null,
      files: files.filter((file) => file.evidenceId === evidence.id).map(fileView), isActiveCv: evidence.kind === "cv" && !evidence.archivedAt,
    }));
  }

  async listMine(actor: AuthenticatedActor) {
    const rows = await evidenceRepository.ownerEvidence(db, actor.id, true);
    return { items: await this.itemViews(db, rows) };
  }

  /**
   * Super Admin receives the full active record set. A scoped Admin receives only the certification
   * summary projection for employees inside their TEAM scope; everyone else receives nothing.
   */
  async listForEmployee(actor: AuthenticatedActor, employeeUserId: string) {
    const record = await evidenceRepository.employeeAccessRecord(db, employeeUserId);
    if (!record) throw new EvidenceDomainError("NOT_FOUND");
    if (actor.role === "EMPLOYEE") throw new EvidenceDomainError("NOT_FOUND");
    if (actor.role === "SUPER_ADMIN") {
      const rows = await evidenceRepository.employeeEvidenceForManagement(db, employeeUserId);
      return { full: await this.itemViews(db, rows), certificationSummary: null as CertificationSummaryView[] | null };
    }
    if (!canReadEmployee(actor, { userId: record.userId, team: record.team, role: record.role })) throw new EvidenceDomainError("NOT_FOUND");
    const rows = await evidenceRepository.employeeEvidenceForManagement(db, employeeUserId);
    const certificationSummary: CertificationSummaryView[] = rows.filter(({ evidence }) => evidence.kind === "certification").map(({ evidence, skillName }) => ({
      id: evidence.id, title: evidence.title, issuer: evidence.issuer, issueDate: evidence.issueDate, expiryDate: evidence.expiryDate,
      expiryStatus: deriveExpiryStatus(evidence.expiryDate), reviewState: evidence.reviewState, relatedSkillName: skillName ?? null,
    }));
    return { full: null as EvidenceItemView[] | null, certificationSummary };
  }

  async create(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseEvidence(evidenceCreateSchema, input);
    assertExpiryOrdering(parsed.issueDate, parsed.expiryDate);
    if (parsed.relatedSkillId && !(await evidenceRepository.activeSkillIds(db)).some((skill) => skill.id === parsed.relatedSkillId)) throw new EvidenceDomainError("VALIDATION_ERROR");
    if (parsed.submissionKey) {
      const existing = await evidenceRepository.bySubmissionKey(db, actor.id, parsed.submissionKey);
      // Idempotent retry: return the original row without duplicating notifications or audit events.
      if (existing) return { evidence: existing, deduplicated: true };
    }
    return db.transaction(async (tx) => {
      await evidenceRepository.lockOwner(tx, actor.id);
      // One active CV per owner: archive the previous one atomically before inserting the replacement.
      if (parsed.kind === "cv") {
        const current = await evidenceRepository.activeCv(tx, actor.id);
        if (current) await evidenceRepository.archiveEvidence(tx, current.id, current.version);
      }
      const row = await evidenceRepository.createEvidence(tx, {
        ownerUserId: actor.id, uploaderUserId: actor.id, kind: parsed.kind, title: parsed.title, issuer: parsed.issuer ?? null,
        issueDate: parsed.issueDate ?? null, expiryDate: parsed.expiryDate ?? null, details: parsed.details ?? null,
        relatedSkillId: parsed.relatedSkillId ?? null, externalUrl: parsed.externalUrl ?? null, submissionKey: parsed.submissionKey ?? null, lastSubmittedAt: new Date(),
      });
      await this.audit(tx, actor, "evidence.created", row.id, { kind: row.kind, relatedSkill: Boolean(row.relatedSkillId), hasExpiry: Boolean(row.expiryDate), hasFile: false, hasExternalUrl: Boolean(row.externalUrl) });
      await this.notifySuperAdmins(tx, actor.id, "evidence.created", row.id);
      return { evidence: row, deduplicated: false };
    });
  }

  async update(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseEvidence(evidenceUpdateSchema, input);
    assertExpiryOrdering(parsed.issueDate, parsed.expiryDate);
    if (parsed.relatedSkillId && !(await evidenceRepository.activeSkillIds(db)).some((skill) => skill.id === parsed.relatedSkillId)) throw new EvidenceDomainError("VALIDATION_ERROR");
    await this.requireOwnedActiveEvidence(db, actor, parsed.evidenceId);
    return db.transaction(async (tx) => {
      await evidenceRepository.lockOwner(tx, actor.id);
      await evidenceRepository.lockEvidence(tx, parsed.evidenceId);
      await this.requireOwnedActiveEvidence(tx, actor, parsed.evidenceId);
      const row = await evidenceRepository.updateEvidence(tx, parsed.evidenceId, parsed.expectedVersion, {
        title: parsed.title, issuer: parsed.issuer ?? null, issueDate: parsed.issueDate ?? null, expiryDate: parsed.expiryDate ?? null,
        details: parsed.details ?? null, relatedSkillId: parsed.relatedSkillId ?? null, externalUrl: parsed.externalUrl ?? null, lastSubmittedAt: new Date(),
      });
      if (!row) throw new EvidenceDomainError("STALE_VERSION");
      // Review state stays Super Admin authority; the item is flagged new/updated for the review queue.
      await this.audit(tx, actor, "evidence.updated", row.id, { kind: row.kind, reviewedBeforeUpdate: row.reviewState !== "unreviewed", hasExpiry: Boolean(row.expiryDate), hasExternalUrl: Boolean(row.externalUrl), hasDetails: Boolean(row.details) });
      await this.notifySuperAdmins(tx, actor.id, "evidence.updated", row.id);
      return { evidence: row };
    });
  }

  async archive(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseEvidence(evidenceVersionSchema, input);
    await this.requireOwnedActiveEvidence(db, actor, parsed.evidenceId);
    return db.transaction(async (tx) => {
      await evidenceRepository.lockOwner(tx, actor.id);
      await this.requireOwnedActiveEvidence(tx, actor, parsed.evidenceId);
      const row = await evidenceRepository.archiveEvidence(tx, parsed.evidenceId, parsed.expectedVersion);
      if (!row) throw new EvidenceDomainError("STALE_VERSION");
      await this.audit(tx, actor, "evidence.archived", row.id, { kind: row.kind, previousState: "active", fileCountArchived: 0 });
      return { evidence: row };
    });
  }

  /**
   * Stores the bytes in private storage first, then commits metadata. A database failure after the
   * storage write removes the object; a storage failure leaves no committed row.
   */
  async attachFile(actor: AuthenticatedActor, input: { evidenceId: string; expectedVersion: number; replaceFileId?: string; bytes: Uint8Array; contentType: string; filename: string }) {
    const parsed = parseEvidence(evidenceVersionSchema, { evidenceId: input.evidenceId, expectedVersion: input.expectedVersion });
    const current = await this.requireOwnedActiveEvidence(db, actor, parsed.evidenceId);
    if (current.version !== parsed.expectedVersion) throw new EvidenceDomainError("STALE_VERSION");
    const validated = validateEvidenceFile({ bytes: input.bytes, contentType: input.contentType, filename: input.filename });
    const malware = assessUploadForMalware({ bytes: input.bytes, contentType: validated.contentType });

    type FileRow = NonNullable<Awaited<ReturnType<typeof evidenceRepository.fileById>>>;
    let replaced: FileRow | null = null;
    if (input.replaceFileId) {
      replaced = await evidenceRepository.fileById(db, input.replaceFileId);
      if (!replaced || replaced.evidenceId !== parsed.evidenceId || replaced.ownerUserId !== actor.id || replaced.archivedAt) throw new EvidenceDomainError("NOT_FOUND");
    }

    const storageKey = evidenceObjectKey({ ownerUserId: actor.id, extension: validated.extension });
    const storage = this.storageResolver();
    try { await storage.put({ storageKey, bytes: input.bytes, contentType: validated.contentType }); }
    catch { throw new EvidenceDomainError("STORAGE_FAILURE"); }

    try {
      return await db.transaction(async (tx) => {
        await evidenceRepository.lockOwner(tx, actor.id);
        await evidenceRepository.lockEvidence(tx, parsed.evidenceId);
        const locked = await this.requireOwnedActiveEvidence(tx, actor, parsed.evidenceId);
        if (locked.version !== parsed.expectedVersion) throw new EvidenceDomainError("STALE_VERSION");
        if (replaced) {
          const archived = await evidenceRepository.archiveFile(tx, replaced.id);
          if (!archived) throw new EvidenceDomainError("STALE_VERSION");
        } else {
          for (const existing of await evidenceRepository.activeFiles(tx, parsed.evidenceId)) await evidenceRepository.archiveFile(tx, existing.id);
        }
        const version = await evidenceRepository.nextFileVersion(tx, parsed.evidenceId);
        const file = await evidenceRepository.createFile(tx, { evidenceId: parsed.evidenceId, ownerUserId: actor.id, uploaderUserId: actor.id, storageKey, originalFilename: validated.displayFilename, contentType: validated.contentType, sizeBytes: validated.sizeBytes, version });
        const row = await evidenceRepository.updateEvidence(tx, parsed.evidenceId, parsed.expectedVersion, { lastSubmittedAt: new Date() });
        if (!row) throw new EvidenceDomainError("STALE_VERSION");
        await this.audit(tx, actor, replaced ? "evidence.file_replaced" : "evidence.file_attached", parsed.evidenceId, { kind: row.kind, fileVersion: file.version, contentType: file.contentType, sizeBytes: file.sizeBytes, replacedFile: Boolean(replaced), malwareScanned: malware.scanned });
        await this.notifySuperAdmins(tx, actor.id, "evidence.updated", parsed.evidenceId);
        return { file, evidence: row };
      });
    } catch (error) {
      // Compensation: never leave a private object that no database row references.
      await storage.remove(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async review(actor: AuthenticatedActor, input: unknown) {
    if (actor.role !== "SUPER_ADMIN") throw new EvidenceDomainError("FORBIDDEN");
    const parsed = parseEvidence(evidenceReviewSchema, input);
    const target = await evidenceRepository.evidenceById(db, parsed.evidenceId);
    if (!target || target.archivedAt) throw new EvidenceDomainError("NOT_FOUND");
    return db.transaction(async (tx) => {
      await evidenceRepository.lockEvidence(tx, parsed.evidenceId);
      const previousState = target.reviewState;
      const now = new Date();
      const values = parsed.state === "verified"
        ? { reviewState: "verified" as const, reviewedByUserId: actor.id, reviewedAt: now, verifiedByUserId: actor.id, verifiedAt: now }
        : parsed.state === "reviewed"
          ? { reviewState: "reviewed" as const, reviewedByUserId: actor.id, reviewedAt: now, verifiedByUserId: null, verifiedAt: null }
          : { reviewState: "unreviewed" as const, reviewedByUserId: null, reviewedAt: null, verifiedByUserId: null, verifiedAt: null };
      const row = await evidenceRepository.updateEvidence(tx, parsed.evidenceId, parsed.expectedVersion, values);
      if (!row) throw new EvidenceDomainError("STALE_VERSION");
      const action = parsed.state === "verified" ? "evidence.verified" : parsed.state === "reviewed" && previousState === "verified" ? "evidence.verification_removed" : parsed.state === "reviewed" ? "evidence.reviewed" : "evidence.review_reset";
      await this.audit(tx, actor, action, row.id, { kind: row.kind, previousState, nextState: row.reviewState, verificationRemoved: previousState === "verified" && parsed.state !== "verified" });
      if (row.ownerUserId !== actor.id) await this.notificationWriter(tx, { recipientUserId: row.ownerUserId, eventType: action, relatedRecordType: "employee_evidence", relatedRecordId: row.id });
      return { evidence: row };
    });
  }

  /** Authorized byte delivery. Owner always; Super Admin for review, audited. Everyone else sees not-found. */
  async readFile(actor: AuthenticatedActor, fileId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(fileId)) throw new EvidenceDomainError("NOT_FOUND");
    const file = await evidenceRepository.fileById(db, fileId);
    if (!file || file.archivedAt) throw new EvidenceDomainError("NOT_FOUND");
    const evidence = await evidenceRepository.evidenceById(db, file.evidenceId);
    if (!evidence) throw new EvidenceDomainError("NOT_FOUND");
    const isOwner = evidence.ownerUserId === actor.id;
    const isSuperAdmin = actor.role === "SUPER_ADMIN";
    if (!isOwner && !isSuperAdmin) throw new EvidenceDomainError("NOT_FOUND");
    const bytes = await this.storageResolver().read(file.storageKey);
    if (!bytes) throw new EvidenceDomainError("NOT_FOUND");
    const { disposition, headers } = evidenceFileHeaders(file);
    if (isSuperAdmin && !isOwner) await this.auditFileSafety(actor, "evidence.file_read_by_reviewer", evidence.id, { kind: evidence.kind, fileVersion: file.version, contentType: file.contentType, disposition, sizeBytes: file.sizeBytes });
    return { bytes, contentType: file.contentType, filename: file.originalFilename, disposition, headers, evidenceId: evidence.id, ownerUserId: evidence.ownerUserId };
  }
}

export const evidenceService = new EvidenceService();
