import { expect } from "@playwright/test";
import { fictionalTestPassword } from "../../scripts/phase1-test-environment.mjs";

/**
 * Signs in through the real credential form with a fictional disposable-fixture account.
 *
 * The persona display name is still the stable caller-facing key for the Phase 1-11 journeys; it is
 * mapped here to the approved username so no journey keeps depending on the removed persona picker.
 */
export const credentialIdentifiers: Record<string, string> = {
  "Nora Albright": "nora",
  "Ava Mercer": "ava",
  "Ben Iqbal": "ben",
  "Cora Bell": "cora",
  "Dan Rowan": "dan",
};

export async function signIn(page: import("@playwright/test").Page, name: string) {
  const identifier = credentialIdentifiers[name];
  if (!identifier) throw new Error(`No credential fixture mapping for ${name}.`);
  await page.goto("/login");
  await page.getByLabel("Username or email").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(fictionalTestPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function signOut(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/logout", { headers: { Origin: new URL(page.url()).origin } });
  expect(response.status()).toBe(200);
}
