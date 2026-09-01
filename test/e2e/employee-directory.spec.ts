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

test("Super Admin searches employee name and employee code", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await page.goto("/employees?query=Cora");
  await expect(page.getByRole("heading", { name: "Employee directory" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Cora Bell/ })).toBeVisible();
  await expect(page.getByText("Dan Rowan", { exact: true })).toHaveCount(0);
  await page.goto("/employees?query=EMP-BRAVO-001");
  await expect(page.getByRole("row", { name: /Dan Rowan/ })).toBeVisible();
  await expect(page.locator("text=cora@example.test")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await signOut(page);
});

test("Super Admin combines designation, team, and status filters", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await page.goto("/employees");
  await page.getByRole("combobox", { name: "Designation" }).selectOption({ label: "Field Engineer" });
  await page.getByRole("combobox", { name: "Team" }).selectOption("team:alpha");
  await page.getByRole("combobox", { name: "Status" }).selectOption("active");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("3 active filters")).toBeVisible();
  await expect(page.getByRole("row", { name: /Cora Bell/ })).toBeVisible();
  await expect(page.getByText("Dan Rowan", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/employees");
  await signOut(page);
});

test("Admin filtering remains safe within their Team scope", async ({ page }) => {
  await signIn(page, "Ava Mercer");
  await page.goto("/employees?query=Dan&team=team:bravo&status=inactive");
  await expect(page.getByRole("heading", { name: "No matching employees" })).toBeVisible();
  await expect(page.getByText("Dan Rowan", { exact: true })).toHaveCount(0);
  await expect(page.getByText("cora@example.test", { exact: true })).toHaveCount(0);
  await expect(page.getByText("100", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Private Alpha location", { exact: true })).toHaveCount(0);
  await signOut(page);
});

test("invalid repeated directory parameters fail safely", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await page.goto("/employees?query=Cora&query=Dan");
  await expect(page.locator(".directory-filter-error")).toContainText("could not be applied");
  await expect(page.getByRole("heading", { name: "No matching employees" })).toBeVisible();
  await expect(page.getByText("Cora Bell", { exact: true })).toHaveCount(0);
  await signOut(page);
});

test("Employee is forbidden from the workforce directory", async ({ page }) => {
  await signIn(page, "Cora Bell");
  const response = await page.goto("/employees");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Employee directory" })).toHaveCount(0);
  await signOut(page);
});
