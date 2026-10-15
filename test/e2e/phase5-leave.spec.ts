import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./sign-in";
test.skip(process.env.SCOPEIS_PHASE5_E2E !== "true", "Run with the guarded Phase 5 fixture runner.");
test("Employee previews and requests a vacation, Super Admin decides it, and Admin cannot read team leave", async ({ page }, testInfo) => {
  const startDate = testInfo.project.name === "mobile" ? "2026-11-09" : "2026-11-02";
  const endDate = testInfo.project.name === "mobile" ? "2026-11-13" : "2026-11-06";
  const privateReason = `Fictional private vacation note ${testInfo.project.name}`;

  await signIn(page, "Cora Bell");
  await page.goto("/leave");
  await expect(page.getByRole("heading", { name: "My vacations", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Apply for vacation", exact: true }).click();
  const form = page.getByRole("form", { name: "Submit annual leave request" });
  const preview = form.getByRole("region", { name: "Vacation balance preview" });
  await expect(preview).toContainText("Choose both dates");

  // The inclusive preview excludes the weekend and separates Dubai calendar years.
  await form.getByLabel("Start date").fill("2026-12-31");
  await form.getByLabel("End date").fill("2027-01-04");
  await expect(preview.getByText("3 working days", { exact: true })).toBeVisible();
  await expect(preview.locator("li")).toHaveCount(2);
  await expect(preview.locator("li").filter({ hasText: "2026" })).toContainText("1 working days requested");
  await expect(preview.locator("li").filter({ hasText: "2027" })).toContainText("2 working days requested");
  await expect(preview).toContainText("the server checks the latest balance on approval");

  await form.getByLabel("Start date").fill(startDate);
  await form.getByLabel("End date").fill(endDate);
  await expect(preview.getByText("5 working days", { exact: true })).toBeVisible();
  const balanceText = await preview.locator("li span").innerText();
  const balances = /5 working days requested · (\d+) available · (\d+) remaining if approved/.exec(balanceText);
  expect(balances).not.toBeNull();
  expect(Number(balances![2])).toBe(Number(balances![1]) - 5);
  await form.getByLabel(/Private reason/).fill(privateReason);
  await form.getByRole("button", { name: "Submit vacation request" }).click();
  await expect(page.getByText("Leave request submitted for Super Admin review.")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await signOut(page);

  await signIn(page, "Nora Albright");
  await page.goto("/leave");
  await page.getByRole("link", { name: "Review", exact: true }).click();
  await expect(page.getByText(`Private reason: ${privateReason}`, { exact: true })).toBeVisible();
  const decision = page.getByRole("form", { name: "Decide leave request" });
  await decision.getByLabel("Decision").selectOption("APPROVED");
  await decision.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByText("APPROVED", { exact: true })).toBeVisible();
  await signOut(page);

  // The updated restriction refuses the entire team-leave page to Admin.
  await signIn(page, "Ava Mercer");
  expect((await page.goto("/leave"))?.status()).toBe(404);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Return to a safe page" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply for vacation", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Vacation balance preview" })).toHaveCount(0);
  await expect(page.locator(".leave-balance")).toHaveCount(0);
  await expect(page.locator(".workflow-leave-list")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(privateReason);
  await signOut(page);

  await signIn(page, "Cora Bell");
  await page.goto("/leave");
  await expect(page.getByText("APPROVED", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
