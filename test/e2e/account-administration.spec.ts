import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./sign-in";

test.skip(process.env.SCOPEIS_ACCOUNT_E2E !== "true", "Run with the guarded account-administration fixture runner.");

const TEMP = "user1234";
const RESET = "resetpass1";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "page should not overflow horizontally").toBe(true);
}

async function openAccounts(page: import("@playwright/test").Page) {
  await signIn(page, "Nora Albright");
  await page.goto("/accounts");
  await expect(page.getByRole("heading", { name: "Account administration" })).toBeVisible();
}

test("Super Admin creates and resets an account; other roles cannot reach /accounts", async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const username = `journey${suffix}`.toLowerCase();
  const email = `journey.${suffix}@example.test`.toLowerCase();
  const displayName = `Journey Person ${suffix}`;

  await openAccounts(page);
  await expect(page.getByText(/Passwords cannot be viewed/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Create an Employee login account and confirm it appears as configured.
  await page.getByRole("button", { name: "Create account" }).first().click();
  const createPanel = page.getByRole("region", { name: /Create workforce record and login account/ });
  await createPanel.getByLabel(/Display name/).fill(displayName);
  await createPanel.getByLabel(/^Username/).fill(username);
  await createPanel.getByLabel(/Login email/).fill(email);
  await createPanel.getByLabel(/Temporary password/).fill(TEMP);
  await createPanel.getByLabel(/Confirm temporary password/).fill(TEMP);
  await createPanel.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Account created with a login/)).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(displayName) })).toContainText("Configured");
  await expect(page.locator("body")).not.toContainText(TEMP);
  expect((await page.locator("body").innerText())).not.toMatch(/scrypt\$|password_hash/i);
  await expectNoHorizontalOverflow(page);

  // The created user signs in with the temporary password and is forced to change it.
  await signOut(page);
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(TEMP);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account\/change-password$/);
  await page.getByLabel(/Current password/).fill(TEMP);
  await page.getByLabel(/New password/).fill("brandnewsafe1");
  await page.getByLabel(/Confirm new password/).fill("brandnewsafe1");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect((await page.request.get("/accounts")).status()).toBe(404);
  await expectNoHorizontalOverflow(page);

  // Nora resets the password; the screen never echoes it.
  await signOut(page);
  await openAccounts(page);
  const row = page.getByRole("row", { name: new RegExp(displayName) });
  await row.getByRole("button", { name: "Reset password" }).click();
  const resetPanel = page.getByRole("group", { name: new RegExp(`Reset password for ${displayName}`) });
  await resetPanel.getByLabel(/New temporary password/).fill(RESET);
  await resetPanel.getByLabel(/Confirm temporary password/).fill(RESET);
  await resetPanel.getByLabel(/I understand all existing sessions/).check();
  await resetPanel.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByText(/Password reset completed\. Existing sessions were revoked\./)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(RESET);

  // Admin and Employee users cannot open /accounts or see its navigation entry.
  await signOut(page);
  for (const name of ["Ava Mercer", "Ben Iqbal", "Cora Bell", "Dan Rowan"]) {
    await signIn(page, name);
    expect((await page.request.get("/accounts")).status(), `${name} should not reach /accounts`).toBe(404);
    await expect(page.getByRole("link", { name: "Account administration" })).toHaveCount(0);
    await signOut(page);
  }

  // The reset temporary password works by login email, and no page shows a hash.
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(RESET);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account\/change-password$/);
  expect((await page.locator("body").innerText())).not.toMatch(/scrypt\$|password_hash/i);
  await expectNoHorizontalOverflow(page);
});
