import { expect, test } from "@playwright/test";
import { signIn } from "./sign-in";
test.skip(process.env.SCOPEIS_PHASE8_E2E !== "true", "Run with the guarded Phase 8 fixture runner.");
test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dbe8ed"/></svg>' }));
});

test("Super Admin sees static Published planning facts and safe fallback", async ({ page }) => { await signIn(page, "Nora Albright"); await page.goto("/map?date=2027-05-12"); await expect(page.getByText("Planning status for 2027-05-12 — based on the Published schedule, not live tracking.")).toBeVisible(); await expect(page.getByLabel("Static planned associations")).toBeVisible(); await expect(page.getByRole("button", { name: /Employee: Cora Bell/ })).toBeVisible(); await page.getByRole("button", { name: "Zoom in" }).click(); const canvas = page.getByLabel("Static planning map"); await canvas.dispatchEvent("pointerdown", { clientX: 200, clientY: 200 }); await canvas.dispatchEvent("pointermove", { clientX: 230, clientY: 220 }); await canvas.dispatchEvent("pointerup", { clientX: 230, clientY: 220 }); await page.locator(".planning-map-tiles img").first().dispatchEvent("error"); await expect(page.locator(".planning-map-tile-failure")).toContainText("tiles could not be loaded"); await expect(page.getByRole("button", { name: /Cora Bell/ })).toBeVisible(); });
test("Scoped Admin receives only the coarse Team × operational intersection and Employee is denied", async ({ page }) => { await signIn(page, "Ava Mercer"); await page.goto("/map?date=2027-05-12"); await expect(page.getByText(/Coarse planning area/).first()).toBeVisible(); await expect(page.getByText("Dan Unscoped")).toHaveCount(0); await expect(page.getByText("25.2048")).toHaveCount(0); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true); await page.request.post("/api/auth/logout", { headers: { Origin: new URL(page.url()).origin } }); await signIn(page, "Cora Bell"); const response = await page.goto("/map?date=2027-05-12"); expect(response?.status()).toBe(404); });

test("filter form accepts All authorized and employee identifiers, and map dragging follows the pointer", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dbe8ed"/></svg>' }));
  await signIn(page, "Nora Albright");
  await page.goto("/map?date=2027-05-12");
  await page.getByText("Filters", { exact: true }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".planning-map-list button")).toHaveCount(2);
  await expect(page.locator(".operation-error")).toHaveCount(0);
  await page.getByText("Filters", { exact: true }).click();
  await page.getByRole("combobox", { name: "Employee", exact: true }).selectOption({ label: "Cora Bell" });
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".planning-map-list button")).toHaveCount(1);
  await expect(page.locator(".operation-error")).toHaveCount(0);
  const marker = page.getByRole("button", { name: "Employee: Cora Bell", exact: true });
  await expect(marker).toBeVisible();
  const canvas = page.getByLabel("Static planning map", { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  const before = await marker.evaluate((element) => ({ x: parseFloat(element.style.left), y: parseFloat(element.style.top) }));
  const start = { x: bounds.x + bounds.width * 0.2, y: bounds.y + bounds.height * 0.65 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 20, start.y + 15);
  await page.mouse.up();
  await expect.poll(() => marker.evaluate((element) => parseFloat(element.style.left))).toBeCloseTo(before.x + 20, 3);
  await expect.poll(() => marker.evaluate((element) => parseFloat(element.style.top))).toBeCloseTo(before.y + 15, 3);
});
