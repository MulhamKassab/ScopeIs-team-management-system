import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./sign-in";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

async function expectAuthorizedLink(page: import("@playwright/test").Page, label: string) {
  if (test.info().project.name === "mobile") {
    const primary = page.getByRole("navigation", { name: "Mobile primary navigation", exact: true }).getByRole("link", { name: label, exact: true });
    if (await primary.count()) { await expect(primary).toBeVisible(); return; }
    const more = page.getByRole("button", { name: "More", exact: true });
    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
  }
  const navigation = test.info().project.name === "mobile"
    ? page.getByRole("dialog", { name: "More navigation" }).getByRole("navigation", { name: "Primary navigation", exact: true })
    : page.getByRole("navigation", { name: "Primary navigation", exact: true });
  await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
}

test("unauthenticated users do not receive protected shell navigation", async ({ page }) => {
  await page.goto("/map");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Work map")).not.toBeVisible();
});

test("Super Admin receives global shell navigation", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await expectAuthorizedLink(page, "Work map");
  if (test.info().project.name === "mobile") {
    if (!(await page.getByRole("dialog", { name: "More navigation" }).isVisible())) await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "More navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close more navigation" }).click();
    await expect(page.getByRole("dialog", { name: "More navigation" })).toBeHidden();
  }
  await expectAuthorizedLink(page, "Activity log");
  await expectNoHorizontalOverflow(page);
  await signOut(page);
});

test("Admin scope is enforced by the direct server seam", async ({ page }) => {
  await signIn(page, "Ava Mercer");
  const permitted = await page.request.get("/api/foundation/scope/team:alpha");
  const forbidden = await page.request.get("/api/foundation/scope/team:bravo");
  expect(permitted.status()).toBe(200);
  expect(forbidden.status()).toBe(403);
  await expect(page.getByRole("link", { name: "Activity log" })).toHaveCount(0);
  await expectAuthorizedLink(page, "Work map");
  expect((await page.request.get("/audit")).status()).toBe(404);
  await page.goto("/audit");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to a safe page" })).toHaveAttribute("href", "/");
  await expectNoHorizontalOverflow(page);
  await signOut(page);
});

test("Admin Bravo receives only Bravo scope", async ({ page }) => {
  await signIn(page, "Ben Iqbal");
  expect((await page.request.get("/api/foundation/scope/team:bravo")).status()).toBe(200);
  expect((await page.request.get("/api/foundation/scope/team:alpha")).status()).toBe(403);
  expect((await page.request.get("/audit")).status()).toBe(404);
  await expectAuthorizedLink(page, "Work map");
  await expectNoHorizontalOverflow(page);
  await signOut(page);
});

test("Employee navigation excludes management-only modules", async ({ page }) => {
  await signIn(page, "Cora Bell");
  await expect(page.getByRole("link", { name: "Work map" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Activity log" })).toHaveCount(0);
  const direct = await page.request.get("/api/foundation/scope/team:alpha");
  expect(direct.status()).toBe(403);
  expect((await page.request.get("/map")).status()).toBe(404);
  await page.goto("/accounts");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to a safe page" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Accounts", exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await signOut(page);
});

test("Employee Bravo remains outside management pages and scopes", async ({ page }) => {
  await signIn(page, "Dan Rowan");
  await expect(page.getByRole("link", { name: "Work map" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Activity log" })).toHaveCount(0);
  expect((await page.request.get("/api/foundation/scope/team:alpha")).status()).toBe(403);
  expect((await page.request.get("/api/foundation/scope/team:bravo")).status()).toBe(403);
  expect((await page.request.get("/map")).status()).toBe(404);
  await expectNoHorizontalOverflow(page);
  await signOut(page);
});

test("theme preference and RTL shell state persist safely", async ({ page, context }) => {
  await context.addCookies([{ name: "scopeis-direction", value: "rtl", domain: "127.0.0.1", path: "/" }]);
  await signIn(page, "Nora Albright");
  await page.getByRole("button", { name: /Switch to dark mode/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const navigation = page.getByRole("navigation", { name: test.info().project.name === "mobile" ? "Mobile primary navigation" : "Primary navigation", exact: true });
  const scheduleLink = navigation.getByRole("link", { name: "Timetable", exact: true });
  await expect(scheduleLink).toBeVisible();
  await scheduleLink.click();
  // This transition includes the timetable's server queries in an isolated cold build.
  await expect(page).toHaveURL(/\/schedule$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Monthly timetable", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (test.info().project.name === "mobile") {
    const more = page.getByRole("button", { name: "More", exact: true });
    await more.click();
    await expect(page.getByRole("dialog", { name: "More navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close more navigation" }).click();
    await expect(page.getByRole("dialog", { name: "More navigation" })).toHaveCount(0);
  }
  await signOut(page);
});
