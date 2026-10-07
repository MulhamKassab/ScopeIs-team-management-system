import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminScopeGrants, auditEvents, employeeManagementNotes, employeeProfiles, notifications, users } from "@/db/schema";
import { managementNoteService } from "@/modules/notes/service";
import type { AuthenticatedActor, SystemRole } from "@/shared/types/foundation";

/**
 * Post-Phase-10 access-control remediation.
 *
 * Approved rule: management-note access requires BOTH note-level visibility permission AND current
 * authorization to manage/read the subject. Authorship never overrides current role or scope.
 *
 * This suite owns a dedicated fictional subject so its note counts are exact, and it mutates the
 * database (role, active flag, TEAM grants) between calls to prove authorization is evaluated at
 * request time rather than taken from the caller-supplied actor object.
 */

// Dedicated fictional actors keep this suite fully isolated from the shared Phase 10 fixture personas,
// so its note counts and grant mutations can never disturb another integration file.
const authorId = "phase10-authz-admin";
const peerAdminId = "phase10-authz-peer-admin";
const superAdminId = "mock-super-admin-nora";
const secondSuperAdminId = "phase10-authz-super-admin-two";
const subjectId = "phase10-authz-subject";
const missingNoteId = "00000000-0000-4000-8000-0000000000ff";

const actor = (id: string, role: SystemRole): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `s-${id}`, sessionVersion: 1, scopes: [], authenticationMode: "mock" });
const author = () => actor(authorId, "ADMIN");
const superAdmin = () => actor(superAdminId, "SUPER_ADMIN");
const secondSuperAdmin = () => actor(secondSuperAdminId, "SUPER_ADMIN");

const privateContent = "Fictional private remediation note";
const sharedContent = "Fictional shared-upward remediation note";
const archiveReason = "Fictional superseded remediation note";

let privateNoteId = "";
let sharedNoteId = "";
let privateNoteVersion = 1;
let sharedNoteVersion = 1;

/** Canonical non-enumerating refusal: identical code, status, and message for forbidden and missing ids. */
async function refusalOf(operation: () => Promise<unknown>) {
  try { await operation(); return null; }
  catch (error) {
    const typed = error as { code?: string; status?: number; message?: string };
    return { code: typed.code, status: typed.status, message: typed.message };
  }
}

async function setActiveTeamGrants(userId: string, references: string[]) {
  // Only TEAM grants are touched: a CLIENT/PROJECT/LOCATION grant shares this table and must survive.
  await db.update(adminScopeGrants).set({ active: false, updatedAt: new Date() }).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.scopeType, "TEAM")));
  for (const reference of references) {
    const existing = (await db.select().from(adminScopeGrants).where(and(eq(adminScopeGrants.userId, userId), eq(adminScopeGrants.scopeType, "TEAM"), eq(adminScopeGrants.scopeReference, reference))))[0];
    if (existing) await db.update(adminScopeGrants).set({ active: true, updatedAt: new Date() }).where(eq(adminScopeGrants.id, existing.id));
    else await db.insert(adminScopeGrants).values({ userId, scopeType: "TEAM", scopeReference: reference });
  }
}

const setRole = (userId: string, role: SystemRole) => db.update(users).set({ role }).where(eq(users.id, userId));
const setActive = (userId: string, active: boolean) => db.update(users).set({ active }).where(eq(users.id, userId));

/** Restores the shared fixture personas and the dedicated subject after each mutating scenario. */
async function restoreFixtures() {
  await setRole(authorId, "ADMIN");
  await setActive(authorId, true);
  await setActiveTeamGrants(authorId, ["team:alpha"]);
  await setActiveTeamGrants(peerAdminId, []);
  await setRole(subjectId, "EMPLOYEE");
  await setActiveTeamGrants(subjectId, []);
}

beforeAll(async () => {
  await db.insert(users).values({ id: secondSuperAdminId, displayName: "Fictional Second Super Admin", role: "SUPER_ADMIN" }).onConflictDoNothing();
  await db.insert(users).values({ id: subjectId, displayName: "Fictional Authorization Subject", role: "EMPLOYEE" }).onConflictDoNothing();
  await db.insert(employeeProfiles).values({ userId: subjectId, employeeCode: "P10-AUTHZ-1", team: "team:alpha" }).onConflictDoNothing();
  await db.insert(users).values({ id: authorId, displayName: "Fictional Authorization Admin", role: "ADMIN" }).onConflictDoNothing();
  await db.insert(employeeProfiles).values({ userId: authorId, employeeCode: "P10-AUTHZ-2", team: "team:alpha" }).onConflictDoNothing();
  await db.insert(users).values({ id: peerAdminId, displayName: "Fictional Authorization Peer Admin", role: "ADMIN" }).onConflictDoNothing();
  await db.insert(employeeProfiles).values({ userId: peerAdminId, employeeCode: "P10-AUTHZ-3", team: "team:bravo" }).onConflictDoNothing();
  await restoreFixtures();
  const priv = await managementNoteService.create(author(), { subjectUserId: subjectId, visibility: "private_to_author", content: privateContent });
  const shared = await managementNoteService.create(author(), { subjectUserId: subjectId, visibility: "shared_upward", content: sharedContent });
  privateNoteId = priv.note.id; privateNoteVersion = priv.note.version;
  sharedNoteId = shared.note.id; sharedNoteVersion = shared.note.version;
});

afterAll(async () => { await restoreFixtures(); });

describe("Post-Phase-10 management-note authorization", () => {
  it("1. lets an authorized Admin author read their own private note while still in scope", async () => {
    const listed = await managementNoteService.listForSubject(author(), subjectId);
    expect(listed.notes.map((note) => note.id).sort()).toEqual([privateNoteId, sharedNoteId].sort());
    expect((await managementNoteService.listAuthoredByActor(author())).notes.map((note) => note.id).sort()).toEqual([privateNoteId, sharedNoteId].sort());
    expect((await managementNoteService.countVisibleForSubject(author(), subjectId)).count).toBe(2);
  });

  it("2. removes access immediately after the author's TEAM grant is revoked", async () => {
    await setActiveTeamGrants(authorId, []);
    try {
      expect(await refusalOf(() => managementNoteService.listForSubject(author(), subjectId))).toMatchObject({ code: "NOT_FOUND", status: 404 });
      expect((await managementNoteService.listAuthoredByActor(author())).notes).toEqual([]);
      expect(await refusalOf(() => managementNoteService.countVisibleForSubject(author(), subjectId))).toMatchObject({ code: "NOT_FOUND", status: 404 });
      // The stored note is untouched: only the reader lost access.
      expect((await db.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.id, privateNoteId)))[0]?.content).toBe(privateContent);
    } finally { await restoreFixtures(); }
  });

  it("3. removes access after the author is demoted to Employee", async () => {
    await setRole(authorId, "EMPLOYEE");
    try {
      expect(await refusalOf(() => managementNoteService.listForSubject(author(), subjectId))).toMatchObject({ code: "NOT_FOUND" });
      expect((await managementNoteService.listAuthoredByActor(author())).notes).toEqual([]);
      expect(await refusalOf(() => managementNoteService.archive(author(), { noteId: sharedNoteId, expectedVersion: sharedNoteVersion, reason: archiveReason }))).toMatchObject({ code: "NOT_FOUND" });
      expect((await db.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.id, sharedNoteId)))[0]?.archivedAt).toBeNull();
    } finally { await restoreFixtures(); }
  });

  it("4. restores access only through current role and scope", async () => {
    await setActiveTeamGrants(authorId, []);
    try { expect(await refusalOf(() => managementNoteService.listForSubject(author(), subjectId))).toMatchObject({ code: "NOT_FOUND" }); }
    finally { await restoreFixtures(); }
    expect((await managementNoteService.listAuthoredByActor(author())).notes.map((note) => note.id).sort()).toEqual([privateNoteId, sharedNoteId].sort());
  });

  it("5. refuses a disabled or inactive author, even for their own note", async () => {
    await setActive(authorId, false);
    try {
      expect(await refusalOf(() => managementNoteService.listForSubject(author(), subjectId))).toMatchObject({ code: "NOT_FOUND", status: 404 });
      expect(await refusalOf(() => managementNoteService.listAuthoredByActor(author()))).toMatchObject({ code: "NOT_FOUND", status: 404 });
      expect(await refusalOf(() => managementNoteService.archive(author(), { noteId: privateNoteId, expectedVersion: privateNoteVersion, reason: archiveReason }))).toMatchObject({ code: "NOT_FOUND" });
      expect(await refusalOf(() => managementNoteService.create(author(), { subjectUserId: subjectId, visibility: "private_to_author", content: "Fictional inactive create" }))).toMatchObject({ code: "NOT_FOUND" });
    } finally { await restoreFixtures(); }
    expect((await managementNoteService.listForSubject(author(), subjectId)).notes).toHaveLength(2);
  });

  it("6. refuses an Admin moved to another team", async () => {
    await setActiveTeamGrants(authorId, ["team:bravo"]);
    try {
      expect(await refusalOf(() => managementNoteService.listForSubject(author(), subjectId))).toMatchObject({ code: "NOT_FOUND" });
      expect((await managementNoteService.listAuthoredByActor(author())).notes).toEqual([]);
    } finally { await restoreFixtures(); }
  });

  it("7. refuses peer Admins for both private and shared-upward notes", async () => {
    // The peer Admin holds the subject's TEAM scope and still cannot read another Admin's notes.
    await setActiveTeamGrants(peerAdminId, ["team:alpha"]);
    try {
      expect((await managementNoteService.listForSubject(actor(peerAdminId, "ADMIN"), subjectId)).notes).toEqual([]);
      expect((await managementNoteService.countVisibleForSubject(actor(peerAdminId, "ADMIN"), subjectId)).count).toBe(0);
      expect(await refusalOf(() => managementNoteService.archive(actor(peerAdminId, "ADMIN"), { noteId: sharedNoteId, expectedVersion: sharedNoteVersion, reason: archiveReason }))).toMatchObject({ code: "NOT_FOUND" });
    } finally { await restoreFixtures(); }
  });

  it("8. lets a Super Admin read an authorized shared-upward note", async () => {
    const listed = await managementNoteService.listForSubject(superAdmin(), subjectId);
    expect(listed.notes.map((note) => note.id)).toEqual([sharedNoteId]);
    expect(listed.notes[0]?.content).toBe(sharedContent);
  });

  it("9. refuses another Super Admin a private-to-author note", async () => {
    const listed = await managementNoteService.listForSubject(secondSuperAdmin(), subjectId);
    expect(listed.notes.map((note) => note.id)).toEqual([sharedNoteId]);
    expect(listed.notes.some((note) => note.content === privateContent)).toBe(false);
    expect(await refusalOf(() => managementNoteService.archive(secondSuperAdmin(), { noteId: privateNoteId, expectedVersion: privateNoteVersion, reason: archiveReason }))).toMatchObject({ code: "NOT_FOUND" });
    expect((await db.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.id, privateNoteId)))[0]?.archivedAt).toBeNull();
  });

  it("10. never re-admits the subject after a role or scope change", async () => {
    await setRole(subjectId, "ADMIN");
    await setActiveTeamGrants(subjectId, ["team:alpha"]);
    try {
      expect(await refusalOf(() => managementNoteService.listForSubject(actor(subjectId, "ADMIN"), subjectId))).toMatchObject({ code: "NOT_FOUND" });
      expect(await refusalOf(() => managementNoteService.listForSubject(actor(subjectId, "SUPER_ADMIN"), subjectId))).toMatchObject({ code: "NOT_FOUND" });
      expect((await managementNoteService.listAuthoredByActor(actor(subjectId, "ADMIN"))).notes).toEqual([]);
      expect(await refusalOf(() => managementNoteService.countVisibleForSubject(actor(subjectId, "ADMIN"), subjectId))).toMatchObject({ code: "NOT_FOUND" });
      expect(await refusalOf(() => managementNoteService.archive(actor(subjectId, "ADMIN"), { noteId: sharedNoteId, expectedVersion: sharedNoteVersion, reason: archiveReason }))).toMatchObject({ code: "NOT_FOUND" });
    } finally { await restoreFixtures(); }
  });

  it("11. enforces identical rules for list, direct id, count, archive, and manipulated input", async () => {
    await setActiveTeamGrants(authorId, []);
    try {
      const outOfScopeList = await refusalOf(() => managementNoteService.listForSubject(author(), subjectId));
      const outOfScopeDirect = await refusalOf(() => managementNoteService.archive(author(), { noteId: sharedNoteId, expectedVersion: sharedNoteVersion, reason: archiveReason }));
      const missingDirect = await refusalOf(() => managementNoteService.archive(author(), { noteId: missingNoteId, expectedVersion: 1, reason: archiveReason }));
      const missingList = await refusalOf(() => managementNoteService.listForSubject(author(), "phase10-nonexistent-subject"));
      const outOfScopeCount = await refusalOf(() => managementNoteService.countVisibleForSubject(author(), subjectId));
      const messages = new Set([outOfScopeList?.message, outOfScopeDirect?.message, missingDirect?.message, missingList?.message, outOfScopeCount?.message]);
      expect(messages).toEqual(new Set(["The requested note was not found."]));
      const statuses = new Set([outOfScopeList?.status, outOfScopeDirect?.status, missingDirect?.status, missingList?.status, outOfScopeCount?.status]);
      expect(statuses).toEqual(new Set([404]));
      expect((await managementNoteService.listAuthoredByActor(author())).notes).toEqual([]);
    } finally { await restoreFixtures(); }
    // Authorized reads still succeed after the denials, proving the refusals had no side effect.
    expect((await managementNoteService.listForSubject(author(), subjectId)).notes).toHaveLength(2);
  });

  it("12. keeps every denial non-enumerating and free of note content", async () => {
    await setRole(authorId, "EMPLOYEE");
    try {
      const refusals = await Promise.all([
        refusalOf(() => managementNoteService.listForSubject(author(), subjectId)),
        refusalOf(() => managementNoteService.archive(author(), { noteId: privateNoteId, expectedVersion: privateNoteVersion, reason: archiveReason })),
        refusalOf(() => managementNoteService.listForSubject(author(), "phase10-nonexistent-subject")),
        refusalOf(() => managementNoteService.countVisibleForSubject(author(), subjectId)),
      ]);
      for (const refusal of refusals) {
        expect(refusal).not.toBeNull();
        expect(refusal?.message).not.toContain(privateContent);
        expect(refusal?.message).not.toContain(sharedContent);
        expect(refusal?.status).toBe(404);
      }
    } finally { await restoreFixtures(); }
  });

  it("13. never writes note content into audit metadata or notifications", async () => {
    const privateAudit = JSON.stringify((await db.select().from(auditEvents).where(eq(auditEvents.targetId, privateNoteId))).map((event) => event.metadata));
    expect(privateAudit).not.toContain(privateContent);
    const sharedAudit = JSON.stringify((await db.select().from(auditEvents).where(eq(auditEvents.targetId, sharedNoteId))).map((event) => event.metadata));
    expect(sharedAudit).not.toContain(sharedContent);
    // Management notes create no notification, so nothing can leak through a notification payload.
    expect(await db.select().from(notifications).where(eq(notifications.relatedRecordId, privateNoteId))).toHaveLength(0);
    expect(await db.select().from(notifications).where(eq(notifications.relatedRecordId, sharedNoteId))).toHaveLength(0);
  });

  it("14. preserves historical authorship and never rewrites stored history", async () => {
    expect((await db.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.id, privateNoteId)))[0]).toMatchObject({ authorUserId: authorId, authorRole: "ADMIN", visibility: "private_to_author", content: privateContent, archivedAt: null });
    expect((await db.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.id, sharedNoteId)))[0]).toMatchObject({ authorUserId: authorId, authorRole: "ADMIN", visibility: "shared_upward", content: sharedContent, archivedAt: null });
  });

  it("15. applies the same current-authorization rule to archive authority", async () => {
    // The current author, still authorized, may archive their own shared-upward note.
    const archived = await managementNoteService.archive(author(), { noteId: sharedNoteId, expectedVersion: sharedNoteVersion, reason: archiveReason });
    expect(archived.note.archivedAt).toBeInstanceOf(Date);
    expect((await db.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.id, sharedNoteId)))[0]?.content).toBe(sharedContent);
    // Archive is not restoration: a stale or repeated archive is refused and history stays stored.
    expect(await refusalOf(() => managementNoteService.archive(author(), { noteId: sharedNoteId, expectedVersion: sharedNoteVersion, reason: archiveReason }))).toMatchObject({ code: "NOT_FOUND" });
    expect(await db.select().from(auditEvents).where(and(eq(auditEvents.action, "management_note.archived"), eq(auditEvents.targetId, sharedNoteId)))).toHaveLength(1);
  });
});
