import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./sign-in";

test.skip(process.env.SCOPEIS_PHASE6_E2E !== "true", "Run with the guarded Phase 6 fixture runner.");

test("Super Admin records a skill and the Employee sees only their own recorded fact", async ({ page }) => {
  const skillName = `Browser capability ${test.info().project.name}`;
  await signIn(page, "Nora Albright");
  await page.goto("/skills");
  await page.locator(".journey-disclosure > summary").filter({ hasText: "Manage skill list" }).click();
  await page.getByRole("button", { name: "Add skill" }).click();
  await page.getByRole("form", { name: "Create skill" }).getByLabel("Skill name").fill(skillName);
  await page.getByRole("form", { name: "Create skill" }).getByRole("button", { name: "Create skill" }).click();
  await expect(page.getByText("Skill created.")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("combobox", { name: "Person", exact: true }).selectOption({ label: "Cora Bell" });
  await page.getByRole("button", { name: "View skills", exact: true }).click();
  await page.getByRole("button", { name: "Record a skill for Cora Bell", exact: true }).click();
  const record = page.getByRole("form", { name: "Record employee skill" });
  await expect(record.locator('input[name="employeeUserId"]')).toHaveValue("mock-employee-cora");
  await record.getByRole("combobox", { name: "Skill", exact: true }).selectOption({ label: skillName });
  await record.getByRole("button", { name: "Record skill" }).click();
  await expect(page.getByText("Recorded skill added to the Employee profile.")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await signOut(page);
  await signIn(page, "Cora Bell");
  await page.goto("/skills");
  await expect(page.getByRole("heading", { name: "My recorded skills" })).toBeVisible();
  await expect(page.getByText(skillName)).toBeVisible();
  await expect(page.getByText(/recorded by your Super Admin/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
