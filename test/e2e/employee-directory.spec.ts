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

test("Super Admin creates a workforce record without exposing contact data in the directory", async ({ page }, testInfo) => {
  const employeeCode = `EMP-NEW-240-${testInfo.project.name.toUpperCase()}`;
  await signIn(page, "Nora Albright");
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  await page.getByLabel("Employee name").fill("Riley Workforce");
  await page.getByLabel("Employee code").fill(employeeCode);
  await page.getByLabel("Work email").fill("riley.workforce@example.test");
  await page.getByRole("button", { name: "Create employee" }).click();
  await expect(page).toHaveURL(/\/employees$/);
  await expect(page.getByText(employeeCode, { exact: true })).toBeVisible();
  await expect(page.getByText("riley.workforce@example.test", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await signOut(page);
});

test("creation form returns field-level validation errors", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  await page.getByRole("button", { name: "Create employee" }).click();
  await expect(page.getByText("Enter an employee name with at least 2 characters.")).toBeVisible();
  await expect(page.getByText("Enter an employee code with at least 2 characters.")).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Add employee" })).toHaveCount(0);
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

test("management details preserve Admin privacy and expose only Super Admin controls", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await page.goto("/employees");
  await page.getByRole("link", { name: "Cora Bell" }).click();
  await expect(page.getByRole("heading", { name: "Cora Bell" })).toBeVisible();
  await expect(page.getByText("cora@example.test", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Super Admin controls" })).toBeVisible();
  await signOut(page);

  await signIn(page, "Ava Mercer");
  await page.goto("/employees/mock-employee-cora");
  await expect(page.getByRole("heading", { name: "Cora Bell" })).toBeVisible();
  await expect(page.getByText("cora@example.test", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Private Alpha location", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Super Admin controls" })).toHaveCount(0);
  const crossScope = await page.goto("/employees/mock-employee-dan");
  expect(crossScope?.status()).toBe(404);
  await signOut(page);
});

test("Employee views and updates only the self-service profile", async ({ page }) => {
  await signIn(page, "Cora Bell");
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "My professional profile" })).toBeVisible();
  await expect(page.getByLabel("My professional profile").getByText("Cora Bell", { exact: true })).toBeVisible();
  await page.getByLabel("Work phone").fill("101");
  await page.getByLabel("Professional summary").fill("Updated fictional profile");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.locator(".employee-form-success, .employee-form-error")).toContainText(/saved|changed/i);
  await page.reload();
  await expect(page.getByLabel("Work phone")).toHaveValue("101");
  await expect(page.getByLabel("Professional summary")).toHaveValue("Updated fictional profile");
  const management = await page.goto("/employees/mock-employee-cora");
  expect(management?.status()).toBe(404);
  await signOut(page);
});
