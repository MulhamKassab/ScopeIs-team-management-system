import { expect, test } from "@playwright/test";
import pg from "pg";
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
  const createPanel = page.getByRole("dialog", { name: /Create workforce record and login account/ });
  await createPanel.getByLabel(/Display name/).fill(displayName);
  await createPanel.getByLabel(/^Username/).fill(username);
  await createPanel.getByLabel(/Login email/).fill(email);
  await createPanel.getByLabel(/Temporary password/).fill(TEMP);
  await createPanel.getByLabel(/Confirm temporary password/).fill(TEMP);
  await createPanel.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Account created with a login/)).toBeVisible();
  await createPanel.getByRole("button", { name: "Close", exact: true }).click();
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
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  // The required-change gate covers direct business endpoints, not just the page layout.
  expect((await page.request.get("/api/reports/employee-directory/export")).status()).toBe(401);
  await page.goto("/dashboard");
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
  const resetPanel = page.getByRole("dialog", { name: new RegExp(`Reset password for ${displayName}`) });
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
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/reports/employee-directory/export")).status()).toBe(401);
});

test("legacy accounts recover My Profile and appear in the directory after Super Admin completes setup", async ({ page }) => {
  // Both viewport projects start with the same missing-link case in this runner-owned database.
  const target = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)
    || !/^\/scopeis_account_browser_\d+_[a-f0-9]{10}_test$/.test(target.pathname)) {
    throw new Error("Profile recovery fixture requires the account runner's disposable loopback database.");
  }
  const client = new pg.Client({ connectionString: target.toString() });
  await client.connect();
  try {
    await client.query("delete from employee_profiles where user_id = any($1::text[])", [["mock-super-admin-nora", "mock-employee-cora"]]);
  } finally { await client.end(); }

  await signIn(page, "Cora Bell");
  await page.goto("/profile");
  await expect(page.getByText(/Your sign-in account is ready/)).toBeVisible();
  await expect(page.getByText(/Ask your Super Admin/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Complete workforce profile/ })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.goto("/skills");
  await expect(page.getByRole("heading", { name: "Profile setup required" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await signOut(page);

  await signIn(page, "Nora Albright");
  await page.goto("/profile");
  await page.getByRole("button", { name: "Complete workforce profile for Nora Albright" }).click();
  await expect(page.getByRole("button", { name: "Edit profile", exact: true })).toBeVisible();
  await expect(page.getByText(/Your sign-in account is ready/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto("/accounts");
  const row = page.getByRole("row", { name: /Cora Bell/ });
  await expect(row).toContainText("Workforce profile missing");
  await row.getByRole("button", { name: "Complete workforce profile for Cora Bell" }).click();
  await expect(row).not.toContainText("Workforce profile missing");
  await expect(row.getByRole("button", { name: /Complete workforce profile/ })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto("/employees");
  await expect(page.getByRole("link", { name: "Cora Bell", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Cora Bell", exact: true }).click();
  await expect(page).toHaveURL(/\/employees\/mock-employee-cora$/);
  await expect(page.getByRole("heading", { name: "Cora Bell", exact: true })).toBeVisible();
  await signOut(page);

  await signIn(page, "Cora Bell");
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Edit profile", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit professional profile" })).toBeVisible();
  await expect(page.getByLabel("Work email", { exact: true })).toHaveValue("");
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/skills");
  await expect(page.getByRole("heading", { name: "Recorded skills", exact: true })).toBeVisible();
  await expect(page.getByText("No skills have been recorded on your profile.")).toBeVisible();
  await signOut(page);
});
