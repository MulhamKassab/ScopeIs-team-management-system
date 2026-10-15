# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive.spec.ts >> clear user journeys keep every authorized tab understandable and make the main tasks work on phone and desktop
- Location: test\e2e\responsive.spec.ts:664:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByRole('dialog').getByRole('form', { name: 'Record employee skill' }).locator('input[name="employeeUserId"]')
Expected: "mock-employee-cora"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" getByRole('dialog').getByRole('form', { name: 'Record employee skill' }).locator('input[name="employeeUserId"]') with timeout 5000ms
  - waiting for getByRole('dialog').getByRole('form', { name: 'Record employee skill' }).locator('input[name="employeeUserId"]')

```

```yaml
- link "Skip to content":
  - /url: "#page-content"
- banner:
  - text: Skills
  - button "Find a feature"
  - link "Open notifications":
    - /url: /notifications
    - text: 1 unread notifications
  - button "Switch to dark mode"
  - group: NA
- main:
  - group: How to use Skills +
  - paragraph: People
  - heading "Team skills" [level=2]
  - paragraph: Choose a person to review or record their skills. Use Manage skill list to create reusable skills.
  - heading "Whose skills do you want to review?" [level=3]
  - text: Person
  - combobox "Person":
    - option "Choose a person"
    - option "Ava Mercer"
    - option "Bea Bravo"
    - option "Ben Iqbal"
    - option "Cora Bell · CapabilityCoordinationCapabilityCoordinationCapabilityCoordination" [selected]
    - option "Dan Unscoped"
    - option "Eli Alpha"
    - option "Lina Location"
    - option "Nora Albright"
    - option "Ola Unscoped"
    - option "Otto Unscoped"
  - button "View skills"
  - heading "Cora Bell · CapabilityCoordinationCapabilityCoordinationCapabilityCoordination’s recorded skills" [level=3]
  - paragraph: 0 skills recorded. Certifications and supporting documents are in their profile.
  - button "Record a skill for Cora Bell · CapabilityCoordinationCapabilityCoordinationCapabilityCoordination": Record skill
  - paragraph: No active skills recorded. Record a new skill or restore one from the archive.
  - group: Manage skill list 1 skills +
- navigation "Mobile primary navigation":
  - link "Home":
    - /url: /dashboard
  - link "People":
    - /url: /employees
  - link "Timetable":
    - /url: /schedule
  - link "Leave":
    - /url: /leave
  - button "More"
- alert
```

# Test source

```ts
  617 |       if(document.documentElement.scrollWidth <= innerWidth + 1) return [];
  618 |       return [...document.querySelectorAll("main *")].filter(element=>{const r=element.getBoundingClientRect();return r.width>innerWidth && getComputedStyle(element).position!=="absolute";}).slice(0,12).map(element=>({tag:element.tagName,className:element.className,width:element.getBoundingClientRect().width,display:getComputedStyle(element).display}));
  619 |     })).toEqual([]);
  620 |     await calendar.getByRole("button", { name: "Agenda", exact: true }).click();
  621 |     await expect(calendar.locator(".timetable-agenda").getByText(/^Cora Bell/)).toBeVisible();
  622 |     await page.goto("/coverage?month=2027-09");
  623 |     await expect(page.getByRole("heading", { name: "Choose work to review" })).toBeVisible();
  624 |     await page.getByRole("link", { name: /^Check cover for Cora Bell/ }).click();
  625 |     await expect(page.getByRole("heading", { name: "What needs attention?" })).toBeVisible();
  626 |     for (const route of ["/teams", "/designations", "/replacements"]) {
  627 |       await page.goto(route);
  628 |       await expect(page.locator("main h2").first()).toBeVisible();
  629 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  630 |       await expect(page.locator("main")).not.toContainText(/Phase \d/);
  631 |     }
  632 |   }
  633 |   await page.goto("/teams");
  634 |   await page.getByRole("button", { name: "New team", exact: true }).click();
  635 |   await page.getByLabel("Team name").fill("Responsive delivery");
  636 |   await page.getByRole("button", { name: "Create team", exact: true }).click();
  637 |   await expect(page.getByRole("dialog").getByRole("status")).toContainText("Saved");
  638 |   await page.getByRole("button", { name: "Close", exact: true }).click();
  639 |   await page.getByRole("button", { name: "Add member to Responsive delivery", exact: true }).click();
  640 |   await page.getByRole("dialog").getByLabel("Person").selectOption("mock-employee-cora");
  641 |   await page.getByRole("button", { name: "Save membership", exact: true }).click();
  642 |   await expect(page.getByRole("dialog").getByRole("status")).toContainText("Membership saved");
  643 |   await page.getByRole("button", { name: "Close", exact: true }).click();
  644 |   await page.goto("/employees/mock-employee-cora");
  645 |   await page.getByRole("button", { name: "Team and job title", exact: true }).click();
  646 |   await expect(page.getByRole("dialog").getByRole("combobox", { name: "Team", exact: true })).toHaveValue(await page.getByRole("dialog").getByRole("option", { name: "Responsive delivery", exact: true }).getAttribute("value"));
  647 |   await page.getByRole("button", { name: "Close", exact: true }).click();
  648 |   await page.goto("/teams");
  649 |   await page.getByRole("button", { name: /^Remove Cora Bell .* from Responsive delivery$/ }).click();
  650 |   await page.getByRole("button", { name: "Remove membership", exact: true }).click();
  651 |   await expect(page.getByRole("status")).toContainText("Membership removed");
  652 |   await expect(page.getByRole("dialog")).not.toBeVisible();
  653 |   await page.setViewportSize({ width: 390, height: 844 });
  654 |   await page.context().addCookies([{ name: "scopeis-direction", value: "rtl", url: new URL(page.url()).origin }]);
  655 |   await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  656 |   await page.goto("/schedule?month=2027-09");
  657 |   await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  658 |   await page.getByRole("button", { name: "Switch to dark mode" }).click();
  659 |   await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  660 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  661 |   await page.screenshot({ path: testInfo.outputPath("timetable-mobile-rtl.png"), fullPage: true });
  662 | });
  663 | 
  664 | test("clear user journeys keep every authorized tab understandable and make the main tasks work on phone and desktop", async ({ page, context }, testInfo) => {
  665 |   test.setTimeout(240_000);
  666 |   await page.emulateMedia({ reducedMotion: "reduce" });
  667 |   const issues: string[] = [];
  668 |   for (const persona of ["Nora Albright", "Ava Mercer", "Cora Bell"]) {
  669 |     await context.clearCookies();
  670 |     await page.setViewportSize({ width: 390, height: 844 });
  671 |     await signIn(page, persona);
  672 |     const routes = await page.locator(".sidebar .nav-links a").evaluateAll((links) => links.map((link) => ({ href: link.getAttribute("href")!, label: link.textContent!.replace(/Coming soon$/, "").trim() })));
  673 |     for (const route of routes) {
  674 |       expect((await page.goto(route.href))?.status(), `${persona} ${route.label}`).toBe(200);
  675 |       const guide = page.locator(".page-journey-help");
  676 |       await expect(guide).not.toHaveAttribute("open");
  677 |       await expect(guide.locator("summary")).toHaveText(`How to use ${route.label}`);
  678 |       await guide.locator("summary").focus();
  679 |       await page.keyboard.press("Enter");
  680 |       await expect(guide).toHaveAttribute("open");
  681 |       expect(await guide.locator("ol li").count()).toBeGreaterThanOrEqual(2);
  682 |       const related = await guide.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  683 |       expect(related.every((href) => routes.some((item) => item.href === href))).toBe(true);
  684 |       if (persona === "Cora Bell") await expect(guide).not.toContainText("Plan work");
  685 |       issues.push(...await layoutIssues(page, `${persona} expanded ${route.label} guide`));
  686 |     }
  687 |   }
  688 |   await context.clearCookies();
  689 |   await signIn(page, "Nora Albright");
  690 |   for (const width of [320, 390, 1280]) {
  691 |     await page.setViewportSize({ width, height: 900 });
  692 |     await page.goto("/dashboard");
  693 |     const insights = page.locator(".journey-disclosure").filter({ hasText: "More team insights" });
  694 |     await expect(insights).not.toHaveAttribute("open");
  695 |     await insights.locator("summary").click();
  696 |     issues.push(...await layoutIssues(page, `${width}px expanded home insights`));
  697 |     await insights.locator("summary").click();
  698 |     await captureVisual(page, testInfo, `${width}-clear-home.png`);
  699 | 
  700 |     await page.goto("/coverage?month=2027-09");
  701 |     await page.getByRole("combobox", { name: "Person", exact: true }).selectOption("mock-employee-cora");
  702 |     await expect(page.getByRole("link", { name: /^Check cover for Cora Bell/ })).toBeVisible();
  703 |     await page.getByLabel("Search work").fill("no-such-worksite");
  704 |     await expect(page.getByRole("heading", { name: "No work matches your search" })).toBeVisible();
  705 |     await page.getByRole("button", { name: "Clear search" }).click();
  706 |     await page.getByLabel("Search work").fill("Cora");
  707 |     issues.push(...await layoutIssues(page, `${width}px cover search`));
  708 |     await captureVisual(page, testInfo, `${width}-clear-coverage.png`);
  709 | 
  710 |     await page.goto("/skills");
  711 |     await expect(page.getByRole("combobox", { name: "Person", exact: true })).toHaveCount(1);
  712 |     await page.getByRole("combobox", { name: "Person", exact: true }).selectOption("mock-employee-cora");
  713 |     await page.getByRole("button", { name: "View skills", exact: true }).click();
  714 |     await expect(page.getByRole("heading", { name: /^Cora Bell.*’s recorded skills$/ })).toBeVisible();
  715 |     await page.getByRole("button", { name: /^Record a skill for Cora Bell/ }).click();
  716 |     const record = page.getByRole("dialog").getByRole("form", { name: "Record employee skill" });
> 717 |     await expect(record.locator('input[name="employeeUserId"]')).toHaveValue("mock-employee-cora");
      |                                                                  ^ Error: expect(locator).toHaveValue(expected) failed
  718 |     await expect(record.getByRole("combobox")).toHaveCount(1);
  719 |     issues.push(...await layoutIssues(page, `${width}px selected-person skill dialog`));
  720 |     await page.keyboard.press("Escape");
  721 |     await captureVisual(page, testInfo, `${width}-clear-skills.png`);
  722 | 
  723 |     await page.goto("/reports");
  724 |     await page.getByLabel("Find a report").fill("hours");
  725 |     await expect(page.locator(".reporting-report-title")).toHaveCount(1);
  726 |     await expect(page.locator(".reporting-report-title")).toHaveAttribute("href", "/reports/scheduled-hours");
  727 |     issues.push(...await layoutIssues(page, `${width}px report search`));
  728 |   }
  729 |   await context.addCookies([{ name: "scopeis-direction", value: "rtl", url: new URL(page.url()).origin }]);
  730 |   await page.setViewportSize({ width: 320, height: 900 });
  731 |   await page.goto("/reports");
  732 |   await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; document.documentElement.style.fontSize = "200%"; });
  733 |   await page.locator(".page-journey-help > summary").click();
  734 |   issues.push(...await layoutIssues(page, "320px expanded guide with RTL, dark theme and 200% text"));
  735 |   await captureVisual(page, testInfo, "320-clear-rtl-guide.png");
  736 |   await attachIssues(testInfo, issues);
  737 | });
  738 | 
  739 | test("populated tickets, destination filters and work dialogs fit every responsive viewport", async ({ page }, testInfo) => {
  740 |   await signIn(page, "Nora Albright");
  741 |   const issues: string[] = [];
  742 |   for (const viewport of viewports) {
  743 |     await page.setViewportSize(viewport);
  744 |     await page.goto("/tickets");
  745 |     await expect(page.getByRole("heading", { name: /^All accessible tickets/ })).toBeVisible();
  746 |     await expect(page.locator(".ticket-list > li")).toHaveCount(5);
  747 |     issues.push(...await layoutIssues(page, `${viewport.width}px populated ticket list`));
  748 |     await page.getByRole("combobox", { name: "Workspace", exact: true }).selectOption(responsiveIds.ticketWorkspace);
  749 |     await page.getByRole("combobox", { name: "Dashboard", exact: true }).selectOption(responsiveIds.ticketBoard);
  750 |     await expect(page.locator(".ticket-list > li")).toHaveCount(2);
  751 |     await page.locator(".ticket-filter-options > summary").click();
  752 |     issues.push(...await layoutIssues(page, `${viewport.width}px expanded destination and status filters`));
  753 |     await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  754 |     await page.getByRole("button", { name: "Kanban", exact: true }).click();
  755 |     const kanban = page.getByRole("region", { name: "Ticket Kanban", exact: true });
  756 |     await expect(kanban.locator(".ticket-column")).toHaveCount(5);
  757 |     await expect(kanban.locator(".ticket-card")).toHaveCount(5);
  758 |     await kanban.focus();
  759 |     await expect(kanban).toBeFocused();
  760 |     issues.push(...await layoutIssues(page, `${viewport.width}px populated Kanban`));
  761 |     await page.getByRole("button", { name: "New ticket", exact: true }).click();
  762 |     let dialog = page.getByRole("dialog");
  763 |     await expect(dialog).toBeVisible();
  764 |     const disclosures = dialog.locator("details:not([open]) > summary:visible");
  765 |     while (await disclosures.count()) await disclosures.first().click();
  766 |     issues.push(...await layoutIssues(page, `${viewport.width}px expanded ticket creation`));
  767 |     await page.keyboard.press("Escape");
  768 |     await expect(dialog).not.toBeVisible();
  769 | 
  770 |     await page.goto(`/tickets/${responsiveIds.ticket}`);
  771 |     await expect(page.getByRole("heading", { name: "Description", exact: true })).toBeVisible();
  772 |     await page.locator(".ticket-detail-facts > summary").click();
  773 |     issues.push(...await layoutIssues(page, `${viewport.width}px populated ticket detail and metadata`));
  774 |     await page.getByRole("button", { name: "Change status", exact: true }).click();
  775 |     dialog = page.getByRole("dialog");
  776 |     await dialog.getByRole("combobox", { name: "Status", exact: true }).selectOption("ON_HOLD");
  777 |     await expect(dialog.getByLabel("On-hold reason", { exact: true })).toBeVisible();
  778 |     issues.push(...await layoutIssues(page, `${viewport.width}px ticket On hold dialog`));
  779 |     await page.keyboard.press("Escape");
  780 |     await expect(dialog).not.toBeVisible();
  781 |     await captureVisual(page, testInfo, `${viewport.width}-populated-ticket-detail.png`);
  782 |   }
  783 |   await attachIssues(testInfo, issues);
  784 | });
  785 | 
```