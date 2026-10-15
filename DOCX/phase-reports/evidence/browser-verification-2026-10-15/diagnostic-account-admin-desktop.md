# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: account-administration.spec.ts >> Super Admin creates and resets an account; other roles cannot reach /accounts
- Location: test\e2e\account-administration.spec.ts:30:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/account\/change-password$/
Received string:  "http://127.0.0.1:58307/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    3 × locator resolved to <html lang="en" dir="ltr" data-theme="light">…</html>
      - unexpected value "http://127.0.0.1:58307/login"

```

```yaml
- main:
  - img "SCOPE Information Systems"
  - text: Team Management
  - heading "Sign in" [level=1]
  - paragraph: Welcome to your team workspace.
  - text: Username or email
  - textbox "Username or email" [disabled]: journeydesktop-1792059259100
  - text: Password
  - textbox "Password" [disabled]: user1234
  - button "Show password": Show
  - button "Signing in…" [disabled]
- alert
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import pg from "pg";
  3   | import { signIn, signOut } from "./sign-in";
  4   | 
  5   | test.skip(process.env.SCOPEIS_ACCOUNT_E2E !== "true", "Run with the guarded account-administration fixture runner.");
  6   | 
  7   | const TEMP = "user1234";
  8   | const RESET = "resetpass1";
  9   | 
  10  | async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  11  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "page should not overflow horizontally").toBe(true);
  12  | }
  13  | 
  14  | async function openAccounts(page: import("@playwright/test").Page) {
  15  |   await signIn(page, "Nora Albright");
  16  |   await page.goto("/accounts");
  17  |   await expect(page.getByRole("heading", { name: "Accounts", exact: true })).toBeVisible();
  18  | }
  19  | 
  20  | async function completeWorkforceProfile(page: import("@playwright/test").Page, displayName: string) {
  21  |   const path = new URL(page.url()).pathname;
  22  |   const [response] = await Promise.all([
  23  |     page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === path),
  24  |     page.getByRole("button", { name: `Complete workforce profile for ${displayName}`, exact: true }).click(),
  25  |   ]);
  26  |   expect(response.status()).toBe(200);
  27  |   await page.getByRole("button", { name: `Complete workforce profile for ${displayName}`, exact: true }).waitFor({ state: "hidden" });
  28  | }
  29  | 
  30  | test("Super Admin creates and resets an account; other roles cannot reach /accounts", async ({ page }, testInfo) => {
  31  |   const suffix = `${testInfo.project.name}-${Date.now()}`;
  32  |   const username = `journey${suffix}`.toLowerCase();
  33  |   const email = `journey.${suffix}@example.test`.toLowerCase();
  34  |   const displayName = `Journey Person ${suffix}`;
  35  | 
  36  |   await openAccounts(page);
  37  |   await expect(page.getByRole("note").filter({ hasText: /Passwords cannot be viewed/i })).toBeVisible();
  38  |   await expectNoHorizontalOverflow(page);
  39  | 
  40  |   // Create an Employee login account and confirm it appears as configured.
  41  |   await page.getByRole("button", { name: "Create account" }).first().click();
  42  |   const createPanel = page.getByRole("dialog", { name: /Create workforce record and login account/ });
  43  |   await createPanel.getByLabel(/Display name/).fill(displayName);
  44  |   await createPanel.getByLabel(/^Username/).fill(username);
  45  |   await createPanel.getByLabel(/Login email/).fill(email);
  46  |   await createPanel.getByLabel(/Temporary password/).fill(TEMP);
  47  |   await createPanel.getByLabel(/Confirm temporary password/).fill(TEMP);
  48  |   await createPanel.getByRole("button", { name: "Create account" }).click();
  49  |   await expect(page.getByText(/Account created with a login/)).toBeVisible();
  50  |   await createPanel.getByRole("button", { name: "Close", exact: true }).click();
  51  |   await expect(page.getByRole("row", { name: new RegExp(displayName) })).toContainText("Configured");
  52  |   await expect(page.locator("body")).not.toContainText(TEMP);
  53  |   expect((await page.locator("body").innerText())).not.toMatch(/scrypt\$|password_hash/i);
  54  |   await expectNoHorizontalOverflow(page);
  55  | 
  56  |   // The created user signs in with the temporary password and is forced to change it.
  57  |   await signOut(page);
  58  |   await page.goto("/login");
  59  |   await page.getByLabel("Username or email").fill(username);
  60  |   await page.getByLabel("Password", { exact: true }).fill(TEMP);
  61  |   await page.getByRole("button", { name: "Sign in" }).click();
> 62  |   await expect(page).toHaveURL(/\/account\/change-password$/);
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  63  |   await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  64  |   // The required-change gate covers direct business endpoints, not just the page layout.
  65  |   expect((await page.request.get("/api/reports/employee-directory/export")).status()).toBe(401);
  66  |   await page.goto("/dashboard");
  67  |   await expect(page).toHaveURL(/\/account\/change-password$/);
  68  |   await page.getByLabel(/Current password/).fill(TEMP);
  69  |   await page.getByLabel(/New password/).fill("brandnewsafe1");
  70  |   await page.getByLabel(/Confirm new password/).fill("brandnewsafe1");
  71  |   await page.getByRole("button", { name: "Change password" }).click();
  72  |   await expect(page).toHaveURL(/\/tickets$/);
  73  |   await expect(page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();
  74  |   expect((await page.request.get("/accounts")).status()).toBe(404);
  75  |   await expectNoHorizontalOverflow(page);
  76  | 
  77  |   // Nora resets the password; the screen never echoes it.
  78  |   await signOut(page);
  79  |   await openAccounts(page);
  80  |   const row = page.getByRole("row", { name: new RegExp(displayName) });
  81  |   await row.getByRole("button", { name: "Reset password" }).click();
  82  |   const resetPanel = page.getByRole("dialog", { name: new RegExp(`Reset password for ${displayName}`) });
  83  |   await resetPanel.getByLabel(/New temporary password/).fill(RESET);
  84  |   await resetPanel.getByLabel(/Confirm temporary password/).fill(RESET);
  85  |   await resetPanel.getByLabel(/I understand all existing sessions/).check();
  86  |   await resetPanel.getByRole("button", { name: "Reset password" }).click();
  87  |   await expect(page.getByText(/Password reset completed\. Existing sessions were revoked\./)).toBeVisible();
  88  |   await expect(page.locator("body")).not.toContainText(RESET);
  89  | 
  90  |   // Admin and Employee users cannot open /accounts or see its navigation entry.
  91  |   await signOut(page);
  92  |   for (const name of ["Ava Mercer", "Ben Iqbal", "Cora Bell", "Dan Rowan"]) {
  93  |     await signIn(page, name);
  94  |     expect((await page.request.get("/accounts")).status(), `${name} should not reach /accounts`).toBe(404);
  95  |     await expect(page.getByRole("link", { name: "Accounts" })).toHaveCount(0);
  96  |     await signOut(page);
  97  |   }
  98  | 
  99  |   // The reset temporary password works by login email, and no page shows a hash.
  100 |   await page.goto("/login");
  101 |   await page.getByLabel("Username or email").fill(email);
  102 |   await page.getByLabel("Password", { exact: true }).fill(RESET);
  103 |   await page.getByRole("button", { name: "Sign in" }).click();
  104 |   await expect(page).toHaveURL(/\/account\/change-password$/);
  105 |   expect((await page.locator("body").innerText())).not.toMatch(/scrypt\$|password_hash/i);
  106 |   await expectNoHorizontalOverflow(page);
  107 |   await page.getByRole("button", { name: "Log out" }).click();
  108 |   await expect(page).toHaveURL(/\/login$/);
  109 |   expect((await page.request.get("/api/reports/employee-directory/export")).status()).toBe(401);
  110 | });
  111 | 
  112 | test("legacy accounts recover My Profile and appear in the directory after Super Admin completes setup", async ({ page }) => {
  113 |   // Both viewport projects start with the same missing-link case in this runner-owned database.
  114 |   const target = new URL(process.env.DATABASE_URL!);
  115 |   if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)
  116 |     || !/^\/scopeis_account_browser_\d+_[a-f0-9]{10}_test$/.test(target.pathname)) {
  117 |     throw new Error("Profile recovery fixture requires the account runner's disposable loopback database.");
  118 |   }
  119 |   const client = new pg.Client({ connectionString: target.toString() });
  120 |   await client.connect();
  121 |   try {
  122 |     await client.query("delete from employee_profiles where user_id = any($1::text[])", [["mock-super-admin-nora", "mock-employee-cora"]]);
  123 |   } finally { await client.end(); }
  124 | 
  125 |   await signIn(page, "Cora Bell");
  126 |   await page.goto("/profile");
  127 |   await expect(page.getByText(/Your sign-in account is ready/)).toBeVisible();
  128 |   await expect(page.getByText(/Ask your Super Admin/)).toBeVisible();
  129 |   await expect(page.getByRole("button", { name: /Complete workforce profile/ })).toHaveCount(0);
  130 |   await expectNoHorizontalOverflow(page);
  131 |   await page.goto("/skills");
  132 |   await expect(page.getByRole("heading", { name: "Profile setup required" })).toBeVisible();
  133 |   await expectNoHorizontalOverflow(page);
  134 |   await signOut(page);
  135 | 
  136 |   await signIn(page, "Nora Albright");
  137 |   await page.goto("/profile");
  138 |   await completeWorkforceProfile(page, "Nora Albright");
  139 |   await expect(page.getByRole("button", { name: "Edit profile", exact: true })).toBeVisible();
  140 |   await expect(page.getByText(/Your sign-in account is ready/)).toHaveCount(0);
  141 |   await expectNoHorizontalOverflow(page);
  142 | 
  143 |   await page.goto("/accounts");
  144 |   const row = page.getByRole("row", { name: /Cora Bell/ });
  145 |   await expect(row).toContainText("Workforce profile missing");
  146 |   await completeWorkforceProfile(page, "Cora Bell");
  147 |   await expect(row).not.toContainText("Workforce profile missing");
  148 |   await expect(row.getByRole("button", { name: /Complete workforce profile/ })).toHaveCount(0);
  149 |   await expectNoHorizontalOverflow(page);
  150 | 
  151 |   await page.goto("/employees");
  152 |   await expect(page.getByRole("link", { name: "Cora Bell", exact: true })).toBeVisible();
  153 |   await page.getByRole("link", { name: "Cora Bell", exact: true }).click();
  154 |   await expect(page).toHaveURL(/\/employees\/mock-employee-cora$/);
  155 |   await expect(page.getByRole("heading", { name: "Cora Bell", exact: true })).toBeVisible();
  156 |   await signOut(page);
  157 | 
  158 |   await signIn(page, "Cora Bell");
  159 |   await page.goto("/profile");
  160 |   await expect(page.getByRole("button", { name: "Edit profile", exact: true })).toBeVisible();
  161 |   await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  162 |   await expect(page.getByRole("dialog", { name: "Edit professional profile" })).toBeVisible();
```