import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

test.skip(process.env.SCOPEIS_PHASE9_E2E !== "true", "Run with the guarded Phase 9 fixture runner.");

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

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test("Employee saves capability evidence privately, Super Admin reviews and verifies it, and the owner archives it", async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const title = `Fictional Phase 9 Certification ${suffix}`;
  const directory = await mkdtemp(join(tmpdir(), "scopeis-phase9-e2e-"));
  const filePath = join(directory, `Fictional Evidence ${suffix}.pdf`);
  await writeFile(filePath, "%PDF-1.4\n% fictional ScopeIs evidence\n%%EOF\n");

  try {
    // 1. The employee saves evidence immediately, with no approval gate.
    await signIn(page, "Cora Bell");
    await page.goto("/profile");
    const create = page.getByRole("form", { name: "Add certifications" });
    await create.getByLabel("Title").fill(title);
    await create.getByLabel("Issuer or provider").fill("Fictional Safety Institute");
    await create.getByLabel("Issue date").fill("2026-01-15");
    await create.getByLabel("Expiry date (optional)").fill("2027-01-15");
    await create.getByRole("button", { name: "Save evidence" }).click();
    await expect(create.getByText(/Capability evidence saved/)).toBeVisible();

    const item = page.locator("article.evidence-item").filter({ hasText: title });
    await expect(item).toBeVisible();
    await expect(item.getByText("New / updated")).toBeVisible();
    await expect(item.getByText(/Expires 2027-01-15 \(valid\)/)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // 2. A private file is uploaded through the authorized route and delivered with safe headers.
    await item.getByRole("form", { name: "Attach or replace file" }).locator('input[type="file"]').setInputFiles(filePath);
    await item.getByRole("button", { name: "Upload private file" }).click();
    await expect(item.getByText("Private file saved.")).toBeVisible();
    const previewLink = item.getByRole("link", { name: "Preview file" });
    await expect(previewLink).toBeVisible();
    const href = await previewLink.getAttribute("href");
    const download = await page.request.get(href!);
    expect(download.status()).toBe(200);
    expect(download.headers()["x-content-type-options"]).toBe("nosniff");
    expect(download.headers()["content-disposition"]).toContain("inline");
    expect(download.headers()["cache-control"]).toContain("no-store");
    const body = await download.text();
    expect(body).toContain("%PDF-1.4");
    expect(body).not.toContain("evidence/");
    await signOut(page);

    // 3. Super Admin reviews and verifies from the employee detail context.
    await signIn(page, "Nora Albright");
    await page.goto("/employees/mock-employee-cora");
    const reviewItem = page.locator("article.evidence-item").filter({ hasText: title });
    await expect(reviewItem).toBeVisible();
    await expect(reviewItem.getByText("Not reviewed", { exact: true })).toBeVisible();
    await reviewItem.getByRole("form", { name: `Mark ${title} reviewed` }).getByRole("button").click();
    await expect(reviewItem.getByText("Reviewed", { exact: true })).toBeVisible();
    await reviewItem.getByRole("form", { name: `Verify ${title}` }).getByRole("button").click();
    await expect(reviewItem.getByText("Verified", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await signOut(page);

    // 4. The owner sees the review and verification state on their own evidence.
    await signIn(page, "Cora Bell");
    await page.goto("/profile");
    const ownedAfterReview = page.locator("article.evidence-item").filter({ hasText: title });
    await expect(ownedAfterReview.getByText("Verified", { exact: true })).toBeVisible();
    await expect(ownedAfterReview.getByText("New / updated")).toHaveCount(0);

    // 5. Archiving preserves history and removes the item from the active list.
    await ownedAfterReview.getByRole("form", { name: `Archive ${title}` }).getByRole("button").click();
    await expect(page.locator("article.evidence-item").filter({ hasText: title })).toHaveCount(0);
    const archivedSection = page.locator("details.evidence-archive").first();
    await expect(archivedSection).toBeVisible();
    await archivedSection.locator("summary").click();
    await expect(archivedSection.getByText(title)).toBeVisible();
    await signOut(page);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Scoped Admin receives certification summary only and Employee is denied management evidence", async ({ page }) => {
  const title = `Fictional Scoped Summary ${Date.now()}`;
  await signIn(page, "Cora Bell");
  await page.goto("/profile");
  const create = page.getByRole("form", { name: "Add certifications" });
  await create.getByLabel("Title").fill(title);
  await create.getByLabel("Issuer or provider").fill("Fictional Safety Institute");
  await create.getByLabel("Issue date").fill("2026-03-01");
  await create.getByRole("button", { name: "Save evidence" }).click();
  await expect(page.locator("article.evidence-item").filter({ hasText: title })).toBeVisible();

  // An Employee never reaches the management evidence surface.
  const denied = await page.goto("/employees/mock-employee-cora");
  expect(denied?.status()).toBe(404);
  await signOut(page);

  // A scoped Admin inside the TEAM scope sees the certification summary without private detail.
  await signIn(page, "Ava Mercer");
  await page.goto("/employees/mock-employee-cora");
  await expect(page.getByRole("heading", { name: "Certification summary" })).toBeVisible();
  await expect(page.getByText(/Certifications recorded by Cora Bell/)).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText(/withheld/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Preview file" })).toHaveCount(0);
  await expect(page.getByRole("form", { name: /Verify / })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  // A different TEAM's Admin receives a non-enumerating refusal for the same record.
  await signOut(page);
  await signIn(page, "Ben Iqbal");
  const crossTeam = await page.goto("/employees/mock-employee-cora");
  expect(crossTeam?.status()).toBe(404);
  await signOut(page);
});
