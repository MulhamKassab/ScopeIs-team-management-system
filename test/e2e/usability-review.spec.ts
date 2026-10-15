import { expect, test, type Page } from "@playwright/test";
import { phase3Ids } from "../../scripts/phase4-test-fixtures.mjs";
import { usabilityIds } from "../../scripts/usability-review-test-fixtures.mjs";
import { signIn, signOut } from "./sign-in";
test.skip(process.env.SCOPEIS_USABILITY_E2E !== "true", "Use the guarded usability review runner.");
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dbe8ed"/></svg>' }));
});

async function contrastIssues(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1; const ctx = canvas.getContext("2d")!;
    const rgba = (value: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
    const luminance = (color: number[]) => color.slice(0, 3).map((value) => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const issues: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>("main :is(h1,h2,h3,h4,h5,p,label,dt,dd,a,button,summary,span,strong,small), dialog[open] :is(label,a,button,p,summary)")) {
      if (!element.getClientRects().length || getComputedStyle(element).visibility !== "visible" || element.closest('[aria-hidden="true"], .sr-only, .workflow-sr-only') || ![...element.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim())) continue;
      const style = getComputedStyle(element);
      // The phone calendar intentionally replaces the count text with a coloured dot.
      // Zero-size glyphs are not rendered text; the day button keeps its complete accessible name.
      if (parseFloat(style.fontSize) === 0) continue;
      let parent: HTMLElement | null = element; let background: number[] | undefined;
      while (parent) { const color = rgba(getComputedStyle(parent).backgroundColor); if (color[3] === 255) { background = color; break; } parent = parent.parentElement; }
      if (!background) background = rgba(getComputedStyle(document.documentElement).backgroundColor);
      const foreground = rgba(style.color); const first = luminance(foreground), second = luminance(background); const ratio = (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5) - .02) issues.push(`${element.tagName}.${element.className}: ${element.textContent?.trim().slice(0, 70)} (${ratio.toFixed(2)})`);
    }
    return issues;
  });
}

test("semantic text and button colours stay readable across workspaces and create dialogs in both themes", async ({ page }, info) => {
  await signIn(page, "Nora Albright");
  const routes = ["/dashboard", "/clients", `/clients/${phase3Ids.alphaClient}`, "/projects", `/projects/${phase3Ids.alphaProjectOne}`, "/locations", `/locations/${phase3Ids.alphaLocation}`, "/employees", "/employees/mock-employee-cora", "/accounts", "/teams", "/designations", "/arrangements", "/skills", "/notifications", "/reports", "/audit", "/profile", "/requests", "/settings", "/schedule?month=2027-05", "/coverage?month=2027-05", "/map?date=2027-05-12", `/leave?request=${usabilityIds.leave}`, "/tickets"];
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "Switch to dark mode" }).click();
    const failures: string[] = [];
    for (const route of routes) {
      expect((await page.goto(route))?.status()).toBe(200); await expect(page.getByRole("main")).toBeVisible();
      expect(await page.locator("main").innerText()).not.toContain("—");
      failures.push(...(await contrastIssues(page)).map((issue) => `${theme} ${route} ${issue}`));
    }
    await page.goto(`/clients/${phase3Ids.alphaClient}`);
    await expect(page.getByText("Fictional location · review entrance", { exact: true })).toBeVisible();
    const create = page.getByRole("button", { name: "Create project", exact: true });
    await expect(create).toBeEnabled(); await create.hover();
    failures.push(...(await contrastIssues(page)).map((issue) => `${theme} client hover ${issue}`));
    await create.click(); await expect(page.getByRole("dialog")).toBeVisible();
    failures.push(...(await contrastIssues(page)).map((issue) => `${theme} project dialog ${issue}`));
    await page.screenshot({ path: info.outputPath(`${theme}-project-colours.png`), fullPage: true });
    await page.keyboard.press("Escape");
    expect(failures).toEqual([]);
  }
});

test("map identifies shared-place people and supports real dragging, wheel zoom and RTL phone reflow", async ({ page }, info) => {
  await signIn(page, "Nora Albright"); await page.goto("/map?date=2027-05-12");
  await expect(page.getByRole("heading", { name: "Who is working where" })).toBeVisible();
  await expect(page.getByText("Map controls and privacy")).toHaveCount(0);
  await page.getByRole("button", { name: /Worksite: .*2 assignments/ }).click();
  const choices = page.getByRole("region", { name: "Assignments at selected place" });
  await choices.getByRole("button", { name: /Dan Unscoped/ }).click();
  await expect(page.locator(".map-selection-card")).toContainText("Dan Unscoped");
  await choices.getByRole("button", { name: /Cora Bell/ }).click();
  const canvas = page.getByLabel("Static planning map", { exact: true }); await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!; const marker = page.getByRole("button", { name: "Employee: Cora Bell", exact: true });
  const start = { x: bounds.x + bounds.width * .22, y: bounds.y + bounds.height * .55 };
  const before = await marker.evaluate((element) => ({ x: parseFloat(element.style.left), y: parseFloat(element.style.top) }));
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(start.x + 45, start.y + 25, { steps: 6 }); await page.mouse.up();
  await expect.poll(() => marker.evaluate((element) => parseFloat(element.style.left))).toBeCloseTo(before.x + 45, 1);
  await expect.poll(() => marker.evaluate((element) => parseFloat(element.style.top))).toBeCloseTo(before.y + 25, 1);
  const beforeWheel = await marker.evaluate((element) => parseFloat(element.style.left)); const scrollBefore = await page.evaluate(() => scrollY);
  await page.mouse.move(start.x, start.y); await page.mouse.wheel(0, -120);
  await expect.poll(() => marker.evaluate((element) => parseFloat(element.style.left))).not.toBe(beforeWheel);
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await page.getByRole("button", { name: "Fit all", exact: true }).click();
  await page.screenshot({ path: info.outputPath("practical-map.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.context().addCookies([{ name: "scopeis-direction", value: "rtl", url: new URL(page.url()).origin }]);
  await page.getByRole("button", { name: "Switch to dark mode" }).click(); await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const smallCanvas = (await canvas.boundingBox())!;
  const labels = await canvas.locator(".map-pin-label").evaluateAll((elements) => elements.map((element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right }; }));
  for (const label of labels) { expect(label.left).toBeGreaterThanOrEqual(smallCanvas.x); expect(label.right).toBeLessThanOrEqual(smallCanvas.x + smallCanvas.width); }
  expect((await page.getByRole("button", { name: "Focus selected", exact: true }).boundingBox())!.height).toBeLessThanOrEqual(56);
  await expect(page.getByRole("link", { name: /OpenStreetMap/ })).toBeVisible();
  await page.screenshot({ path: info.outputPath("map-320-rtl-dark.png"), fullPage: true });
});

test("vacation reviewer sees dated cover, planning, leave and ticket context while lower roles remain private", async ({ page }, info) => {
  await signIn(page, "Nora Albright"); await page.goto(`/leave?request=${usabilityIds.leave}`);
  const activity = page.getByRole("region", { name: "Employee activity during requested vacation" });
  await expect(activity).toContainText("Cover requested for this employee");
  await expect(activity).toContainText("Nominated to cover another assignment");
  await expect(activity).toContainText("Draft timetable"); await expect(activity).toContainText("CANCELLED");
  await expect(activity).toContainText("Fictional equipment review");
  await expect(page.getByText(/assignment\(s\) overlap/)).toBeVisible();
  await page.getByRole("form", { name: "Decide leave request" }).getByLabel("Decision").selectOption("APPROVED");
  await expect(page.getByRole("button", { name: "Save decision", exact: true })).toBeDisabled();
  await page.screenshot({ path: info.outputPath("vacation-review-context.png"), fullPage: true });
  await activity.getByRole("link", { name: "Open cover request" }).first().click(); await expect(page.locator('[id^="request-"]').first()).toBeVisible();
  await signOut(page); await signIn(page, "Ava Mercer");
  expect((await page.goto(`/leave?request=${usabilityIds.leave}`))?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText("Fictional reviewer context example");
  await page.goto("/map?date=2027-05-12"); await expect(page.getByText(/Coarse planning area/).first()).toBeVisible();
  await expect(page.getByText("Dan Unscoped")).toHaveCount(0);
  await signOut(page); await signIn(page, "Cora Bell"); await page.goto(`/leave?request=${usabilityIds.leave}`);
  await expect(page.getByRole("heading", { name: "My vacations", exact: true })).toBeVisible(); await expect(activity).toHaveCount(0);
});
