import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEvents, employeeEvidence, employeeFiles, employeeProfiles, notifications, users } from "@/db/schema";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { createNotification } from "@/modules/notifications/notification-service";
import { EvidenceService } from "@/modules/evidence/service";
import { coverageService } from "@/modules/coverage/service";
import { schedulingService } from "@/modules/scheduling/service";
import { createLocalEvidenceStorage, type EvidenceStorage } from "@/server/providers/evidence-storage";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import { evidenceFixtures, phase9Evidence } from "../../scripts/phase9-test-fixtures.mjs";
import { phase3Ids } from "../../scripts/phase4-test-fixtures.mjs";

const actor = (id: string, role: AuthenticatedActor["role"], scopes: AuthenticatedActor["scopes"] = []): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `s-${id}`, sessionVersion: 1, scopes, authenticationMode: "mock" });
const nora = actor("mock-super-admin-nora", "SUPER_ADMIN");
const ava = actor("mock-admin-ava", "ADMIN", [{ type: "TEAM", reference: "team:alpha" }]);
const ben = actor("mock-admin-ben", "ADMIN", [{ type: "TEAM", reference: "team:bravo" }]);
const cora = actor("mock-employee-cora", "EMPLOYEE");
const bravoEmployee = actor("ev-bravo-employee", "EMPLOYEE");

let root = "";
let storage: EvidenceStorage;
const service = () => new EvidenceService(writeAuditEvent, createNotification, () => storage);

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "scopeis-evidence-it-"));
  storage = createLocalEvidenceStorage(root);
  await db.insert(users).values([{ id: bravoEmployee.id, displayName: "Fictional Bravo Evidence Owner", role: "EMPLOYEE" }]).onConflictDoNothing();
  await db.insert(employeeProfiles).values([{ userId: bravoEmployee.id, employeeCode: "EV-BRAVO-001", team: "team:bravo" }]).onConflictDoNothing();
});

afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

async function notificationCount(recipientUserId: string, eventType: string, relatedRecordId: string) {
  return (await db.select().from(notifications).where(and(eq(notifications.recipientUserId, recipientUserId), eq(notifications.eventType, eventType), eq(notifications.relatedRecordId, relatedRecordId)))).length;
}
async function auditCount(action: string, targetId: string) { return (await db.select().from(auditEvents).where(and(eq(auditEvents.action, action), eq(auditEvents.targetId, targetId)))).length; }

describe("Phase 9 capability evidence service", () => {
  it("saves immediately, notifies every active Super Admin, and audits without content", async () => {
    const { evidence, deduplicated } = await service().create(cora, phase9Evidence.certification);
    expect(deduplicated).toBe(false);
    expect(evidence.reviewState).toBe("unreviewed");
    expect(evidence.lastSubmittedAt).toBeInstanceOf(Date);
    expect(await notificationCount("mock-super-admin-nora", "evidence.created", evidence.id)).toBe(1);
    expect(await auditCount("evidence.created", evidence.id)).toBe(1);
    const [event] = await db.select().from(auditEvents).where(eq(auditEvents.targetId, evidence.id));
    const metadata = JSON.stringify(event.metadata);
    expect(metadata).not.toContain(phase9Evidence.certification.title);
    expect(metadata).not.toContain(phase9Evidence.certification.issuer!);
    const mine = await service().listMine(cora);
    expect(mine.items.find((item) => item.id === evidence.id)).toMatchObject({ isNewOrUpdated: true, expiryStatus: "valid", reviewState: "unreviewed" });
  });

  it("treats a repeated submission key as one submission", async () => {
    const input = { ...phase9Evidence.portfolio, submissionKey: "retry-key-0001" };
    const first = await service().create(cora, input);
    const second = await service().create(cora, input);
    expect(second.deduplicated).toBe(true);
    expect(second.evidence.id).toBe(first.evidence.id);
    expect((await db.select().from(employeeEvidence).where(eq(employeeEvidence.submissionKey, "retry-key-0001"))).length).toBe(1);
    expect(await notificationCount("mock-super-admin-nora", "evidence.created", first.evidence.id)).toBe(1);
  });

  it("keeps exactly one active CV per owner and archives the previous one", async () => {
    const first = await service().create(cora, phase9Evidence.cv);
    const second = await service().create(cora, { ...phase9Evidence.cv, title: "Fictional CV (replacement)" });
    const active = await db.select().from(employeeEvidence).where(and(eq(employeeEvidence.ownerUserId, cora.id), eq(employeeEvidence.kind, "cv"), isNull(employeeEvidence.archivedAt)));
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(second.evidence.id);
    const archived = await db.select().from(employeeEvidence).where(eq(employeeEvidence.id, first.evidence.id));
    expect(archived[0].archivedAt).toBeInstanceOf(Date);
    const [inserted, replaced] = await Promise.all([service().create(cora, { ...phase9Evidence.cv, title: "Fictional CV (concurrent A)" }), service().create(cora, { ...phase9Evidence.cv, title: "Fictional CV (concurrent B)" })]);
    expect(inserted.evidence.id).not.toBe(replaced.evidence.id);
    expect((await db.select().from(employeeEvidence).where(and(eq(employeeEvidence.ownerUserId, cora.id), eq(employeeEvidence.kind, "cv"), isNull(employeeEvidence.archivedAt)))).length).toBe(1);
  });

  it("derives expiry status and marks an edit as new or updated again", async () => {
    const { evidence } = await service().create(cora, phase9Evidence.expiredCertification);
    const mine = await service().listMine(cora);
    expect(mine.items.find((item) => item.id === evidence.id)?.expiryStatus).toBe("expired");
    await service().review(nora, { evidenceId: evidence.id, expectedVersion: evidence.version, state: "reviewed" });
    const afterReview = await service().listMine(cora);
    expect(afterReview.items.find((item) => item.id === evidence.id)?.isNewOrUpdated).toBe(false);
    const updated = await service().update(cora, { evidenceId: evidence.id, expectedVersion: evidence.version + 1, title: "Fictional Expired Certification (edited)", issuer: "Fictional Safety Institute", issueDate: "2024-01-01", expiryDate: "2025-01-01" });
    expect(updated.evidence.version).toBe(evidence.version + 2);
    const afterEdit = await service().listMine(cora);
    expect(afterEdit.items.find((item) => item.id === evidence.id)?.isNewOrUpdated).toBe(true);
    expect(await notificationCount("mock-super-admin-nora", "evidence.updated", evidence.id)).toBe(1);
  });

  it("runs the review lifecycle with consistent provenance and audit", async () => {
    const { evidence } = await service().create(cora, { ...phase9Evidence.supportingDocument, title: "Fictional Lifecycle Record" });
    const reviewed = await service().review(nora, { evidenceId: evidence.id, expectedVersion: evidence.version, state: "reviewed" });
    expect(reviewed.evidence).toMatchObject({ reviewState: "reviewed", reviewedByUserId: nora.id, verifiedAt: null });
    const verified = await service().review(nora, { evidenceId: evidence.id, expectedVersion: reviewed.evidence.version, state: "verified" });
    expect(verified.evidence).toMatchObject({ reviewState: "verified", verifiedByUserId: nora.id });
    expect(verified.evidence.verifiedAt).toBeInstanceOf(Date);
    expect(verified.evidence.lastSubmittedAt).toEqual(evidence.lastSubmittedAt);
    const removed = await service().review(nora, { evidenceId: evidence.id, expectedVersion: verified.evidence.version, state: "reviewed" });
    expect(removed.evidence).toMatchObject({ reviewState: "reviewed", verifiedByUserId: null, verifiedAt: null });
    const reset = await service().review(nora, { evidenceId: evidence.id, expectedVersion: removed.evidence.version, state: "unreviewed" });
    expect(reset.evidence).toMatchObject({ reviewState: "unreviewed", reviewedByUserId: null, reviewedAt: null });
    expect(await auditCount("evidence.reviewed", evidence.id)).toBe(1);
    expect(await auditCount("evidence.verified", evidence.id)).toBe(1);
    expect(await auditCount("evidence.verification_removed", evidence.id)).toBe(1);
    expect(await auditCount("evidence.review_reset", evidence.id)).toBe(1);
    expect(await notificationCount(cora.id, "evidence.verified", evidence.id)).toBe(1);
    await expect(service().review(ava, { evidenceId: evidence.id, expectedVersion: reset.evidence.version, state: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service().review(nora, { evidenceId: evidence.id, expectedVersion: evidence.version, state: "verified" })).rejects.toMatchObject({ code: "STALE_VERSION" });
  });

  it("locks the privacy matrix to owner, Super Admin, and certification-summary-only scoped Admin", async () => {
    const { evidence } = await service().create(cora, { ...phase9Evidence.certification, title: "Fictional Scoped Summary", externalUrl: undefined, details: "Private narrative that must not project" });
    const attached = await service().attachFile(cora, { evidenceId: evidence.id, expectedVersion: evidence.version, bytes: evidenceFixtures.pdf("scoped"), contentType: "application/pdf", filename: "Scoped Evidence.pdf" });

    const ownerView = await service().listMine(cora);
    expect(ownerView.items.find((item) => item.id === evidence.id)?.files).toHaveLength(1);

    const superAdmin = await service().listForEmployee(nora, cora.id);
    expect(superAdmin.full?.find((item) => item.id === evidence.id)?.details).toContain("Private narrative");
    expect(superAdmin.certificationSummary).toBeNull();

    const scoped = await service().listForEmployee(ava, cora.id);
    const summary = scoped.certificationSummary!.find((row) => row.id === evidence.id)!;
    expect(summary).toMatchObject({ title: "Fictional Scoped Summary", reviewState: "unreviewed" });
    expect(JSON.stringify(scoped.certificationSummary)).not.toContain("Private narrative");
    expect(JSON.stringify(scoped.certificationSummary)).not.toContain("Scoped Evidence.pdf");
    expect(JSON.stringify(scoped.certificationSummary)).not.toContain("files");
    expect(Object.keys(summary)).not.toContain("externalUrl");
    expect(Object.keys(summary)).not.toContain("details");

    // Cross-team Admin, other employee, and direct writes are non-enumerating.
    await expect(service().listForEmployee(ben, cora.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service().listForEmployee(cora, bravoEmployee.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service().listForEmployee(bravoEmployee, cora.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service().update(bravoEmployee, { evidenceId: evidence.id, expectedVersion: attached.evidence.version, title: "Hijack" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service().archive(bravoEmployee, { evidenceId: evidence.id, expectedVersion: attached.evidence.version })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("stores private bytes, keeps file history, and authorizes every read", async () => {
    const { evidence } = await service().create(cora, { ...phase9Evidence.supportingDocument, title: "Fictional File Journey" });
    const first = await service().attachFile(cora, { evidenceId: evidence.id, expectedVersion: evidence.version, bytes: evidenceFixtures.pdf("v1"), contentType: "application/pdf", filename: "Journey Evidence.pdf" });
    expect(first.file.version).toBe(1);
    expect(first.file.uploaderUserId).toBe(cora.id);

    const delivered = await service().readFile(cora, first.file.id);
    expect(delivered.disposition).toBe("inline");
    expect(delivered.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(new TextDecoder().decode(delivered.bytes)).toContain("%PDF-1.4");
    expect(JSON.stringify(delivered)).not.toContain("storageKey");
    expect(JSON.stringify(delivered)).not.toContain(first.file.storageKey);

    const replaced = await service().attachFile(cora, { evidenceId: evidence.id, expectedVersion: first.evidence.version, replaceFileId: first.file.id, bytes: evidenceFixtures.png(), contentType: "image/png", filename: "Journey Evidence.png" });
    expect(replaced.file.version).toBe(2);
    const files = await db.select().from(employeeFiles).where(eq(employeeFiles.evidenceId, evidence.id));
    expect(files).toHaveLength(2);
    expect(files.filter((file) => file.archivedAt === null)).toHaveLength(1);
    expect(await auditCount("evidence.file_attached", evidence.id)).toBe(1);
    expect(await auditCount("evidence.file_replaced", evidence.id)).toBe(1);

    const superAdminRead = await service().readFile(nora, replaced.file.id);
    expect(superAdminRead.evidenceId).toBe(evidence.id);
    expect(await auditCount("evidence.file_read_by_reviewer", evidence.id)).toBe(1);
    await expect(service().readFile(ava, replaced.file.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service().readFile(bravoEmployee, replaced.file.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service().readFile(cora, "00000000-0000-4000-8000-000000000999")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service().readFile(cora, "../../etc/passwd")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service().attachFile(cora, { evidenceId: evidence.id, expectedVersion: evidence.version, bytes: evidenceFixtures.pdf(), contentType: "application/pdf", filename: "Stale.pdf" })).rejects.toMatchObject({ code: "STALE_VERSION" });
    await expect(service().attachFile(cora, { evidenceId: evidence.id, expectedVersion: replaced.evidence.version, bytes: evidenceFixtures.spoofedPdf(), contentType: "application/pdf", filename: "Spoof.pdf" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rolls back and compensates on storage, notification, and audit failure", async () => {
    const putKeys: string[] = [];
    const tracking: EvidenceStorage = {
      async put(input) { putKeys.push(input.storageKey); await storage.put(input); },
      read: (key) => storage.read(key),
      remove: (key) => storage.remove(key),
    };
    const failingStorage: EvidenceStorage = { async put() { throw new Error("storage unavailable"); }, read: () => storage.read(""), remove: () => storage.remove("") };

    // Storage failure before commit leaves no row at all.
    const storageFailureService = new EvidenceService(writeAuditEvent, createNotification, () => failingStorage);
    const target = await service().create(cora, { ...phase9Evidence.supportingDocument, title: "Fictional Compensation Target" });
    await expect(storageFailureService.attachFile(cora, { evidenceId: target.evidence.id, expectedVersion: target.evidence.version, bytes: evidenceFixtures.pdf(), contentType: "application/pdf", filename: "Compensation.pdf" })).rejects.toMatchObject({ code: "STORAGE_FAILURE" });
    expect(await db.select().from(employeeFiles).where(eq(employeeFiles.evidenceId, target.evidence.id))).toHaveLength(0);

    // Notification failure after the storage write aborts the change and removes the private object.
    const failingNotification = new EvidenceService(writeAuditEvent, async () => { throw new Error("forced notification failure"); }, () => tracking);
    await expect(failingNotification.attachFile(cora, { evidenceId: target.evidence.id, expectedVersion: target.evidence.version, bytes: evidenceFixtures.pdf("compensate"), contentType: "application/pdf", filename: "Compensation.pdf" })).rejects.toThrow("forced notification failure");
    expect(await db.select().from(employeeFiles).where(eq(employeeFiles.evidenceId, target.evidence.id))).toHaveLength(0);
    expect(putKeys).toHaveLength(1);
    expect(await storage.read(putKeys[0])).toBeNull();
    const stillCurrent = await db.select().from(employeeEvidence).where(eq(employeeEvidence.id, target.evidence.id));
    expect(stillCurrent[0].version).toBe(target.evidence.version);

    // Audit failure rolls back the submission and its notification.
    const failingAudit = new EvidenceService(async () => { throw new Error("forced audit failure"); }, createNotification, () => storage);
    await expect(failingAudit.create(cora, { ...phase9Evidence.supportingDocument, title: "Fictional Audit Rollback" })).rejects.toThrow("forced audit failure");
    expect(await db.select().from(employeeEvidence).where(eq(employeeEvidence.title, "Fictional Audit Rollback"))).toHaveLength(0);
    expect(await notificationCount("mock-super-admin-nora", "evidence.created", "unknown")).toBe(0);

    // A failed review never half-applies.
    const reviewTarget = await service().create(cora, { ...phase9Evidence.supportingDocument, title: "Fictional Review Rollback" });
    await expect(new EvidenceService(async () => { throw new Error("forced audit failure"); }, createNotification, () => storage).review(nora, { evidenceId: reviewTarget.evidence.id, expectedVersion: reviewTarget.evidence.version, state: "verified" })).rejects.toThrow("forced audit failure");
    const unchanged = await db.select().from(employeeEvidence).where(eq(employeeEvidence.id, reviewTarget.evidence.id));
    expect(unchanged[0].reviewState).toBe("unreviewed");
    expect(unchanged[0].verifiedAt).toBeNull();
  });

  it("archives without deleting history and blocks mutations afterwards", async () => {
    const { evidence } = await service().create(cora, { ...phase9Evidence.projectExample, title: "Fictional Archive Journey" });
    const archived = await service().archive(cora, { evidenceId: evidence.id, expectedVersion: evidence.version });
    expect(archived.evidence.archivedAt).toBeInstanceOf(Date);
    expect(await auditCount("evidence.archived", evidence.id)).toBe(1);
    await expect(service().update(cora, { evidenceId: evidence.id, expectedVersion: archived.evidence.version, title: "Should not apply" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await db.select().from(employeeEvidence).where(eq(employeeEvidence.id, evidence.id))).length).toBe(1);
  });

  it("does not change Phase 7 coverage results when evidence is verified", async () => {
    const period = await schedulingService.createPeriod(nora, { clientId: phase3Ids.alphaClient, month: "2026-11" });
    const assignment = await schedulingService.addAssignment(nora, { periodId: period.id, expectedPeriodVersion: period.version, employeeUserId: cora.id, projectId: phase3Ids.alphaProjectOne, locationId: phase3Ids.alphaLocation, assignmentDate: "2026-11-10", startTime: "09:00", endTime: "10:00" });
    const before = JSON.stringify(await coverageService.gaps(nora, assignment.id));
    const { evidence } = await service().create(cora, { kind: "certification", title: "Fictional Coverage Separation", issuer: "Fictional Institute", issueDate: "2026-01-01", expiryDate: "2027-01-01" });
    await service().review(nora, { evidenceId: evidence.id, expectedVersion: evidence.version, state: "verified" });
    const after = JSON.stringify(await coverageService.gaps(nora, assignment.id));
    expect(after).toBe(before);
    const [skill] = await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, cora.id));
    expect(skill.userId).toBe(cora.id);
  });
});
