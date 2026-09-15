import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { employeeEvidence, employeeFiles, employeeProfiles, skills, users } from "@/db/schema";

export type EvidenceTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type EvidenceExecutor = typeof db | EvidenceTransaction;

export const evidenceRepository = {
  /** Serializes owner-scoped evidence mutations so CV uniqueness and version bumps cannot race. */
  lockOwner(tx: EvidenceTransaction, ownerUserId: string) { return tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`evidence:${ownerUserId}`}))`); },
  /** Locks one evidence row for read-modify-write within a transaction. */
  lockEvidence(tx: EvidenceTransaction, evidenceId: string) { return tx.execute(sql`select id from employee_evidence where id = ${evidenceId} for update`); },

  evidenceById(executor: EvidenceExecutor, evidenceId: string) { return executor.select().from(employeeEvidence).where(eq(employeeEvidence.id, evidenceId)).limit(1).then(([row]) => row ?? null); },
  fileById(executor: EvidenceExecutor, fileId: string) { return executor.select().from(employeeFiles).where(eq(employeeFiles.id, fileId)).limit(1).then(([row]) => row ?? null); },
  activeFiles(executor: EvidenceExecutor, evidenceId: string) { return executor.select().from(employeeFiles).where(and(eq(employeeFiles.evidenceId, evidenceId), isNull(employeeFiles.archivedAt))).orderBy(desc(employeeFiles.version)); },

  ownerEvidence(executor: EvidenceExecutor, ownerUserId: string, includeArchived: boolean) {
    const where = includeArchived ? eq(employeeEvidence.ownerUserId, ownerUserId) : and(eq(employeeEvidence.ownerUserId, ownerUserId), isNull(employeeEvidence.archivedAt));
    return executor.select({ evidence: employeeEvidence, skillName: skills.name }).from(employeeEvidence).leftJoin(skills, eq(skills.id, employeeEvidence.relatedSkillId)).where(where).orderBy(desc(employeeEvidence.createdAt));
  },
  employeeEvidenceForManagement(executor: EvidenceExecutor, ownerUserId: string) {
    return executor.select({ evidence: employeeEvidence, skillName: skills.name }).from(employeeEvidence).leftJoin(skills, eq(skills.id, employeeEvidence.relatedSkillId))
      .where(and(eq(employeeEvidence.ownerUserId, ownerUserId), isNull(employeeEvidence.archivedAt))).orderBy(desc(employeeEvidence.createdAt));
  },
  filesForEvidence(executor: EvidenceExecutor, evidenceIds: string[]) {
    if (!evidenceIds.length) return Promise.resolve([] as (typeof employeeFiles.$inferSelect)[]);
    return executor.select().from(employeeFiles).where(inArray(employeeFiles.evidenceId, evidenceIds)).orderBy(asc(employeeFiles.version));
  },

  activeCv(executor: EvidenceExecutor, ownerUserId: string) {
    return executor.select().from(employeeEvidence).where(and(eq(employeeEvidence.ownerUserId, ownerUserId), eq(employeeEvidence.kind, "cv"), isNull(employeeEvidence.archivedAt))).limit(1).then(([row]) => row ?? null);
  },
  bySubmissionKey(executor: EvidenceExecutor, ownerUserId: string, submissionKey: string) {
    return executor.select().from(employeeEvidence).where(and(eq(employeeEvidence.ownerUserId, ownerUserId), eq(employeeEvidence.submissionKey, submissionKey))).limit(1).then(([row]) => row ?? null);
  },

  createEvidence(tx: EvidenceTransaction, values: typeof employeeEvidence.$inferInsert) { return tx.insert(employeeEvidence).values(values).returning().then(([row]) => row!); },
  updateEvidence(tx: EvidenceTransaction, id: string, expectedVersion: number, values: Partial<typeof employeeEvidence.$inferInsert>) {
    return tx.update(employeeEvidence).set({ ...values, version: sql`${employeeEvidence.version} + 1`, updatedAt: new Date() })
      .where(and(eq(employeeEvidence.id, id), eq(employeeEvidence.version, expectedVersion), isNull(employeeEvidence.archivedAt))).returning().then(([row]) => row ?? null);
  },
  archiveEvidence(tx: EvidenceTransaction, id: string, expectedVersion: number) {
    return tx.update(employeeEvidence).set({ archivedAt: new Date(), version: sql`${employeeEvidence.version} + 1`, updatedAt: new Date() })
      .where(and(eq(employeeEvidence.id, id), eq(employeeEvidence.version, expectedVersion), isNull(employeeEvidence.archivedAt))).returning().then(([row]) => row ?? null);
  },

  nextFileVersion(executor: EvidenceExecutor, evidenceId: string) {
    return executor.select({ next: sql<number>`coalesce(max(${employeeFiles.version}), 0) + 1` }).from(employeeFiles).where(eq(employeeFiles.evidenceId, evidenceId)).then(([row]) => Number(row?.next ?? 1));
  },
  createFile(tx: EvidenceTransaction, values: typeof employeeFiles.$inferInsert) { return tx.insert(employeeFiles).values(values).returning().then(([row]) => row!); },
  archiveFile(tx: EvidenceTransaction, fileId: string) {
    return tx.update(employeeFiles).set({ archivedAt: new Date() }).where(and(eq(employeeFiles.id, fileId), isNull(employeeFiles.archivedAt))).returning().then(([row]) => row ?? null);
  },

  /** TEAM/role facts for the employee whose evidence is being read, so policy uses the canonical record. */
  employeeAccessRecord(executor: EvidenceExecutor, userId: string) {
    return executor.select({ userId: users.id, role: users.role, team: employeeProfiles.team }).from(users).leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).where(eq(users.id, userId)).limit(1).then(([row]) => row ?? null);
  },
  activeSuperAdmins(executor: EvidenceExecutor) { return executor.select({ id: users.id }).from(users).where(and(eq(users.role, "SUPER_ADMIN"), eq(users.active, true))); },
  activeSkillIds(executor: EvidenceExecutor) { return executor.select({ id: skills.id }).from(skills).where(eq(skills.active, true)); },
  /** Active catalogue skill options for evidence related-skill metadata (names only; no privacy impact). */
  activeSkillOptions(executor: EvidenceExecutor) { return executor.select({ id: skills.id, name: skills.name }).from(skills).where(eq(skills.active, true)).orderBy(asc(skills.name)); },
};
