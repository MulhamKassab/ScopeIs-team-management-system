# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: foundation.spec.ts >> theme preference and RTL shell state persist safely
- Location: test\e2e\foundation.spec.ts:96:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/schedule$/
Received string:  "http://127.0.0.1:51116/dashboard"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    2 × locator resolved to <html lang="en" dir="rtl" data-theme="dark">…</html>
      - unexpected value "http://127.0.0.1:51116/dashboard"

```

```yaml
- link "Skip to content":
  - /url: "#page-content"
- complementary:
  - img "SCOPE Information Systems"
  - text: Team Management
  - button "Collapse navigation" [expanded]
  - navigation "Primary navigation":
    - paragraph: Daily work
    - link "Home":
      - /url: /dashboard
    - link "Tickets":
      - /url: /tickets
    - link "Timetable":
      - /url: /schedule
    - link "Work map":
      - /url: /map
    - link "Leave":
      - /url: /leave
    - paragraph: Cover & requests
    - link "Cover":
      - /url: /coverage
    - link "Conversations":
      - /url: /requests
    - paragraph: People
    - link "People":
      - /url: /employees
    - link "Teams":
      - /url: /teams
    - link "Job titles":
      - /url: /designations
    - link "Assignment labels":
      - /url: /arrangements
    - link "Skills":
      - /url: /skills
    - paragraph: Client work
    - link "Clients":
      - /url: /clients
    - link "Projects":
      - /url: /projects
    - link "Locations":
      - /url: /locations
    - paragraph: Your workspace
    - link "Notifications":
      - /url: /notifications
    - link "Reports":
      - /url: /reports
    - link "My profile":
      - /url: /profile
    - paragraph: Administration
    - link "Accounts":
      - /url: /accounts
    - link "Activity log":
      - /url: /audit
    - link "Settings":
      - /url: /settings
      - text: Settings Coming soon
  - text: Team workspace
- banner:
  - text: Workspace Home
  - button "Find a feature"
  - link "Open notifications":
    - /url: /notifications
  - button "Switch to light mode"
  - group:
    - text: NA
    - strong: Nora Albright
    - text: Super Admin
- main:
  - group: How to use Home +
  - region "Home":
    - paragraph: Team overview
    - heading "Home" [level=1]
    - paragraph: Start with decisions waiting for you, then review the team’s published plan.
    - status: As of 15 Oct 2026, 20:08 (Asia/Dubai)
    - link "Open timetable":
      - /url: /schedule
    - region "Ready for review":
      - heading "Ready for review" [level=2]
      - paragraph: Open a queue to review its requests.
      - list:
        - listitem:
          - text: Pending leave requests
          - strong: "0"
          - 'link "Review leave: Pending leave requests"':
            - /url: /leave
            - text: Review leave
        - listitem:
          - text: Cover requests to review
          - strong: "0"
          - 'link "Review requests: Cover requests to review"':
            - /url: /replacements
            - text: Review requests
        - listitem:
          - text: Documents to review
          - strong: "0"
          - 'link "Review documents: Documents to review"':
            - /url: /reports/evidence-review-queue
            - text: Review documents
    - navigation "Workspace starting points":
      - link "Plan, review, publish Move a monthly plan from Draft to Published.":
        - /url: /schedule
        - strong: Plan, review, publish
        - text: Move a monthly plan from Draft to Published.
      - link "See the day on a map Explore assignments and review coverage.":
        - /url: /map
        - strong: See the day on a map
        - text: Explore assignments and review coverage.
      - link "Know your team Find people, skills and supporting evidence.":
        - /url: /employees
        - strong: Know your team
        - text: Find people, skills and supporting evidence.
    - region "Published plan and team":
      - heading "Published plan and team" [level=2]
      - list:
        - listitem:
          - text: Active people
          - strong: "0"
          - 'link "View people: Active people"':
            - /url: /employees
            - text: View people
        - listitem:
          - text: Published monthly plans
          - strong: "0"
          - 'link "Open timetable: Published monthly plans"':
            - /url: /schedule
            - text: Open timetable
        - listitem:
          - text: Published assignments
          - strong: "0"
          - 'link "View assignments: Published assignments"':
            - /url: /reports/published-allocation
            - text: View assignments
    - group: More team insights +
    - group: About these figures
- alert
```

# Test source

```ts
  8   | async function expectAuthorizedLink(page: import("@playwright/test").Page, label: string) {
  9   |   if (test.info().project.name === "mobile") {
  10  |     const primary = page.getByRole("navigation", { name: "Mobile primary navigation", exact: true }).getByRole("link", { name: label, exact: true });
  11  |     if (await primary.count()) { await expect(primary).toBeVisible(); return; }
  12  |     const more = page.getByRole("button", { name: "More", exact: true });
  13  |     await more.click();
  14  |     await expect(more).toHaveAttribute("aria-expanded", "true");
  15  |   }
  16  |   const navigation = test.info().project.name === "mobile"
  17  |     ? page.getByRole("dialog", { name: "More navigation" }).getByRole("navigation", { name: "Primary navigation", exact: true })
  18  |     : page.getByRole("navigation", { name: "Primary navigation", exact: true });
  19  |   await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
  20  | }
  21  | 
  22  | test("unauthenticated users do not receive protected shell navigation", async ({ page }) => {
  23  |   await page.goto("/map");
  24  |   await expect(page).toHaveURL(/\/login$/);
  25  |   await expect(page.getByText("Work map")).not.toBeVisible();
  26  | });
  27  | 
  28  | test("Super Admin receives global shell navigation", async ({ page }) => {
  29  |   await signIn(page, "Nora Albright");
  30  |   await expectAuthorizedLink(page, "Work map");
  31  |   if (test.info().project.name === "mobile") {
  32  |     if (!(await page.getByRole("dialog", { name: "More navigation" }).isVisible())) await page.getByRole("button", { name: "More", exact: true }).click();
  33  |     await expect(page.getByRole("dialog", { name: "More navigation" })).toBeVisible();
  34  |     await page.getByRole("button", { name: "Close more navigation" }).click();
  35  |     await expect(page.getByRole("dialog", { name: "More navigation" })).toBeHidden();
  36  |   }
  37  |   await expectAuthorizedLink(page, "Activity log");
  38  |   await expectNoHorizontalOverflow(page);
  39  |   await signOut(page);
  40  | });
  41  | 
  42  | test("Admin scope is enforced by the direct server seam", async ({ page }) => {
  43  |   await signIn(page, "Ava Mercer");
  44  |   const permitted = await page.request.get("/api/foundation/scope/team:alpha");
  45  |   const forbidden = await page.request.get("/api/foundation/scope/team:bravo");
  46  |   expect(permitted.status()).toBe(200);
  47  |   expect(forbidden.status()).toBe(403);
  48  |   await expect(page.getByRole("link", { name: "Activity log" })).toHaveCount(0);
  49  |   await expectAuthorizedLink(page, "Work map");
  50  |   expect((await page.request.get("/audit")).status()).toBe(404);
  51  |   await page.goto("/audit");
  52  |   await expect(page.getByRole("main")).toHaveCount(1);
  53  |   await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  54  |   await expect(page.getByRole("link", { name: "Return to a safe page" })).toHaveAttribute("href", "/");
  55  |   await expectNoHorizontalOverflow(page);
  56  |   await signOut(page);
  57  | });
  58  | 
  59  | test("Admin Bravo receives only Bravo scope", async ({ page }) => {
  60  |   await signIn(page, "Ben Iqbal");
  61  |   expect((await page.request.get("/api/foundation/scope/team:bravo")).status()).toBe(200);
  62  |   expect((await page.request.get("/api/foundation/scope/team:alpha")).status()).toBe(403);
  63  |   expect((await page.request.get("/audit")).status()).toBe(404);
  64  |   await expectAuthorizedLink(page, "Work map");
  65  |   await expectNoHorizontalOverflow(page);
  66  |   await signOut(page);
  67  | });
  68  | 
  69  | test("Employee navigation excludes management-only modules", async ({ page }) => {
  70  |   await signIn(page, "Cora Bell");
  71  |   await expect(page.getByRole("link", { name: "Work map" })).toHaveCount(0);
  72  |   await expect(page.getByRole("link", { name: "Activity log" })).toHaveCount(0);
  73  |   const direct = await page.request.get("/api/foundation/scope/team:alpha");
  74  |   expect(direct.status()).toBe(403);
  75  |   expect((await page.request.get("/map")).status()).toBe(404);
  76  |   await page.goto("/accounts");
  77  |   await expect(page.getByRole("main")).toHaveCount(1);
  78  |   await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  79  |   await expect(page.getByRole("link", { name: "Return to a safe page" })).toHaveAttribute("href", "/");
  80  |   await expect(page.getByRole("link", { name: "Accounts", exact: true })).toHaveCount(0);
  81  |   await expectNoHorizontalOverflow(page);
  82  |   await signOut(page);
  83  | });
  84  | 
  85  | test("Employee Bravo remains outside management pages and scopes", async ({ page }) => {
  86  |   await signIn(page, "Dan Rowan");
  87  |   await expect(page.getByRole("link", { name: "Work map" })).toHaveCount(0);
  88  |   await expect(page.getByRole("link", { name: "Activity log" })).toHaveCount(0);
  89  |   expect((await page.request.get("/api/foundation/scope/team:alpha")).status()).toBe(403);
  90  |   expect((await page.request.get("/api/foundation/scope/team:bravo")).status()).toBe(403);
  91  |   expect((await page.request.get("/map")).status()).toBe(404);
  92  |   await expectNoHorizontalOverflow(page);
  93  |   await signOut(page);
  94  | });
  95  | 
  96  | test("theme preference and RTL shell state persist safely", async ({ page, context }) => {
  97  |   await context.addCookies([{ name: "scopeis-direction", value: "rtl", domain: "127.0.0.1", path: "/" }]);
  98  |   await signIn(page, "Nora Albright");
  99  |   await page.getByRole("button", { name: /Switch to dark mode/ }).click();
  100 |   await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  101 |   await page.reload();
  102 |   await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  103 |   await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  104 |   const navigation = page.getByRole("navigation", { name: test.info().project.name === "mobile" ? "Mobile primary navigation" : "Primary navigation", exact: true });
  105 |   const scheduleLink = navigation.getByRole("link", { name: "Timetable", exact: true });
  106 |   await expect(scheduleLink).toBeVisible();
  107 |   await scheduleLink.click();
> 108 |   await expect(page).toHaveURL(/\/schedule$/);
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  109 |   await expectNoHorizontalOverflow(page);
  110 |   if (test.info().project.name === "mobile") {
  111 |     const more = page.getByRole("button", { name: "More", exact: true });
  112 |     await more.click();
  113 |     await expect(page.getByRole("dialog", { name: "More navigation" })).toBeVisible();
  114 |     await page.getByRole("button", { name: "Close more navigation" }).click();
  115 |     await expect(page.getByRole("dialog", { name: "More navigation" })).toHaveCount(0);
  116 |   }
  117 |   await signOut(page);
  118 | });
  119 | 
```