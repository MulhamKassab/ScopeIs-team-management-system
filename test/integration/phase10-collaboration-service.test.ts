import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEvents, discussionMessages, discussionThreads, employeeManagementNotes, notifications, operationalNotes, replacementRequests, users } from "@/db/schema";
import { auditService } from "@/modules/audit/service";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { DiscussionService } from "@/modules/discussions/service";
import { discussionService } from "@/modules/discussions/service";
import { discussionRepository } from "@/modules/discussions/repositories";
import { ManagementNoteService, managementNoteService } from "@/modules/notes/service";
import { notificationService } from "@/modules/notifications/service";
import { operationalService } from "@/modules/operations/service";
import { operationalRepository } from "@/modules/operations/repositories";
import { phase3Ids, phase4Ids, phase10Ids, phase10Notes } from "../../scripts/phase10-test-fixtures.mjs";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const actor = (id: string, role: AuthenticatedActor["role"], scopes: AuthenticatedActor["scopes"] = []): AuthenticatedActor => ({ id, role, displayName: id, sessionId: `s-${id}`, sessionVersion: 1, scopes, authenticationMode: "mock" });
const nora = actor("mock-super-admin-nora", "SUPER_ADMIN");
const ava = actor("mock-admin-ava", "ADMIN", [{ type: "TEAM", reference: "team:alpha" }]);
const ben = actor("mock-admin-ben", "ADMIN", [{ type: "TEAM", reference: "team:bravo" }]);
const outsiderAdmin = actor(phase10Ids.outsiderAdmin, "ADMIN", [{ type: "TEAM", reference: "team:bravo" }]);
const cora = actor("mock-employee-cora", "EMPLOYEE");
const eli = actor(phase4Ids.alphaEmployee, "EMPLOYEE");
const outsiderEmployee = actor(phase10Ids.outsiderEmployee, "EMPLOYEE");

async function auditCount(action: string, targetId: string) {
  return (await db.select().from(auditEvents).where(and(eq(auditEvents.action, action), eq(auditEvents.targetId, targetId)))).length;
}

async function notificationCount(recipientUserId: string, eventType: string, relatedRecordId: string) {
  return (await db.select().from(notifications).where(and(eq(notifications.recipientUserId, recipientUserId), eq(notifications.eventType, eventType), eq(notifications.relatedRecordId, relatedRecordId)))).length;
}

describe("Phase 10 shared operational notes", () => {
  it("preserves the previous content as a revision and keeps Employee access refused", async () => {
    const note = await operationalService.addNote(ava, { type: "CLIENT", id: phase3Ids.alphaClient, content: phase10Notes.sharedNote });
    await expect(operationalService.addNote(cora, { type: "CLIENT", id: phase3Ids.alphaClient, content: "Fictional employee attempt" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(operationalService.addNote(outsiderAdmin, { type: "CLIENT", id: phase3Ids.alphaClient, content: "Fictional out-of-scope attempt" })).rejects.toMatchObject({ code: "OUT_OF_SCOPE" });

    // Only the author may edit, and the pre-edit content survives as a revision row.
    await expect(operationalService.updateNote(nora, { noteId: note.id, expectedVersion: note.version, content: "Fictional forged edit" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const edited = await operationalService.updateNote(ava, { noteId: note.id, expectedVersion: note.version, content: phase10Notes.sharedNoteEdited });
    expect(edited.version).toBe(note.version + 1);
    const revisions = await operationalRepository.noteRevisions(db, [note.id]);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ noteId: note.id, version: note.version, content: phase10Notes.sharedNote, editedByUserId: ava.id });

    // A stale expected version can never overwrite newer work, and no second revision is written.
    await expect(operationalService.updateNote(ava, { noteId: note.id, expectedVersion: note.version, content: "Fictional stale edit" })).rejects.toMatchObject({ code: "STALE_VERSION" });
    expect(await operationalRepository.noteRevisions(db, [note.id])).toHaveLength(1);

    expect(await auditCount("operational_note.revision_created", note.id)).toBe(1);
    const detail = await operationalService.getClientDetail(ava, phase3Ids.alphaClient);
    expect(detail.details.notes.find((entry) => entry.note.id === note.id)?.revisions.map((revision) => revision.version)).toEqual([note.version]);

    // Archive is Super Admin only, retains the reason, and never hard-deletes the note or its history.
    await expect(operationalService.archiveNote(ava, { noteId: note.id, expectedVersion: edited.version, reason: phase10Notes.sharedNoteArchived })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await operationalService.archiveNote(nora, { noteId: note.id, expectedVersion: edited.version, reason: phase10Notes.sharedNoteArchived });
    expect((await db.select().from(operationalNotes).where(eq(operationalNotes.id, note.id)))[0]?.archivedAt).toBeInstanceOf(Date);
    expect(await operationalRepository.noteRevisions(db, [note.id])).toHaveLength(1);

    // Shared-note activity creates no Phase 10 notification, and audit metadata never carries content.
    expect(await db.select().from(notifications).where(eq(notifications.relatedRecordId, note.id))).toHaveLength(0);
    const metadata = JSON.stringify((await db.select().from(auditEvents).where(eq(auditEvents.targetId, note.id))).map((event) => event.metadata));
    expect(metadata).not.toContain(phase10Notes.sharedNote);
    expect(metadata).not.toContain(phase10Notes.sharedNoteEdited);
    expect(metadata).not.toContain(phase10Notes.sharedNoteArchived);
  });
});

describe("Phase 10 employee-management notes", () => {
  it("applies the visibility matrix and keeps guessed ids non-enumerating", async () => {
    // A scoped Admin writes a private note about an in-scope Employee.
    const priv = await managementNoteService.create(ava, { subjectUserId: cora.id, visibility: "private_to_author", content: phase10Notes.managementPrivate });
    // A second, shared-upward note from the same author.
    const shared = await managementNoteService.create(ava, { subjectUserId: cora.id, visibility: "shared_upward", content: phase10Notes.managementShared });

    // Author visibility, and the Super Admin sees only the shared-upward note.
    expect((await managementNoteService.listForSubject(ava, cora.id)).notes.map((note) => note.id).sort()).toEqual([priv.note.id, shared.note.id].sort());
    expect((await managementNoteService.listForSubject(nora, cora.id)).notes.map((note) => note.id)).toEqual([shared.note.id]);

    // The subject, an Employee, a peer Admin, and an out-of-scope Admin all receive the same refusal.
    for (const blocked of [cora, eli, outsiderEmployee, ben, outsiderAdmin]) {
      await expect(managementNoteService.listForSubject(blocked, cora.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    // Nobody may write a management note about a Super Admin, and no out-of-scope subject is writable.
    await expect(managementNoteService.create(ava, { subjectUserId: nora.id, visibility: "shared_upward", content: "Fictional Super Admin note" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(managementNoteService.create(ben, { subjectUserId: cora.id, visibility: "shared_upward", content: "Fictional out-of-scope note" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    // A guessed management-note id is indistinguishable from a missing one for the subject.
    await expect(managementNoteService.archive(cora, { noteId: priv.note.id, expectedVersion: priv.note.version, reason: "Fictional attempt" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(managementNoteService.archive(ben, { noteId: priv.note.id, expectedVersion: priv.note.version, reason: "Fictional peer attempt" })).rejects.toMatchObject({ code: "NOT_FOUND" });

    // HTML-shaped content is refused at the boundary; content is immutable after creation.
    await expect(managementNoteService.create(ava, { subjectUserId: cora.id, visibility: "private_to_author", content: "<script>alert(1)</script>" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const stale = await managementNoteService.archive(ava, { noteId: priv.note.id, expectedVersion: priv.note.version + 5, reason: "Fictional stale archive" }).catch((error) => error);
    expect(stale).toMatchObject({ code: "STALE_VERSION" });

    // The author archives their own note; the row and its audit trail survive.
    const archived = await managementNoteService.archive(ava, { noteId: priv.note.id, expectedVersion: priv.note.version, reason: "Fictional supersede" });
    expect(archived.note.archivedAt).toBeInstanceOf(Date);
    expect(await auditCount("management_note.archived", priv.note.id)).toBe(1);
    expect((await db.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.id, priv.note.id)))[0]?.content).toBe(phase10Notes.managementPrivate);

    const metadata = JSON.stringify((await db.select().from(auditEvents).where(eq(auditEvents.targetId, priv.note.id))).map((event) => event.metadata));
    expect(metadata).not.toContain(phase10Notes.managementPrivate);

    // Authorship never survives a loss of current authorization: once the author is demoted in the
    // database, the same call returns nothing and the row content stays preserved.
    await db.update(users).set({ role: "EMPLOYEE" }).where(eq(users.id, ava.id));
    expect((await managementNoteService.listAuthoredByActor(actor(ava.id, "EMPLOYEE"))).notes).toEqual([]);
    await expect(managementNoteService.archive(actor(ava.id, "EMPLOYEE"), { noteId: shared.note.id, expectedVersion: shared.note.version, reason: "Fictional demoted archive" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await db.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.id, shared.note.id)))[0]?.content).toBe(phase10Notes.managementShared);
    // Restoring the current role and scope restores access only through that current authorization.
    await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, ava.id));
    expect((await managementNoteService.listAuthoredByActor(actor(ava.id, "ADMIN"))).notes.map((note) => note.id).sort()).toEqual([priv.note.id, shared.note.id].sort());
  });

  it("rolls the note back when the audit write fails", async () => {
    const failing = new ManagementNoteService(async () => { throw new Error("forced audit failure"); });
    await expect(failing.create(ava, { subjectUserId: cora.id, visibility: "private_to_author", content: "Fictional rollback note" })).rejects.toThrow("forced audit failure");
    expect((await db.select().from(employeeManagementNotes).where(eq(employeeManagementNotes.content, "Fictional rollback note")))).toHaveLength(0);
  });
});

describe("Phase 10 replacement-request discussions", () => {
  it("keeps discussion to live participants and notifies the other participants once", async () => {
    const thread = await discussionService.openThread(ava, phase10Ids.discussionRequest);
    expect(thread.threadId).toBeNull();
    const posted = await discussionService.postMessage(ava, { parentType: "replacement_request", parentId: phase10Ids.discussionRequest, content: phase10Notes.discussion });
    expect(posted.threadId).toBeTruthy();
    // The nominated employee is notified exactly once; the author is never self-notified.
    expect(await notificationCount(cora.id, "discussion.message_created", posted.threadId)).toBe(1);
    expect(await notificationCount(ava.id, "discussion.message_created", posted.threadId)).toBe(0);
    // The Super Admin is not a participant merely because of their role.
    await expect(discussionService.openThread(nora, phase10Ids.discussionRequest)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(discussionService.postMessage(nora, { parentType: "replacement_request", parentId: phase10Ids.discussionRequest, content: "Fictional Super Admin message" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    // A non-participant employee receives the same refusal as a nonexistent request.
    await expect(discussionService.openThread(eli, phase10Ids.discussionRequest)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(discussionService.openThread(outsiderEmployee, phase10Ids.discussionRequest)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(discussionService.openThread(ava, "00000000-0000-4000-8000-0000000000ff")).rejects.toMatchObject({ code: "NOT_FOUND" });

    // A reply from the nominated employee reaches the requester.
    await discussionService.postMessage(cora, { parentType: "replacement_request", parentId: phase10Ids.discussionRequest, content: "Fictional acknowledgement" });
    expect(await notificationCount(ava.id, "discussion.message_created", posted.threadId)).toBe(1);

    // Participant set is recalculated live: a newly selected employee joins, the removed one leaves.
    await db.update(replacementRequests).set({ selectedEmployeeUserId: outsiderEmployee.id, nominatedEmployeeUserId: null }).where(eq(replacementRequests.id, phase10Ids.discussionRequest));
    const refreshed = await discussionService.openThread(outsiderEmployee, phase10Ids.discussionRequest);
    expect(refreshed.messages.map((message) => message.content)).toEqual([phase10Notes.discussion, "Fictional acknowledgement"]);
    await expect(discussionService.openThread(cora, phase10Ids.discussionRequest)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await discussionService.postMessage(ava, { parentType: "replacement_request", parentId: phase10Ids.discussionRequest, content: "Fictional follow-up" });
    expect(await notificationCount(outsiderEmployee.id, "discussion.message_created", posted.threadId)).toBe(1);
    // The removed participant receives nothing further.
    expect(await notificationCount(cora.id, "discussion.message_created", posted.threadId)).toBe(1);

    // Only the author may archive a message, and archived messages stay in the table.
    const doomed = await discussionService.postMessage(ava, { parentType: "replacement_request", parentId: phase10Ids.discussionRequest, content: "Fictional withdrawable message" });
    await expect(discussionService.archiveMessage(outsiderEmployee, { messageId: doomed.message.id, expectedVersion: doomed.message.version })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const archivedMessage = await discussionService.archiveMessage(ava, { messageId: doomed.message.id, expectedVersion: doomed.message.version });
    expect(archivedMessage.message.archivedAt).toBeInstanceOf(Date);
    expect((await db.select().from(discussionMessages).where(eq(discussionMessages.id, doomed.message.id)))[0]?.content).toBe("Fictional withdrawable message");
    expect(await auditCount("discussion.message_archived", posted.threadId)).toBe(1);

    // Unsupported parents fail closed, and message metadata never carries the message content.
    await expect(discussionService.postMessage(ava, { parentType: "schedule_assignment", parentId: phase10Ids.discussionRequest, content: "Fictional unsupported parent" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const discussionMetadata = JSON.stringify((await db.select().from(auditEvents).where(eq(auditEvents.targetId, posted.threadId))).map((event) => event.metadata));
    expect(discussionMetadata).not.toContain(phase10Notes.discussion);

    // Ordinary participants never read another request's thread.
    await expect(discussionService.openThread(ava, phase10Ids.secondDiscussionRequest)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await discussionService.listMine(ava)).threads.map((entry) => entry.requestId)).toEqual([phase10Ids.discussionRequest]);
    expect((await discussionService.listMine(outsiderEmployee)).threads.map((entry) => entry.requestId)).toEqual([phase10Ids.discussionRequest]);
  });

  it("rolls the message and its notification back when the notification write fails", async () => {
    const failing = new DiscussionService(writeAuditEvent, async () => { throw new Error("forced notification failure"); });
    const thread = await discussionRepository.threadForParent(db, phase10Ids.discussionRequest);
    const auditBefore = thread ? await auditCount("discussion.message_created", thread.id) : 0;
    const messagesBefore = thread ? (await discussionRepository.messages(db, thread.id)).length : 0;
    await expect(failing.postMessage(ava, { parentType: "replacement_request", parentId: phase10Ids.discussionRequest, content: "Fictional rolled-back message" })).rejects.toThrow("forced notification failure");
    expect(await db.select().from(discussionMessages).where(eq(discussionMessages.content, "Fictional rolled-back message"))).toHaveLength(0);
    // The failed transaction left no message and no audit event behind.
    if (thread) {
      expect(await auditCount("discussion.message_created", thread.id)).toBe(auditBefore);
      expect((await discussionRepository.messages(db, thread.id)).length).toBe(messagesBefore);
    }
  });

  it("creates exactly one thread per request under concurrent first messages", async () => {
    const parentId = phase10Ids.secondDiscussionRequest;
    await Promise.all([
      discussionService.postMessage(ben, { parentType: "replacement_request", parentId, content: "Fictional concurrent one" }),
      safePost(ben, parentId, "Fictional concurrent two"),
    ]);
    const threads = await db.select().from(discussionThreads).where(eq(discussionThreads.parentId, parentId));
    expect(threads).toHaveLength(1);
    expect((await discussionRepository.messages(db, threads[0].id)).length).toBeGreaterThanOrEqual(1);
  });
});

async function safePost(actorRef: AuthenticatedActor, parentId: string, content: string) {
  try { await discussionService.postMessage(actorRef, { parentType: "replacement_request", parentId, content }); return null; }
  catch (error) { return error; }
}

describe("Phase 10 notification centre", () => {
  it("keeps read and archive independent, scoped to one recipient, and navigation authorized", async () => {
    const page = await notificationService.inbox(ava, {});
    expect(page.pageSize).toBe(25);
    const target = page.items[0];
    expect(target).toBeTruthy();
    // Ava is a participant on the request, so the thread link resolves for her but never for an outsider.
    const threadItem = page.items.find((item) => item.relatedRecordType === "discussion_thread");
    expect(threadItem?.href).toBe("/replacements");

    // Another recipient's notification id is non-enumerating.
    await expect(notificationService.setRead(nora, target.id, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(notificationService.setArchived(nora, target.id, true)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const before = (await notificationService.inbox(ava, {})).items.find((item) => item.id === target.id)!;
    expect(before.isRead).toBe(false);
    await notificationService.setRead(ava, target.id, true);
    await notificationService.setArchived(ava, target.id, true);
    const archived = (await notificationService.inbox(ava, { filter: "archived" })).items.find((item) => item.id === target.id)!;
    expect(archived).toMatchObject({ isRead: true, isArchived: true });

    // Marking unread must not unarchive, and restoring must not mark read.
    await notificationService.setRead(ava, target.id, false);
    const unreadArchived = (await notificationService.inbox(ava, { filter: "archived" })).items.find((item) => item.id === target.id)!;
    expect(unreadArchived).toMatchObject({ isRead: false, isArchived: true });
    await notificationService.setArchived(ava, target.id, false);
    const restored = (await notificationService.inbox(ava, {})).items.find((item) => item.id === target.id)!;
    expect(restored).toMatchObject({ isRead: false, isArchived: false });

    // Both operations are idempotent.
    await notificationService.setArchived(ava, target.id, false);
    await notificationService.setRead(ava, target.id, false);
    expect((await notificationService.inbox(ava, {})).items.find((item) => item.id === target.id)).toMatchObject({ isRead: false, isArchived: false });
  });

  it("bounds mark-all-read to the acting recipient and paginates deterministically", async () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ recipientUserId: eli.id, eventType: "evidence.created", relatedRecordType: "employee_evidence", relatedRecordId: null, createdAt: new Date(Date.now() + index * 1000) }));
    await db.insert(notifications).values(rows);
    const outsiderUnreadBefore = (await notificationService.inbox(outsiderEmployee, { filter: "unread" })).items.length;
    const noraUnreadBefore = (await notificationService.inbox(nora, {})).unreadCount;

    const first = await notificationService.inbox(eli, {});
    expect(first.items).toHaveLength(25);
    expect(first.total).toBeGreaterThanOrEqual(30);
    const second = await notificationService.inbox(eli, { page: "2" });
    expect(second.items.length).toBeGreaterThan(0);
    const overlap = first.items.filter((item) => second.items.some((other) => other.id === item.id));
    expect(overlap).toHaveLength(0);

    const marked = await notificationService.markAllRead(eli);
    expect(marked.marked).toBeGreaterThanOrEqual(30);
    expect((await notificationService.inbox(eli, { filter: "unread" })).items).toHaveLength(0);
    // Another recipient's unread count is untouched by someone else's mark-all-read.
    expect((await notificationService.inbox(nora, {})).unreadCount).toBe(noraUnreadBefore);
    expect((await notificationService.inbox(outsiderEmployee, { filter: "unread" })).items.length).toBe(outsiderUnreadBefore);
  });

  it("renders a neutral unavailable state instead of disclosing an unknown or inaccessible target", async () => {
    await db.insert(notifications).values([
      { recipientUserId: outsiderEmployee.id, eventType: "unmapped.event", relatedRecordType: "unsupported_record", relatedRecordId: "00000000-0000-4000-8000-0000000000aa" },
      { recipientUserId: outsiderEmployee.id, eventType: "leave.submitted", relatedRecordType: "leave_request", relatedRecordId: "00000000-0000-4000-8000-0000000000ab" },
    ]);
    const view = await notificationService.inbox(outsiderEmployee, {});
    const unsupported = view.items.find((item) => item.relatedRecordType === "unsupported_record");
    const missingLeave = view.items.find((item) => item.relatedRecordType === "leave_request");
    expect(unsupported).toMatchObject({ href: null, title: "Update" });
    expect(missingLeave?.href).toBeNull();
  });
});

describe("Phase 10 audit-history interface", () => {
  it("is Super Admin only, filters server-side, and never renders raw metadata", async () => {
    await expect(auditService.history(ava)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(auditService.history(cora)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const page = await auditService.history(nora, {});
    expect(page.pageSize).toBe(50);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((item) => item.fields.every((field) => typeof field.value === "string"))).toBe(true);

    const filtered = await auditService.history(nora, { action: "discussion.message_created" });
    expect(filtered.items.length).toBeGreaterThan(0);
    expect(filtered.items.every((item) => item.action === "discussion.message_created")).toBe(true);
    expect(await auditService.history(nora, { action: "discussion.message_created", targetType: "discussion_thread" })).toMatchObject({ total: filtered.total });
    expect((await auditService.history(nora, { actorUserId: nora.id })).items.every((item) => item.actorName !== null)).toBe(true);
    expect(await auditService.history(nora, { from: "2099-01-01", to: "2099-01-02" })).toMatchObject({ total: 0 });

    // Unknown actions receive a generic label with no metadata, and a private value is never rendered.
    await db.insert(auditEvents).values({ actorUserId: ava.id, actorRole: "ADMIN", authenticationMode: "mock", action: "unmapped.private_action", targetType: "employee_evidence", targetId: "fictional-audit-target", metadata: { title: "Fictional confidential title", fileUrl: "https://example.test/private", count: 3 } });
    const unknown = (await auditService.history(nora, { action: "unmapped.private_action" })).items[0];
    expect(unknown.isRecognizedAction).toBe(false);
    expect(unknown.label).toBe("Recorded system action");
    expect(unknown.fields).toEqual([]);
    const rendered = JSON.stringify(unknown);
    expect(rendered).not.toContain("Fictional confidential title");
    expect(rendered).not.toContain("example.test");

    // A known action renders only its allowlisted safe fields.
    const created = (await auditService.history(nora, { action: "operational_note.revision_created" })).items[0];
    expect(created.isRecognizedAction).toBe(true);
    expect(created.fields.map((field) => field.key).sort()).toEqual(["contentLength", "previousVersion", "targetId", "targetType"].sort());
  });

  it("keeps every event readable after its actor is removed", async () => {
    const removable = actor("phase10-removable-actor", "ADMIN");
    await db.insert(users).values({ id: removable.id, displayName: "Fictional Removable Admin", role: "ADMIN" }).onConflictDoNothing();
    await writeAuditEvent(db, { actor: removable, action: "client.updated", targetType: "client", targetId: phase3Ids.alphaClient });
    await db.delete(users).where(eq(users.id, removable.id));
    // The actor foreign key is nulled rather than cascading, so the event survives with no actor name.
    const page = await auditService.history(nora, { action: "client.updated", targetType: "client" });
    const event = page.items.find((item) => item.targetId === phase3Ids.alphaClient);
    expect(event).toMatchObject({ actorName: null, label: "Client updated", isRecognizedAction: true });
  });
});
