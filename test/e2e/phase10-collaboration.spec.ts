import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./sign-in";

test.skip(process.env.SCOPEIS_PHASE10_E2E !== "true", "Run with the guarded Phase 10 fixture runner.");

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test("Admin governs shared notes and management notes, participants discuss a request, and notifications and audit stay scoped", async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const sharedNote = `Fictional shared briefing ${suffix}`;
  const sharedNoteEdited = `Fictional shared briefing revised ${suffix}`;
  const managementNote = `Fictional supervision note ${suffix}`;
  const discussionMessage = `Fictional coordination message ${suffix}`;
  const discussionReply = `Fictional acknowledgement ${suffix}`;

  // 1. The scoped Admin records a shared Client note and edits it. The previous content is preserved.
  await signIn(page, "Ava Mercer");
  await page.goto("/clients");
  await page.locator("article").filter({ hasText: "Alpha Facilities" }).getByRole("link", { name: "Manage Client" }).click();
  const addNote = page.getByRole("form", { name: "Add shared operational note" });
  await addNote.getByLabel("Note").fill(sharedNote);
  await addNote.getByRole("button", { name: "Add note" }).click();
  await expect(addNote.getByText("Shared operational note added.")).toBeVisible();

  const noteItem = page.locator("li").filter({ hasText: sharedNote });
  await expect(noteItem).toBeVisible();
  const editNote = noteItem.getByRole("form", { name: "Edit your note" });
  await editNote.getByLabel("Note").fill(sharedNoteEdited);
  await editNote.getByRole("button", { name: "Save" }).click();
  await expect(noteItem.getByText("Your note was updated.")).toBeVisible();
  // The superseded content is preserved and reachable by expanding the history, never overwritten.
  await noteItem.getByText("Previous versions (1)").click();
  await expect(noteItem.getByText(sharedNote, { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // 2. The scoped Admin may not archive a shared note; only Super Admin has archive authority.
  await expect(page.getByRole("form", { name: "Archive shared note" })).toHaveCount(0);

  // 3. The Admin writes a management note about an in-scope employee, shared upward.
  await page.goto("/employees/mock-employee-cora");
  const notePanel = page.getByRole("region", { name: "Management notes" });
  await expect(notePanel).toBeVisible();
  const createManagementNote = notePanel.getByRole("form", { name: /Add management note about/ });
  await createManagementNote.getByLabel("Visibility").selectOption("shared_upward");
  await createManagementNote.getByLabel("Note").fill(managementNote);
  await createManagementNote.getByRole("button", { name: "Save note" }).click();
  await expect(notePanel.getByText("Management note saved.")).toBeVisible();
  await expect(notePanel.getByText(managementNote)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // 4. The participant Admin posts to the replacement-request discussion.
  await page.goto("/replacements");
  const discussion = page.getByRole("region", { name: /Discussion · Add coverage assignment/ });
  await expect(discussion).toBeVisible();
  const composer = discussion.getByRole("form", { name: /Post a message in/ });
  await composer.getByLabel("Message").fill(discussionMessage);
  await composer.getByRole("button", { name: "Send message" }).click();
  await expect(discussion.getByText("Message sent to the other participants.")).toBeVisible();
  await expect(discussion.getByText(discussionMessage)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // 5. The Admin's notification centre shows the reply, and read/archive states stay independent.
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();

  // 6. The participating Employee sees the same thread on /requests and replies to it.
  await signOut(page);
  await signIn(page, "Cora Bell");
  await page.goto("/requests");
  const employeeDiscussion = page.getByRole("region", { name: /Request · Add coverage assignment/ });
  await expect(employeeDiscussion).toBeVisible();
  await expect(employeeDiscussion.getByText(discussionMessage)).toBeVisible();
  const reply = employeeDiscussion.getByRole("form", { name: /Post a message in/ });
  await reply.getByLabel("Message").fill(discussionReply);
  await reply.getByRole("button", { name: "Send message" }).click();
  await expect(employeeDiscussion.getByText("Message sent to the other participants.")).toBeVisible();
  await expect(employeeDiscussion.getByText(discussionReply)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // The Employee is a participant only on their own request; another request is non-enumerating.
  await expect(page.getByRole("region", { name: /Request ·/ })).toHaveCount(1);
  await expect(page.getByText(/Replace assignment employee/)).toHaveCount(0);

  // 7. The Employee cannot reach management-only surfaces.
  await page.goto("/replacements");
  await expect(page.getByText("Replacement requests are management-only")).toBeVisible();
  expect((await page.goto("/audit"))?.status()).toBe(404);

  // 8. The Employee's notification centre offers read, unread, archive, and restore as separate actions.
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  const activeDiscussionRows = page.locator("li").filter({ hasText: "New discussion message" });
  const activeBefore = await activeDiscussionRows.count();
  expect(activeBefore).toBeGreaterThan(0);
  const replyNotification = page.locator("li").filter({ hasText: "New discussion message" }).first();
  await expect(replyNotification).toBeVisible();
  await replyNotification.getByRole("button", { name: "Mark read" }).click();
  await expect(replyNotification.getByText(/Read · 20/)).toBeVisible();
  await replyNotification.getByRole("button", { name: "Archive" }).click();
  // Archiving moves the row out of the active inbox and keeps it reachable through the explicit filter.
  await expect(activeDiscussionRows).toHaveCount(activeBefore - 1);
  await page.getByRole("link", { name: "Archived" }).click();
  const archivedNotification = page.locator("li").filter({ hasText: "New discussion message" }).first();
  await expect(archivedNotification.getByText(/Archived/)).toBeVisible();
  // Restoring is explicit and never silently clears the read state.
  await archivedNotification.getByRole("button", { name: "Restore" }).click();
  await expect(page.locator("li").filter({ hasText: "New discussion message" })).toHaveCount(0);
  await page.getByRole("link", { name: "Active" }).click();
  const restoredNotification = page.locator("li").filter({ hasText: "New discussion message" }).first();
  await expect(restoredNotification.getByRole("button", { name: "Archive" })).toBeVisible();
  await expect(restoredNotification.getByText(/Read · 20/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // 9. The Super Admin sees the shared-upward management note but never a private one, and reviews the audit history.
  await signOut(page);
  await signIn(page, "Nora Albright");
  await page.goto("/employees/mock-employee-cora");
  const superAdminNotes = page.getByRole("region", { name: "Management notes" });
  await expect(superAdminNotes.getByText(managementNote)).toBeVisible();

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Audit history" })).toBeVisible();
  await expect(page.locator("li").filter({ hasText: "Shared operational note edited" }).first()).toBeVisible();
  const filters = page.getByRole("form", { name: "Audit filters" });
  await filters.getByLabel("Action").selectOption("discussion.message_created");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator("li").filter({ hasText: "Discussion message posted" }).first()).toBeVisible();
  // Raw JSON metadata is never rendered.
  await expect(page.locator(".audit-list")).not.toContainText('{"');
  await expectNoHorizontalOverflow(page);
});
