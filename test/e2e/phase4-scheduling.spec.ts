import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signIn, signOut } from "./sign-in";
test.skip(process.env.SCOPEIS_PHASE4_E2E !== "true", "Run with the guarded Phase 4 fixture runner.");
async function selectContaining(select: import("@playwright/test").Locator, text: string) { const value = await select.locator("option").filter({ hasText: text }).getAttribute("value"); if (!value) throw new Error(`Missing option: ${text}`); await select.selectOption(value); }

async function assertAdminReadOnly(page: Page, periodUrl: string, status: "DRAFT" | "PROPOSED" | "PUBLISHED", testInfo: TestInfo) {
  await signOut(page);
  await signIn(page, "Ava Mercer");
  await page.goto(periodUrl);
  await expect(page.getByRole("heading", { name: "Schedule details", exact: true })).toBeVisible();
  await expect(page.getByText("Read only", { exact: true })).toBeVisible();
  await expect(page.getByText(/editor below to plan work/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: new RegExp(`^${status} Alpha Facilities`) })).toBeVisible();
  const assignment = page.locator(".workflow-assignment").filter({ has: page.getByRole("heading", { name: "Cora Bell", exact: true }) });
  await expect(assignment.getByText("Alpha Modernization · Alpha Shared Site", { exact: true })).toBeVisible();
  await expect(assignment.getByText("Use the reception desk.", { exact: true })).toBeVisible();
  await expect(assignment.getByRole("link", { name: "Review coverage", exact: true })).toBeVisible();
  await assignment.getByText("Skills and requirements (0)", { exact: true }).click();
  await expect(assignment.getByRole("heading", { name: "Assignment-specific skills", exact: true })).toBeVisible();
  await expect(assignment.getByRole("form", { name: "Add assignment skill requirement", exact: true })).toHaveCount(0);
  await expect(assignment.getByLabel("Required skill", { exact: true })).toHaveCount(0);
  await expect(assignment.getByRole("button", { name: "Archive", exact: true })).toHaveCount(0);
  for (const name of ["New monthly schedule", "Add assignment", "Edit assignment", "Remove", "Propose for review", "Return to Draft", "Publish schedule", "Create Draft revision"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("form", { name: /Create a monthly Draft|Add schedule assignment|Edit schedule assignment|Propose this Draft|Publish Proposed schedule|Create an editable revision/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `test-results/admin-schedule-access-amendment/${testInfo.project.name}-admin-${status.toLowerCase()}.png`, fullPage: true });
  if (status === "DRAFT" && testInfo.project.name === "desktop") {
    await page.locator("#schedule-editor").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "test-results/admin-schedule-access-amendment/desktop-admin-draft-details.png" });
  }
  await signOut(page);
  await signIn(page, "Nora Albright");
  await page.goto(periodUrl);
}

test("Super Admin publishes, Admin reads every schedule state, and Employee sees only Published work", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const month = page.viewportSize()?.width === 390 ? "2026-06" : "2026-05";
  const assignmentDate = `${month}-06`;
  await signIn(page, "Nora Albright"); await page.goto(`/schedule?month=${month}`);
  await page.getByRole("button", { name: "New monthly schedule" }).click();
  const create = page.getByRole("form", { name: "Create a monthly Draft" }); await selectContaining(create.locator('select[name="clientId"]'), "Alpha Facilities"); await create.getByLabel("Planning month").fill(month); await create.getByRole("button", { name: "Create Draft" }).click(); await expect(create.getByText("Draft schedule created.")).toBeVisible(); await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("link", { name: /Alpha Facilities.*Revision 1/ }).click(); await page.getByRole("button", { name: "Add assignment", exact: true }).click(); const add = page.getByRole("form", { name: "Add schedule assignment" }); await selectContaining(add.locator('select[name="employeeUserId"]'), "Cora Bell"); await selectContaining(add.locator('select[name="projectId"]'), "Alpha Modernization"); await selectContaining(add.locator('select[name="locationId"]'), "Alpha Shared Site"); await add.getByLabel("Date").fill(assignmentDate); await add.getByLabel("Start time").fill("09:00"); await add.getByLabel("End time").fill("10:00"); await add.getByLabel(/Short work instruction/).fill("Use the reception desk."); await add.getByRole("button", { name: "Add assignment" }).click(); await expect(page.getByText("Assignment added to the Draft.")).toBeVisible(); await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("link", { name: "Review coverage", exact: true }).first()).toBeVisible();
  const periodUrl = page.url();
  await assertAdminReadOnly(page, periodUrl, "DRAFT", testInfo);
  await signOut(page);
  await signIn(page, "Cora Bell");
  await page.goto(`/schedule?month=${month}`);
  await expect(page.getByRole("heading", { name: "My timetable", exact: true })).toBeVisible();
  await expect(page.getByText("Alpha Facilities", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Use the reception desk.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Monthly schedule editor|Schedule details/ })).toHaveCount(0);
  await signOut(page);
  await signIn(page, "Nora Albright");
  await page.goto(periodUrl);
  await page.getByRole("form", { name: "Propose this Draft" }).getByRole("button", { name: "Propose for review" }).click(); await expect(page.getByRole("link", { name: /^PROPOSED Alpha Facilities/ })).toBeVisible();
  await assertAdminReadOnly(page, periodUrl, "PROPOSED", testInfo);
  await page.getByRole("button", { name: "Return to Draft", exact: true }).click();
  const returned = page.getByRole("dialog", { name: "Return schedule for changes", exact: true });
  await returned.getByLabel("Reason for return").fill("Confirm the reception instruction.");
  await returned.getByRole("button", { name: "Return to Draft", exact: true }).click();
  await expect(returned).not.toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Schedule returned to Draft.");
  await page.getByRole("form", { name: "Propose this Draft" }).getByRole("button", { name: "Propose for review" }).click();
  await page.getByRole("form", { name: "Publish Proposed schedule" }).getByRole("button", { name: "Publish schedule" }).click(); await expect(page.getByRole("link", { name: /^PUBLISHED Alpha Facilities/ })).toBeVisible();
  await assertAdminReadOnly(page, periodUrl, "PUBLISHED", testInfo);
  await page.getByRole("link", { name: "Next month", exact: true }).click();
  await expect(page).not.toHaveURL(/[?&]period=/);
  await expect(page.getByRole("heading", { name: "Select a schedule", exact: true })).toBeVisible();
  await page.getByLabel("Planning month", { exact: true }).fill(month);
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await page.getByRole("link", { name: /^PUBLISHED Alpha Facilities/ }).click();
  await page.getByRole("link", { name: "Review coverage", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Find cover", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cora Bell", exact: true })).toBeVisible();
  await expect(page.getByLabel("Assignment ID")).toHaveCount(0);
  await page.getByRole("link", { name: "Open this schedule", exact: true }).click();
  await page.getByRole("button", { name: "Create Draft revision", exact: true }).click();
  await page.getByRole("link", { name: /DRAFT Alpha Facilities Revision 2/ }).click();
  await page.getByRole("button", { name: "Edit assignment", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit Cora Bell’s assignment", exact: true });
  await edit.getByText("Remove assignment", { exact: true }).click();
  await edit.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(edit).not.toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Draft assignment removed.");
  await signOut(page);
  await signIn(page, "Cora Bell");
  await page.goto(`/schedule?month=${month}`);
  await expect(page.getByRole("heading", { name: "My timetable", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  const publishedEntry = page.locator(".timetable-entry");
  await expect(publishedEntry).toHaveCount(1);
  await expect(publishedEntry.getByText("Cora Bell", { exact: true })).toBeVisible();
  await expect(publishedEntry.getByText("Alpha Facilities", { exact: true })).toBeVisible();
  await expect(publishedEntry.getByRole("heading", { name: "Alpha Modernization", exact: true })).toBeVisible();
  await expect(publishedEntry.getByText("Alpha Shared Site", { exact: true })).toBeVisible();
  await expect(publishedEntry.getByText("Use the reception desk.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Monthly schedule editor|Schedule details/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await signOut(page);
});
