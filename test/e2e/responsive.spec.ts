import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { phase3Ids, phase11Ids } from "../../scripts/phase11-test-fixtures.mjs";
import { phase10Ids } from "../../scripts/phase10-test-fixtures.mjs";
import { responsiveIds } from "../../scripts/responsive-test-fixtures.mjs";
import { signIn } from "./sign-in";

const managementRoutes = [
  "/dashboard", "/employees", "/employees/mock-employee-cora", "/accounts", "/skills",
  "/clients", `/clients/${phase3Ids.alphaClient}`, "/projects", `/projects/${phase3Ids.alphaProjectOne}`,
  "/locations", `/locations/${phase3Ids.alphaLocation}`,
  `/schedule?month=2027-10&period=${phase10Ids.discussionPeriod}`,
  `/schedule?month=2027-09&period=${phase11Ids.publishedPeriod}`,
  `/coverage?assignment=${phase10Ids.discussionAnchor}`, "/replacements", "/leave", `/leave?request=${responsiveIds.pendingLeave}`,
  "/map?date=2027-05-12", "/notifications", "/reports", "/audit", "/profile", "/settings",
];
const viewports = [
  { width: 320, height: 640 }, { width: 390, height: 844 }, { width: 600, height: 900 },
  { width: 768, height: 1024 }, { width: 820, height: 1180 }, { width: 1024, height: 768 },
  { width: 1280, height: 800 }, { width: 1920, height: 1080 },
];

async function layoutIssues(page: Page, context: string) {
  // Measure modal touch targets once their finite entrance animation has settled.
  await page.evaluate(async () => {
    const modal = document.querySelector(".task-dialog[open], .mobile-sheet");
    if (!modal) return;
    await Promise.all(modal.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
  });
  const issues = await page.evaluate(() => {
    const problems: string[] = [];
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > width + 1) problems.push(`page overflow: ${document.documentElement.scrollWidth} > ${width}`);
    const modal = document.querySelector<HTMLDialogElement>(".task-dialog[open]");
    if (modal) {
      const rect = modal.getBoundingClientRect();
      if (rect.left < -1 || rect.right > width + 1 || rect.top < -1 || rect.bottom > innerHeight + 1) problems.push("dialog outside viewport");
      const content = modal.querySelector<HTMLElement>(".task-dialog-content")!;
      if (content.scrollWidth > content.clientWidth + 1) problems.push("dialog content overflows horizontally");
    }
    const root = modal ?? document;
    for (const element of root.querySelectorAll<HTMLElement>(".button, .icon-button, .bottom-nav a, .bottom-nav button, summary, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea")) {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || !element.checkVisibility() || element.closest("[inert]")) continue;
      const name = (element.getAttribute("aria-label") || element.getAttribute("name") || element.textContent?.trim() || element.tagName).slice(0, 65);
      if (width <= 1024 && rect.height < 43.5) problems.push(`short target: ${name} (${Math.round(rect.height)}px)`);
      if (rect.left < -1 || rect.right > width + 1) {
        // Wide report tables are intentionally scrollable, with keyboard access in their own region.
        if (!element.closest(".report-table-wrap, .account-table-scroll, .directory-table-wrap")) problems.push(`control outside viewport: ${name}`);
      }
      if (width <= 760 && element.matches("input, select, textarea") && parseFloat(getComputedStyle(element).fontSize) < 16) problems.push(`small mobile input text: ${name}`);
      if (element instanceof HTMLInputElement && element.type === "month" && element.value) {
        const canvas = document.createElement("canvas").getContext("2d")!;
        canvas.font = getComputedStyle(element).font;
        const value = new Intl.DateTimeFormat(document.documentElement.lang, { month: "long", year: "numeric" }).format(new Date(`${element.value}-15T12:00:00`));
        if (rect.width < canvas.measureText(value).width + 40) problems.push("month picker clips its month or year");
      }
    }
    return problems;
  });
  return issues.map((issue) => `${context}: ${issue}`);
}

async function attachIssues(testInfo: TestInfo, issues: string[]) {
  await testInfo.attach("responsive-layout-issues", { body: JSON.stringify(issues, null, 2), contentType: "application/json" });
  expect(issues).toEqual([]);
}

async function captureVisual(page: Page, testInfo: TestInfo, name: string) {
  // Playwright settles finite animations and fonts without waiting on hidden route animations.
  await page.screenshot({ path: testInfo.outputPath(name), animations: "disabled" });
}

test.beforeEach(async ({ page }) => {
  // The fixture map uses a deterministic accessible fallback; layout checks require no tile network.
  await page.route("https://*.tile.openstreetmap.org/**", (route) => route.abort());
});

test("all management screens and report tables fit from phone to wide desktop", async ({ page }, testInfo) => {
  await signIn(page, "Nora Albright");
  await page.goto("/reports");
  const reports = await page.locator(".reporting-report-title").evaluateAll((links) => links.map((link) => {
    const href = link.getAttribute("href")!;
    return /published-allocation|unallocated-employees|scheduled-hours|planning-unpublished|approved-leave|coverage-replacement|schedule-lifecycle/.test(href)
      ? `${href}?from=2027-09-01&to=2027-12-31` : href;
  }).filter(Boolean));
  expect(reports.length).toBeGreaterThan(0);
  const issues: string[] = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of [...managementRoutes, ...reports]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.locator("#page-content")).toBeVisible();
      issues.push(...await layoutIssues(page, `${viewport.width}px ${path}`));
      if ([320, 390, 820, 1280].includes(viewport.width) && ["/dashboard", "/accounts", managementRoutes[11]].includes(path)) {
        await page.screenshot({ path: testInfo.outputPath(`${viewport.width}-${path.split("?")[0].slice(1)}.png`), animations: "disabled" });
        if (path === "/accounts") await page.locator(".account-table tbody tr").first().screenshot({ path: testInfo.outputPath(`${viewport.width}-account-card.png`), animations: "disabled" });
      }
    }
  }
  await attachIssues(testInfo, issues);
});

test("create and review dialogs fit phones, tablets, and short landscape screens", async ({ page }, testInfo) => {
  await signIn(page, "Nora Albright");
  const issues: string[] = [];
  for (const viewport of [{ width: 320, height: 640 }, { width: 768, height: 360 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (const path of managementRoutes) {
      await page.goto(path);
      const triggers = page.locator('#page-content button[aria-haspopup="dialog"]:enabled:visible');
      const count = await triggers.count();
      for (let index = 0; index < count; index++) {
        const trigger = triggers.nth(index);
        const label = await trigger.innerText();
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        // Optional and destructive sections must also reflow when the user expands them.
        const disclosures = dialog.locator("details:not([open]) > summary:visible");
        while (await disclosures.count()) await disclosures.first().click();
        issues.push(...await layoutIssues(page, `${viewport.width}×${viewport.height} ${path} ${label}`));
        if (path === "/accounts" && index === 0) await page.screenshot({ path: testInfo.outputPath(`${viewport.width}-${viewport.height}-account-dialog.png`), animations: "disabled" });
        const last = dialog.locator("button:enabled:visible, input:not([type=hidden]):enabled:visible, select:enabled:visible, textarea:enabled:visible").last();
        await last.scrollIntoViewIfNeeded();
        await expect(last).toBeInViewport();
        await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
        await expect(trigger).toBeFocused();
      }
    }
  }
  await attachIssues(testInfo, issues);
});

test("role navigation, RTL, dark theme and enlarged text reflow", async ({ page, context }, testInfo) => {
  const issues: string[] = [];
  for (const persona of ["Ava Mercer", "Cora Bell"]) {
    await context.clearCookies();
    await page.setViewportSize({ width: 320, height: 640 });
    await signIn(page, persona);
    const authorizedRoutes = await page.locator(".sidebar .nav-links a").evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
    for (const route of authorizedRoutes) {
      const path = route === "/schedule" ? `${route}?month=2027-09` : route;
      expect((await page.goto(path))?.status(), `${persona} ${path}`).toBe(200);
      issues.push(...await layoutIssues(page, `${persona} ${path}`));
      for (const trigger of await page.locator('#page-content button[aria-haspopup="dialog"]:enabled:visible').all()) {
        await trigger.click();
        issues.push(...await layoutIssues(page, `${persona} ${path} dialog`));
        await page.keyboard.press("Escape");
      }
    }
    await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "More navigation" })).toBeVisible();
    const moreLinks = await page.getByRole("dialog").getByRole("link").all();
    for (const link of moreLinks) {
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport();
    }
    await page.keyboard.press("Escape");
  }

  await context.clearCookies();
  await context.addCookies([{ name: "scopeis-direction", value: "rtl", domain: "127.0.0.1", path: "/" }]);
  await signIn(page, "Nora Albright");
  for (const width of [320, 820, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/dashboard", "/accounts", "/employees", "/profile", `/schedule?month=2027-10&period=${phase10Ids.discussionPeriod}`, "/reports"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; document.documentElement.style.fontSize = "200%"; });
      issues.push(...await layoutIssues(page, `RTL dark 200% ${width}px ${path}`));
      if (path === "/dashboard") await page.screenshot({ path: testInfo.outputPath(`${width}-rtl-dark-large-text.png`), animations: "disabled" });
    }
  }
  await attachIssues(testInfo, issues);
});

test("sign in, password change and unavailable pages fit every viewport", async ({ page }, testInfo) => {
  const issues: string[] = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    issues.push(...await layoutIssues(page, `${viewport.width}px sign in`));
  }
  await signIn(page, "Nora Albright");
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/account/change-password");
    await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
    issues.push(...await layoutIssues(page, `${viewport.width}px password change`));
    await page.goto("/fictional-unavailable-page");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    issues.push(...await layoutIssues(page, `${viewport.width}px unavailable page`));
  }
  await attachIssues(testInfo, issues);
});

test("More navigation stays usable on tablets and closes with focus restored on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "Nora Albright");
  const trigger = page.getByRole("button", { name: "More", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "More navigation" });
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(dialog).toBeVisible();
  const logout = dialog.getByRole("button", { name: "Log out" });
  await logout.scrollIntoViewIfNeeded();
  await expect(logout).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.sidebar a[aria-current="page"]')).toBeFocused();
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("task dialogs keep fields and actions above a simulated mobile keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "Nora Albright");
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", { configurable: true, value: 360 });
    Object.defineProperty(viewport, "offsetTop", { configurable: true, value: 40 });
    viewport.dispatchEvent(new Event("resize"));
  });
  await expect.poll(async () => dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 40 && rect.bottom <= 400;
  })).toBe(true);
  const submit = dialog.getByRole("button", { name: "Create account", exact: true });
  await submit.scrollIntoViewIfNeeded();
  const rect = await submit.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(400);
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeFocused();
});

test("visual controls keep contrast, focus and native modal behavior in both themes", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page, "Nora Albright");
  for (const theme of ["light", "dark"] as const) {
    await page.setViewportSize({ width: 1280, height: 900 });
    if (theme === "dark") await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator(".top-header")).toHaveCount(1);
    await captureVisual(page, testInfo, `1280-${theme}-dashboard.png`);
    await page.setViewportSize({ width: 390, height: 844 });
    await captureVisual(page, testInfo, `390-${theme}-dashboard.png`);
    await page.getByRole("button", { name: "More", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "More navigation" });
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate((element) => getComputedStyle(element).animationName)).toBe("scopeis-sheet-enter");
    await captureVisual(page, testInfo, `390-${theme}-navigation.png`);
    await sheet.getByRole("button", { name: "Close more navigation" }).click();

    await page.goto("/accounts");
    const trigger = page.getByRole("button", { name: "Create account", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe("scopeis-dialog-enter");
    const field = dialog.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').first();
    await field.focus();
    await expect(field).toBeFocused();
    const appearance = await dialog.evaluate((element) => {
      const field = element.querySelector<HTMLInputElement>('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')!;
      const button = element.querySelector<HTMLButtonElement>(".button.primary")!;
      const fieldStyle = getComputedStyle(field), buttonStyle = getComputedStyle(button);
      const avatarStyle = getComputedStyle(document.querySelector(".persona .avatar")!);
      const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
      const context = canvas.getContext("2d")!;
      function luminance(color: string) {
        context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
        const pixels = context.getImageData(0, 0, 1, 1).data;
        const [r, g, b] = Array.from(pixels).slice(0, 3).map((value) => {
          const channel = value / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        return .2126 * r + .7152 * g + .0722 * b;
      }
      function contrast(first: string, second: string) {
        const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
        return (values[0] + .05) / (values[1] + .05);
      }
      return {
        fieldText: contrast(fieldStyle.color, fieldStyle.backgroundColor),
        fieldFocus: contrast(fieldStyle.outlineColor, fieldStyle.backgroundColor),
        buttonText: contrast(buttonStyle.color, buttonStyle.backgroundColor),
        avatarText: contrast(avatarStyle.color, avatarStyle.backgroundColor),
        outlineStyle: fieldStyle.outlineStyle, outlineWidth: fieldStyle.outlineWidth,
        transitionDuration: fieldStyle.transitionDuration,
      };
    });
    expect(appearance.fieldText).toBeGreaterThanOrEqual(4.5);
    expect(appearance.buttonText).toBeGreaterThanOrEqual(4.5);
    expect(appearance.avatarText).toBeGreaterThanOrEqual(4.5);
    expect(appearance.fieldFocus).toBeGreaterThanOrEqual(3);
    expect(appearance.outlineStyle).toBe("solid");
    expect(parseFloat(appearance.outlineWidth)).toBeGreaterThanOrEqual(3);
    expect(appearance.transitionDuration.split(",").some((duration) => parseFloat(duration) > 0)).toBe(true);
    const contrastPath = testInfo.outputPath(`${theme}-control-contrast.json`);
    await writeFile(contrastPath, JSON.stringify(appearance, null, 2));
    await testInfo.attach(`${theme}-control-contrast`, { path: contrastPath, contentType: "application/json" });
    await captureVisual(page, testInfo, `390-${theme}-focused-dialog.png`);
    await page.locator("#page-content").focus();
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  await page.evaluate(() => localStorage.setItem("scopeis-theme", "light"));
  await page.context().clearCookies();
  await page.goto("/login");
  await captureVisual(page, testInfo, "390-light-login.png");
});

test("reduced motion removes decorative movement and forced colors retain controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "Nora Albright");
  await page.goto("/dashboard");
  expect(await page.locator("#page-content > :first-child").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  expect(await page.locator(".theme-toggle-icon").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.getByRole("button", { name: "More", exact: true }).click();
  expect(await page.getByRole("dialog").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.keyboard.press("Escape");
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await dialog.evaluate((element) => getComputedStyle(element, "::backdrop").animationName)).toBe("none");
  expect(await dialog.locator(".button.primary").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);
  await page.keyboard.press("Escape");
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/dashboard");
  const button = page.getByRole("link", { name: "Open schedule", exact: true }).first();
  expect(await button.evaluate((element) => getComputedStyle(element).borderStyle)).toBe("solid");
  await button.focus();
  await expect(button).toBeFocused();
  expect(await button.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
});

test("desktop hover is tactile and reduced motion removes its movement", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, hasTouch: false, viewport: { width: 1280, height: 900 }, reducedMotion: "no-preference" });
  try {
    const page = await context.newPage();
    await signIn(page, "Nora Albright");
    await page.goto("/dashboard");
    expect(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)).toBe(true);
    const button = page.getByRole("link", { name: "Open schedule", exact: true }).first();
    await button.hover();
    await expect.poll(() => button.evaluate((element) => getComputedStyle(element).translate)).toBe("0px -1px");
    const card = page.locator(".reporting-cards > li").first();
    await card.hover();
    await expect.poll(() => card.evaluate((element) => getComputedStyle(element).translate)).toBe("0px -2px");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => card.evaluate((element) => getComputedStyle(element).translate)).toBe("none");
    await button.hover();
    expect(await button.evaluate((element) => getComputedStyle(element).translate)).toBe("none");
    expect(await button.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  } finally { await context.close(); }
});

test("the planning workspace fits its pins and exposes filters, search and next actions on every screen", async ({ page }, testInfo) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dbe8ed"/></svg>' }));
  await signIn(page, "Nora Albright");
  const issues: string[] = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/map?date=2027-05-12");
    const filters = page.locator(".map-filter-disclosure");
    await expect(filters).not.toHaveAttribute("open");
    const canvas = page.getByRole("region", { name: "Static planning map", exact: true });
    await expect(page.locator(".map-marker.employee")).toHaveCount(2);
    await expect(page.locator(".map-marker.worksite")).toHaveCount(1);
    await page.getByRole("button", { name: "Fit all", exact: true }).click();
    expect(await canvas.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return [...element.querySelectorAll(".map-marker")].every((marker) => {
        const pin = marker.getBoundingClientRect();
        return pin.left >= box.left && pin.right <= box.right && pin.top >= box.top && pin.bottom <= box.bottom;
      });
    })).toBe(true);
    issues.push(...await layoutIssues(page, `${viewport.width}px map workspace`));
    await filters.locator("summary").click();
    issues.push(...await layoutIssues(page, `${viewport.width}px expanded map filters`));
    await filters.locator("summary").click();
    const search = page.getByRole("searchbox", { name: "Search published assignments" });
    await search.fill("Dan");
    await expect(page.locator(".map-assignment-results button")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /Dan Unscoped/ })).toBeVisible();
    await page.locator(".map-assignment-results button").click();
    await expect(page.getByRole("link", { name: "Review coverage", exact: true })).toHaveAttribute("href", /\/coverage\?assignment=/);
    await expect(page.getByRole("link", { name: "Open schedule", exact: true }).last()).toHaveAttribute("href", /\/schedule\?month=2027-05&period=/);
    await search.fill("");
    const employees = page.getByRole("button", { name: "Employees", exact: true });
    await employees.click();
    await expect(employees).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".map-marker.employee")).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Static planned associations" })).toHaveCount(0);
    await employees.click();
    await page.getByRole("button", { name: /Approved unavailable 1/ }).click();
    await expect(page.locator(".map-assignment-results button")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /Cora Bell/ })).toBeVisible();
    await page.getByRole("button", { name: "All assignments 2", exact: true }).click();
    await page.locator(".planning-map-tiles img").first().dispatchEvent("error");
    await expect(canvas.getByRole("alert")).toContainText("Map tiles could not be loaded");
    await expect(page.locator(".map-assignment-results button")).toHaveCount(2);
    await page.getByRole("button", { name: "Retry map", exact: true }).click();
    await expect(canvas.getByRole("alert")).toHaveCount(0);
    await expect(page.locator(".map-marker.employee")).toHaveCount(2);
    await captureVisual(page, testInfo, `${viewport.width}-planning-workspace.png`);
  }
  await attachIssues(testInfo, issues);
});

test("feature discovery stays usable and role-specific on phone, desktop and RTL with larger text", async ({ page }, testInfo) => {
  const issues: string[] = [];
  for (const name of ["Nora Albright", "Ava Mercer", "Cora Bell"]) {
    await signIn(page, name);
    for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.getByRole("button", { name: "Find a feature", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "What would you like to do?" });
      await expect(dialog).toBeVisible();
      const search = dialog.getByRole("searchbox", { name: "Search workspace features" });
      await expect(search).toBeFocused();
      issues.push(...await layoutIssues(page, `${viewport.width}px ${name} feature guide`));
      if (name === "Cora Bell") await expect(dialog.getByRole("link", { name: /Planning map|Account administration|Audit|Reports/ })).toHaveCount(0);
      if (name === "Ava Mercer") await expect(dialog.getByRole("link", { name: /Account administration|Audit/ })).toHaveCount(0);
      await search.fill("CV");
      await expect(dialog.getByRole("link", { name: /My profile/ })).toBeVisible();
      await search.fill("feature-that-does-not-exist");
      await expect(dialog.getByRole("heading", { name: "No matching feature" })).toBeVisible();
      await dialog.getByRole("button", { name: "Show all features" }).click();
      await dialog.getByRole("link", { name: /^My profile/ }).click();
      await expect(page).toHaveURL(/\/profile$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    }
    await page.request.post("/api/auth/logout", { headers: { Origin: new URL(page.url()).origin } });
  }
  await signIn(page, "Ava Mercer");
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(() => { document.documentElement.dir = "rtl"; document.documentElement.style.fontSize = "200%"; });
  await page.getByRole("button", { name: "Find a feature", exact: true }).click();
  issues.push(...await layoutIssues(page, "320px RTL large text feature guide"));
  await captureVisual(page, testInfo, "320-rtl-large-text-feature-guide.png");
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/map?date=2027-05-12");
  await page.evaluate(() => { document.documentElement.dir = "rtl"; document.documentElement.style.fontSize = "200%"; });
  issues.push(...await layoutIssues(page, "320px RTL large text planning workspace"));
  await page.locator(".map-filter-disclosure summary").click();
  issues.push(...await layoutIssues(page, "320px RTL large text planning filters"));
  await captureVisual(page, testInfo, "320-rtl-large-text-planning-filters.png");
  await attachIssues(testInfo, issues);
});
