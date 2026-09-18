import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./sign-in";

test.skip(process.env.SCOPEIS_PHASE11_E2E !== "true", "Run with the guarded Phase 11 fixture runner.");

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

/** Terminology guard: no general staffing-availability claim and no prohibited metric vocabulary. */
async function expectCleanTerminology(page: import("@playwright/test").Page) {
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const term of ["capacity", "utilization", "contracted hours", "worked hours", "attendance", "performance", "productive", "qualified", "compliant", "eligible", "availability", "available"]) {
    expect(text, `prohibited term present: ${term}`).not.toContain(term);
  }
}

const WINDOW = "from=2027-01-01&to=2027-12-31";

test("Super Admin reporting: dashboard, published allocation drill-down, planning separation, and a bounded CSV export", async ({ page }) => {
  await signIn(page, "Nora Albright");

  // 1. The dashboard renders role-specific cards with an as-of timestamp.
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/As of .* \(Asia\/Dubai\)/)).toBeVisible();
  await expect(page.locator(".reporting-cards li")).toHaveCount(9);
  await expect(page.getByText("Active employees", { exact: true })).toBeVisible();
  await expect(page.getByText("Evidence awaiting review", { exact: true })).toBeVisible();
  // All twelve approved surfaces are individually reachable: nine cards plus three tables.
  await expect(page.getByRole("heading", { name: "Employees by team" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Schedule lifecycle" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent recorded actions" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Schedule lifecycle" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recent recorded actions" })).toBeVisible();
  await expectCleanTerminology(page);
  await expectNoHorizontalOverflow(page);

  // 2. Published allocation drill-down shows only Published rows.
  await page.goto(`/reports/published-allocation?${WINDOW}`);
  await expect(page.getByRole("heading", { name: "Published allocation" })).toBeVisible();
  const rows = page.locator(".report-table tbody tr");
  await expect(rows.first()).toBeVisible();
  await expect(page.locator(".report-table tbody")).toContainText("PUBLISHED");
  await expect(page.locator(".report-table tbody")).not.toContainText("PLANNING (unpublished)");
  await expectCleanTerminology(page);
  await expectNoHorizontalOverflow(page);

  // 3. The planning report is separate, explicitly labelled, and never mixes in Published rows.
  await page.goto(`/reports/planning-unpublished?${WINDOW}`);
  await expect(page.getByRole("heading", { name: "PLANNING (UNPUBLISHED)" })).toBeVisible();
  await expect(page.locator(".reporting-planning-banner")).toContainText("PLANNING (unpublished)");
  await expect(page.locator(".report-table tbody")).toContainText("PLANNING (unpublished)");
  await expect(page.locator(".report-table tbody")).not.toContainText("PUBLISHED");
  await expectCleanTerminology(page);

  // 4. The export streams a bounded CSV with the required safety headers.
  const exportResponse = await page.request.get(`/api/reports/published-allocation/export?${WINDOW}`);
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(exportResponse.headers()["cache-control"]).toContain("no-store");
  expect(exportResponse.headers()["content-disposition"]).toContain("scopeis-published-allocation-");
  const body = await exportResponse.text();
  expect(body).toContain("Assignment date");
  expect(body).not.toContain("FICTIONAL-PRIVATE-MARKER");

  // 5. The planning export names itself as planning and is available to a Super Admin.
  const planningExport = await page.request.get(`/api/reports/planning-unpublished/export?${WINDOW}`);
  expect(planningExport.status()).toBe(200);
  expect((await planningExport.text())).toContain("PLANNING (unpublished)");
  await signOut(page);
});

test("Scoped Admin reporting is scope-bounded, may open planning, may not reach audit, and may not export planning", async ({ page }) => {
  await signIn(page, "Ava Mercer");

  // 1. The dashboard is the scoped variant, with no audit or review-queue card.
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Active employees in my scope", { exact: true })).toBeVisible();
  await expect(page.getByText("Evidence awaiting review", { exact: true })).toHaveCount(0);
  // The scoped Admin keeps the approved shape and never receives the Super-Admin-only tables.
  await expect(page.getByRole("heading", { name: "Schedule lifecycle" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recent recorded actions" })).toHaveCount(0);
  await expect(page.getByText("Certifications in my scope", { exact: true })).toBeVisible();
  await expectCleanTerminology(page);

  // 2. The Admin reaches the report index and the planning report inside their scope.
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByText("Certification status", { exact: true })).toBeVisible();
  await page.goto(`/reports/planning-unpublished?${WINDOW}`);
  await expect(page.getByRole("heading", { name: "PLANNING (UNPUBLISHED)" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // 3. The certification report shows the approved summary projection without employee attribution.
  await page.goto(`/reports/certification-status?${WINDOW}`);
  await expect(page.getByRole("heading", { name: "Certification status" })).toBeVisible();
  await expect(page.locator(".report-table thead")).not.toContainText("Employee");
  await expect(page.locator(".report-table thead")).toContainText("Review state");

  // 4. Admin-only-excluded and Super-Admin-only reports are non-enumerating 404s.
  for (const path of ["/reports/leave-balance", "/reports/evidence-review-queue", "/reports/audit-history"]) {
    expect((await page.goto(path))?.status()).toBe(404);
  }

  // 5. The Admin may export the published allocation but not the planning report.
  const allowed = await page.request.get(`/api/reports/published-allocation/export?${WINDOW}`);
  expect(allowed.status()).toBe(200);
  const refused = await page.request.get(`/api/reports/planning-unpublished/export?${WINDOW}`);
  expect(refused.status()).toBe(404);
  expect(await refused.text()).not.toContain("assignment");
  await signOut(page);
});

test("Employee dashboard is self-only and reporting stays closed", async ({ page }) => {
  await signIn(page, "Cora Bell");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("My unread notifications", { exact: true })).toBeVisible();
  await expect(page.locator(".reporting-cards li")).toHaveCount(4);
  // All five approved Employee areas are individually labelled.
  await expect(page.getByText("My leave and balance", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "My leave" })).toBeVisible();
  await expect(page.getByRole("region", { name: "My published assignments (next 7 days)" })).toBeVisible();
  await expect(page.getByText("Skills I have recorded", { exact: true })).toBeVisible();
  await expect(page.getByText("My capability evidence", { exact: true })).toBeVisible();
  // No organisational total and no other employee's name.
  await expect(page.getByText("Active employees", { exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Dan Unscoped");
  await expectCleanTerminology(page);
  await expectNoHorizontalOverflow(page);

  // Reporting is closed to an Employee, including the planning report and the export endpoint.
  for (const path of ["/reports", "/reports/published-allocation", "/reports/planning-unpublished"]) {
    expect((await page.goto(path))?.status()).toBe(404);
  }
  expect((await page.request.get(`/api/reports/published-allocation/export?${WINDOW}`)).status()).toBe(404);
  await signOut(page);
});
