# ScopeIs task discovery and planning-map experience — 2026-10-05

The user requested a simple, powerful, sophisticated application, useful presentation of every feature, an excellent planning map, and a push to `main` after refinement. This pass connects the existing authorized workflows rather than introducing new product policy. The accumulated September audit, workflow-clarity, responsive and visual work is preserved in this delivery.

**Status:** `COMPLETED` for the authorized UI work. The final system lock passed 14/14 gates with zero interruptions, including all 11 responsive checks. Git delivery is pending the user-authorized push. Production deployment is not part of this verification.

## What improved

The dashboard now offers three clear starting points for each role. Managers can plan, open the day's map and understand their team; Employees can view their Published workday, manage leave and maintain their professional profile. The header's **Find a feature** dialog searches actual authorized tools by name or task, including CVs, certifications, notes, staffing and CSV exports. It focuses the search field, explains each result, handles no matches and closes on navigation. Mobile More navigation still exposes all authorized destinations.

The selected-day map becomes a working planning surface. It fits the authorized geography, groups coincident pins with a count, cycles the corresponding assignments and offers All, Gaps and Unavailable views. The search/list, layer toggles and selected-assignment panel make each Published assignment reachable. Times, worksite, coverage facts and coordinate precision lead to actual schedule-period and coverage actions. Secondary filters stay collapsed until needed, leaving more space for the map on phones.

Touch normally scrolls the page over the map. **Interact with map** enables pan and pinch; locking restores page scrolling. Mouse and keyboard controls, Fit all and Focus selected remain available. If tiles fail, users retain the searchable list and detail actions, see a clear notice and can retry. Geographic association lines remain aligned during fit, zoom, pan and resize.

The finish extends the existing ScopeIs palette with tactile controls, layered surfaces, restrained texture, clear focus, short motion and consistent library icons. Phone layouts, longer text, native date/search controls, both themes, reduced motion and forced-color boundaries remain supported.

## Fresh audited journey

The Product Design audit workflow was applied to the working local application. Screenshots were captured during this run with fictional users and owned disposable databases. These are evidence of the bounded flows below, not a full accessibility or physical-device certification.

| Audited step | Health after repair | Evidence and conclusion |
| --- | --- | --- |
| 1. Dashboard → daily task | Improved and verified | [Before](evidence/ui-experience-2026-10-05/before-dashboard.png), [after desktop](evidence/ui-experience-2026-10-05/after-dashboard-desktop.png), [after Employee phone](evidence/ui-experience-2026-10-05/after-employee-dashboard-mobile.png). Role-specific starting points precede secondary metrics. |
| 2. Header → feature discovery | Improved and verified | [Management search](evidence/ui-experience-2026-10-05/after-feature-guide-mobile.png), [Employee CV search](evidence/ui-experience-2026-10-05/after-employee-feature-guide-mobile.png). Results expose actual permitted destinations and navigation restores scrolling. |
| 3. Date → usable planning map | Improved and verified | [Before desktop](evidence/ui-experience-2026-10-05/before-map-desktop.png), [before phone](evidence/ui-experience-2026-10-05/before-map-mobile.png), [after desktop](evidence/ui-experience-2026-10-05/after-map-desktop.png), [after phone](evidence/ui-experience-2026-10-05/after-map-mobile.png), [dark map](evidence/ui-experience-2026-10-05/after-map-desktop-dark.png). The initial view fits the plan, coincident worksites are grouped and secondary filters no longer dominate the phone entry. |
| 4. Selected assignment → coverage/schedule | Verified | [Actual coverage handoff](evidence/ui-experience-2026-10-05/after-map-to-coverage.png). Selected Cora's 09:00–11:00 Published assignment opens its real coverage review; browser checks also verify the schedule-period link. |
| 5. Scoped Admin → planning details | Verified within scope | [Scoped Admin map](evidence/ui-experience-2026-10-05/after-map-admin.png). Only the authorized employee appears, with coarse planning precision and its privacy explanation. |
| 6. Employee → own tools | Verified within role | [Employee dashboard](evidence/ui-experience-2026-10-05/after-employee-dashboard-mobile.png), [own-profile discovery](evidence/ui-experience-2026-10-05/after-employee-feature-guide-mobile.png). CV search leads to the Employee's own profile; management map and administration are absent and remain denied by the server. |

Before this pass, the map centred an individual point, coincident pins concealed records, filters occupied most of the phone entry, and detail panels had no direct next action. Nested profile and evidence features also required knowledge of the navigation structure. The reviewed changes address those concrete entry and handoff problems.

## Authority and implementation boundaries

The server still applies strict TEAM × operational scope before emitting map rows, filter options, counts, coordinates and publication facts. Super Admin sees stored exact planning markers; scoped Admin sees deterministic coarse markers. Employees receive no map projection. The only added map output fields are the schedule period and time range from the same already-authorized Published row. Links re-authorize on the destination.

No schema, authentication provider, scheduling policy, leave decision rule, evidence-eligibility rule or map provider was added. This remains static Published planning, with no GPS, live tracking, routing or automated staffing decision. OSM attribution and the browser tile-request privacy explanation remain visible. The feature guide consumes the already server-filtered navigation and does not advertise unfinished settings or Ticket integration as delivered tools.

Key implementation: `experience.css`, shared navigation/task-guide presentation, native `TaskDialog`, role-specific dashboard shortcuts, geographic fit helpers, grouped-marker/search presentation, the planning-map client and page, and the narrowly extended authorized map projection.

## Verification and evidence

Final results are recorded in [verification.json](evidence/ui-experience-2026-10-05/verification.json). The clean `npm run test:system-lock` passed **14/14 gates**, with **131 unit, 97 component, 169 integration, 8 migration, 18 route-certification and 93 browser cases: 516 unique automated cases**. Integration covers 14 files in 13 isolated suites; browser verification covers 14 suites, including all **11 responsive checks**. The strict manifest covers 70 scenarios and all 72 registered test files. Isolation passed 9/9; seed/fresh-system smoke, TypeScript, ESLint, isolated safe build and whitespace checks passed. All 363 frozen source/test/configuration hashes match.

The first full lock passed 13/14 gates but refused the unregistered responsive spec. The runner and manifest were updated to include it; the final full run above is a clean pass. A prior responsive attempt passed ten checks and failed one broad alert selector that also matched Next's route announcer. The locator was narrowed to the map canvas, the focused eight-viewport map check passed, and the complete eleven-check suite subsequently passed inside the final lock. Failed/interrupted attempts remain distinguished in the receipt.

The dedicated suite covers 320, 390, 600, 768, 820, 1024, 1280 and 1920px; 288 main/report page-and-viewport combinations; all three roles; compact landscape; RTL with doubled text; both themes; native modal focus and background inertness; simulated mobile keyboard sizing; contrast/focus; reduced motion; desktop hover; and forced colors. New checks exercise fitted/grouped pins, filters, list search, selection, time/context links, layers, attention states and tile failure/retry at each viewport. Component tests also exercise unlocked touch pan and two-pointer pinch; this is emulated input, not a physical-device claim.

The clean run also preserves [320px RTL feature discovery with doubled text](evidence/ui-experience-2026-10-05/verified-320-rtl-large-text-feature-guide.png) and [expanded planning filters](evidence/ui-experience-2026-10-05/verified-320-rtl-large-text-planning-filters.png).

Native map screenshots above use actual OSM tiles. `verified-*-planning-workspace.png` files use an explicitly blank, deterministic test-only tile response to verify geometry and interactions without external network variability. Those fixtures are not part of the application or presented as a real basemap.

All verification runtimes use fictional credentials and owned disposable loopback databases. Playwright web servers now shut down gracefully on POSIX so safe-build copies and database cleanup can finish; the previous forced kill accumulated temporary build copies. An interrupted earlier responsive attempt encountered local PostgreSQL recovery, and another attempt exhausted temporary disk space. Only the exactly owned test database and verified inactive test build copies were cleaned up. These attempts are not counted as passing runs.

The known retained-history assignment omission/removal path remains `PARTIAL` under Phase 4; the UI pass does not decide or implement its missing retention semantics. Phase 9.9 remains deferred, Ticket integration is not delivered in this checkout, and production rollout is not certified. Earlier reports and receipts remain historical evidence.
