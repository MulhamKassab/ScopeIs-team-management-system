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
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Workspace starting points" }).getByRole("link", { name: /Plan, review, publish/ })).toHaveAttribute("href", "/schedule");
  await expect(page.getByText(/As of .* \(Asia\/Dubai\)/)).toBeVisible();
  await expect(page.locator(".journey-disclosure").filter({ hasText: "More team insights" })).not.toHaveAttribute("open");
  await page.getByText("More team insights", { exact: true }).click();
  await expect(page.locator(".reporting-cards li")).toHaveCount(9);
  await expect(page.getByText("Active people", { exact: true })).toBeVisible();
  await expect(page.getByText("Documents to review", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Who is working where" })).toBeVisible();
  const rows = page.locator(".report-table tbody tr");
  await expect(rows.first()).toBeVisible();
  await expect(page.locator(".report-table tbody")).toContainText("PUBLISHED");
  await expect(page.locator(".report-table tbody")).not.toContainText("PLANNING (unpublished)");
  await expectCleanTerminology(page);
  await expectNoHorizontalOverflow(page);

  // 3. The planning report is separate, explicitly labelled, and never mixes in Published rows.
  await page.goto(`/reports/planning-unpublished?${WINDOW}`);
  await expect(page.getByRole("heading", { name: "Unpublished plans" })).toBeVisible();
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

test("Scoped Admin dashboard remains useful while every report and export is refused", async ({ page }) => {
  await signIn(page, "Ava Mercer");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const shortcuts = page.getByRole("navigation", { name: "Workspace starting points" });
  await expect(shortcuts.getByRole("link", { name: /View team schedules/ })).toHaveAttribute("href", "/schedule");
  await expect(shortcuts.getByRole("link", { name: /Plan, review, publish/ })).toHaveCount(0);
  await expect(page.getByText("People you manage", { exact: true })).toBeVisible();
  for (const heading of ["Schedule lifecycle", "Recent recorded actions"]) await expect(page.getByRole("heading", { name: heading })).toHaveCount(0);
  for (const label of ["Documents to review", "Pending leave requests", "Approved leave days this month"]) await expect(page.getByText(label, { exact: true })).toHaveCount(0);
  await page.getByText("More team insights", { exact: true }).click();
  await expect(page.getByText("Certifications in my scope", { exact: true })).toBeVisible();
  await expect(page.locator('a[href^="/reports"], a[href^="/leave"]')).toHaveCount(0);
  await expectCleanTerminology(page);
  for (const path of ["/reports", "/reports/published-allocation", "/reports/planning-unpublished", "/reports/certification-status", "/reports/leave-balance", "/reports/evidence-review-queue", "/reports/audit-history"]) {
    expect((await page.goto(path + "?" + WINDOW))?.status(), path).toBe(404);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Return to a safe page" })).toBeVisible();
    await expect(page.locator(".report-table")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  }
  for (const key of ["published-allocation", "planning-unpublished", "certification-status"]) {
    const refused = await page.request.get("/api/reports/" + key + "/export?" + WINDOW);
    expect(refused.status()).toBe(404);
    expect(await refused.text()).not.toContain("assignment");
  }
  await signOut(page);
});

test("Employee dashboard is self-only and reporting stays closed", async ({ page }) => {
  await signIn(page, "Cora Bell");

  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  const shortcuts = page.getByRole("navigation", { name: "Workspace starting points" });
  const links = shortcuts.getByRole("link");
  await expect(links).toHaveCount(4);
  for (const [index, name, href] of [
    [0, "Tickets", "/tickets"], [1, "Schedule", "/schedule"],
    [2, "Vacations", "/leave"], [3, "My profile", "/profile"],
  ] as const) {
    await expect(links.nth(index)).toContainText(name);
    await expect(links.nth(index)).toHaveAttribute("href", href);
  }
  await expect(page.getByRole("link", { name: "Open tickets", exact: true })).toHaveAttribute("href", "/tickets");
  await expect(page.getByText("My unread notifications", { exact: true })).toBeVisible();
  await expect(page.locator(".reporting-cards li")).toHaveCount(4);
  // All five approved Employee areas are individually labelled.
  await expect(page.getByText("My leave and balance", { exact: true })).toBeVisible();
  await page.getByText("More about your work", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "My leave" })).toBeVisible();
  await expect(page.getByRole("region", { name: "My published assignments (next 7 days)" })).toBeVisible();
  await expect(page.getByText("My recorded skills", { exact: true })).toBeVisible();
  await expect(page.getByText("My documents", { exact: true })).toBeVisible();
  // No organisational total and no other employee's name.
  await expect(page.getByText("Active people", { exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Dan Unscoped");
  await expectCleanTerminology(page);
  await expectNoHorizontalOverflow(page);

  // Daily work starts directly from Home, while the profile keeps its read-only skills prominent.
  await shortcuts.getByRole("link", { name: /^Tickets/ }).click();
  await expect(page).toHaveURL(/\/tickets(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: "Workspace starting points" }).getByRole("link", { name: /^My profile/ }).click();
  await expect(page.getByRole("heading", { name: "My profile", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "My recorded skills", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record skill", exact: true })).toHaveCount(0);
  await page.goto("/dashboard");
  await page.getByText("More about your work", { exact: true }).click();

  // The skill action opens the existing read-only skill view, never promises editing rights.
  await page.getByRole("link", { name: "View my skills: My recorded skills" }).click();
  await expect(page.getByRole("heading", { name: "My recorded skills" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record skill", exact: true })).toHaveCount(0);

  // Reporting is closed to an Employee, including the planning report and the export endpoint.
  for (const path of ["/reports", "/reports/published-allocation", "/reports/planning-unpublished"]) {
    expect((await page.goto(path))?.status()).toBe(404);
  }
  expect((await page.request.get(`/api/reports/published-allocation/export?${WINDOW}`)).status()).toBe(404);
  await signOut(page);
});


test("report filters apply without errors, retain their values and export the same conflict window", async ({ page }) => {
  await signIn(page, "Nora Albright");
  await page.goto(`/reports/published-allocation?${WINDOW}`);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("heading", { name: "Who is working where", exact: true })).toBeVisible();
  await expect(page.locator(".report-table tbody tr")).toHaveCount(2);
  await expect(page.getByLabel("Window start time")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Client", exact: true }).selectOption({ label: "Bravo Engineering" });
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No published assignment falls inside this window for your current scope.")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Client", exact: true }).locator("option:checked")).toHaveText("Bravo Engineering");

  await page.goto("/reports/approved-leave?from=2027-09-01&to=2027-09-30");
  await page.getByLabel("Conflict date").fill("2027-09-14");
  await page.getByLabel("Window start time").fill("08:00");
  await page.getByLabel("Window end time").fill("09:00");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByLabel("Window start time")).toHaveValue("08:00");
  await expect(page.locator(".report-table tbody")).toContainText("Published assignment overlaps the selected time window");
  const exportHref = await page.getByRole("link", { name: "Download CSV" }).getAttribute("href");
  const csv = await page.request.get(exportHref!);
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("Published assignment overlaps the selected time window");

  await page.goto("/reports/approved-leave?from=2027-01-01&to=2027-12-31");
  await expect(page.getByRole("region", { name: "Check report filters" }).getByRole("alert")).toContainText("Narrow the date range to 90 days");
  await expect(page.getByRole("link", { name: "Reset filters" })).toBeVisible();
  await signOut(page);
});
