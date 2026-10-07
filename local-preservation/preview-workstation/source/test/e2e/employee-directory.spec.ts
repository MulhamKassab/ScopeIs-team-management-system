import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, name: string) {
  await page.goto("/login");
  await page.getByText(name, { exact: true }).click();
  await page.getByRole("button", { name: "Continue with mock persona" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function signOut(page: import("@playwright/test").Page) {
  const status = await page.evaluate(async () => (await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })).status);
  expect(status).toBe(200);
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

test("Super Admin creates a workforce record with a server-generated code and no editable code field", async ({ page }, testInfo) => {
  const employeeName = `Riley Workforce ${testInfo.project.name}`;
  await signIn(page, "Nora Albright");
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  await expect(page.getByLabel("Employee code")).toHaveCount(0);
  await expect(page.getByText("Employee code is assigned automatically by the server after creation.")).toBeVisible();
  await page.getByLabel("Employee name").fill(employeeName);
  await page.getByLabel("Work email").fill("riley.workforce@example.test");
  await page.getByRole("button", { name: "Create employee" }).click();
  await expect(page).toHaveURL(/\/employees$/);
  const row = page.getByRole("row", { name: new RegExp(employeeName) });
  await expect(row).toBeVisible();
  await expect(row.getByText(/^\d{4}$/)).toBeVisible();
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
  await expect(page.getByLabel("Employee code")).toHaveCount(0);
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

test("management details preserve Admin privacy and provide visible Super Admin controls", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await page.goto("/employees");
  await page.getByRole("link", { name: "Cora Bell" }).click();
  await expect(page.getByRole("heading", { name: "Cora Bell" })).toBeVisible();
  await expect(page.getByText("cora@example.test", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Super Admin controls" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Edit basic employee information" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Employee assignments" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Change system role" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Employee lifecycle" })).toBeVisible();
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

test("Super Admin can use visible management controls without granting manager or Admin authority implicitly", async ({ page }, testInfo) => {
  const name = `Managed Workforce ${testInfo.project.name}`;
  await signIn(page, "Nora Albright");
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  await page.getByLabel("Employee name").fill(name);
  await page.getByRole("button", { name: "Create employee" }).click();
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("link", { name: "Manage employee" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  const basic = page.getByRole("form", { name: "Edit basic employee information" });
  await basic.getByLabel("Display name").fill(`${name} Updated`);
  await basic.getByRole("button", { name: "Save changes" }).click();
  await expect(basic.getByText("Basic employee information saved.")).toBeVisible();
  const assignments = page.getByRole("form", { name: "Employee assignments" });
  await assignments.getByLabel("Designation").selectOption({ label: "Field Engineer" });
  await assignments.getByLabel("Manager").selectOption("mock-employee-cora");
  await assignments.getByLabel("Team").fill("team:alpha");
  await assignments.getByLabel(/Working pattern/).fill("Hybrid weekdays");
  await assignments.getByRole("button", { name: "Save changes" }).click();
  await expect(assignments.getByText("Employee assignments saved.")).toBeVisible();
  const role = page.getByRole("form", { name: "Change system role" });
  await role.getByLabel("System role").selectOption("ADMIN");
  await role.getByRole("button", { name: "Save changes" }).click();
  await expect(role.getByText("System role saved. Existing sessions were revoked.")).toBeVisible();
  const grant = page.getByRole("form", { name: "Grant Admin TEAM scope" });
  await expect(grant).toBeVisible();
  await grant.getByLabel("TEAM scope").fill("team:alpha");
  await grant.getByRole("button", { name: "Save changes" }).click();
  await expect(grant.getByText("TEAM scope grant added.")).toBeVisible();
  const lifecycle = page.getByRole("form", { name: "Employee lifecycle" });
  page.once("dialog", (dialog) => dialog.accept());
  await lifecycle.getByRole("button", { name: "Deactivate employee" }).click();
  await expect(lifecycle.getByText("Employee deactivated and active sessions revoked.")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await lifecycle.getByRole("button", { name: "Reactivate employee" }).click();
  await expect(lifecycle.getByText("Employee reactivated.")).toBeVisible();
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
