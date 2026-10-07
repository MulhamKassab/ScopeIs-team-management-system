import { expect, test } from "@playwright/test";

test.skip(process.env.SCOPEIS_PHASE6_E2E !== "true", "Run with the guarded Phase 6 fixture runner.");
async function signIn(page: import("@playwright/test").Page, name: string) { await page.goto("/login"); await page.getByText(name, { exact: true }).click(); await page.getByRole("button", { name: "Continue with mock persona" }).click(); await expect(page).toHaveURL(/\/dashboard$/); }
async function signOut(page: import("@playwright/test").Page) { await page.request.post("/api/auth/logout", { headers: { Origin: new URL(page.url()).origin } }); }

test("Super Admin records a skill and the Employee sees only their own recorded fact", async ({ page }) => {
  const skillName = `Browser capability ${test.info().project.name}`;
  await signIn(page, "Nora Albright");
  await page.goto("/skills");
  await page.getByRole("form", { name: "Create skill" }).getByLabel("Skill name").fill(skillName);
  await page.getByRole("form", { name: "Create skill" }).getByRole("button", { name: "Create skill" }).click();
  await expect(page.getByText("Skill created.")).toBeVisible();
  const record = page.getByRole("form", { name: "Record employee skill" });
  await record.getByLabel("Employee").selectOption({ label: "Cora Bell" });
  await record.getByLabel("Active catalogue skill").selectOption({ label: skillName });
  await record.getByRole("button", { name: "Record skill" }).click();
  await expect(page.getByText("Recorded skill added to the Employee profile.")).toBeVisible();
  await signOut(page);
  await signIn(page, "Cora Bell");
  await page.goto("/skills");
  await expect(page.getByRole("heading", { name: "My recorded skills" })).toBeVisible();
  await expect(page.getByText(skillName)).toBeVisible();
  await expect(page.getByText(/cannot add free-text skills/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
