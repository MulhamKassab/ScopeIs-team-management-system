import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, name: string) {
  await page.goto("/login");
  await page.getByText(name, { exact: true }).click();
  await page.getByRole("button", { name: "Continue with mock persona" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function signOut(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/logout", { headers: { Origin: new URL(page.url()).origin } });
  expect(response.status()).toBe(200);
}

test("Super Admin receives the global real employee directory", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await page.goto("/employees");
  await expect(page.getByRole("heading", { name: "Employee directory" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Cora Bell/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Dan Rowan/ })).toBeVisible();
  await expect(page.locator("text=cora@example.test")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await signOut(page);
});

test("Admin receives only safe records in their Team scope", async ({ page }) => {
  await signIn(page, "Ava Mercer");
  await page.goto("/employees");
  await expect(page.getByRole("row", { name: /Cora Bell/ })).toBeVisible();
  await expect(page.getByText("Dan Rowan", { exact: true })).toHaveCount(0);
  await expect(page.getByText("cora@example.test", { exact: true })).toHaveCount(0);
  await expect(page.getByText("100", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Private Alpha location", { exact: true })).toHaveCount(0);
  await signOut(page);
});

test("Employee is forbidden from the workforce directory", async ({ page }) => {
  await signIn(page, "Cora Bell");
  const response = await page.goto("/employees");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Employee directory" })).toHaveCount(0);
  await signOut(page);
});
