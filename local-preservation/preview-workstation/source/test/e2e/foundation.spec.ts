import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, name: string) {
  await page.goto("/login");
  await page.getByText(name, { exact: true }).click();
  await page.getByRole("button", { name: "Continue with mock persona" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function expectAuthorizedLink(page: import("@playwright/test").Page, label: string) {
  if (test.info().project.name === "mobile") {
    const more = page.getByRole("button", { name: "More", exact: true });
    await more.click({ force: true });
    await expect(more).toHaveAttribute("aria-expanded", "true");
  }
  await expect(page.getByRole("link", { name: label })).toBeVisible();
}

test("unauthenticated users do not receive protected shell navigation", async ({ page }) => {
  await page.goto("/map");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Planning map")).not.toBeVisible();
});

test("Super Admin receives global shell navigation", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await expectAuthorizedLink(page, "Planning map");
  if (test.info().project.name === "mobile") await page.getByRole("button", { name: "Close more navigation" }).click();
  await expectAuthorizedLink(page, "Audit");
});

test("Admin scope is enforced by the direct server seam", async ({ page }) => {
  await signIn(page, "Ava Mercer");
  const permitted = await page.request.get("/api/foundation/scope/team:alpha");
  const forbidden = await page.request.get("/api/foundation/scope/team:bravo");
  expect(permitted.status()).toBe(200);
  expect(forbidden.status()).toBe(403);
  await expect(page.getByRole("link", { name: "Audit" })).toHaveCount(0);
  await expectAuthorizedLink(page, "Planning map");
});

test("Employee navigation excludes management-only modules", async ({ page }) => {
  await signIn(page, "Cora Bell");
  await expect(page.getByRole("link", { name: "Planning map" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Audit" })).toHaveCount(0);
  const direct = await page.request.get("/api/foundation/scope/team:alpha");
  expect(direct.status()).toBe(403);
});

test("theme preference and RTL shell state persist safely", async ({ page, context }) => {
  await context.addCookies([{ name: "scopeis-direction", value: "rtl", domain: "127.0.0.1", path: "/" }]);
  await signIn(page, "Nora Albright");
  await page.getByRole("button", { name: /Switch to dark mode/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("link", { name: "Schedule" })).toBeVisible();
  await page.getByRole("link", { name: "Schedule" }).click({ force: true });
  await expect(page).toHaveURL(/\/schedule$/);
});
