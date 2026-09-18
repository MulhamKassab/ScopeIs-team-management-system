import { expect, test } from "@playwright/test";

test.skip(process.env.SCOPEIS_CREDENTIAL_E2E !== "true", "Run with the guarded credential fixture runner.");

test("credential login creates an opaque session and reaches the dashboard", async ({ page }, testInfo) => {
  const browserErrors = { console: 0, page: 0 };
  page.on("console", (message) => { if (message.type() === "error") browserErrors.console += 1; });
  page.on("pageerror", () => { browserErrors.page += 1; });
  await page.setViewportSize(testInfo.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText(/persona|Continue with mock persona|\b(Nora|Ava|Ben|Cora|Dan)\b/)).toHaveCount(0);
  await page.getByLabel("Username or email").fill(testInfo.project.name === "mobile" ? "nora@example.test" : "nora");
  await page.getByLabel("Password", { exact: true }).fill("fictional-e2e-credential-only");
  const loginResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/login" && response.request().method() === "POST");
  await page.getByLabel("Password", { exact: true }).press("Enter");
  const response = await loginResponse;
  const payload = await response.json();
  const knownCodes = ["INVALID_CREDENTIALS", "VALIDATION", "AUTH_UNAVAILABLE", "DATABASE_FAILURE", "FORBIDDEN"];
  console.info(JSON.stringify({ loginStatus: response.status(), errorCode: knownCodes.includes(payload.error) ? payload.error : null, browserErrors }));
  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Active employees", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
