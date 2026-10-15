# Presentation, practical map and vacation-review context

Status: **LOCAL_VERIFIED_SOURCE_DELIVERY_PENDING**. Implementation, source review and the final fresh-build browser verification are complete. The owner-authorized push and deployment check are next.

The owner requested readable button/text colours throughout the website, a more practical map with real dragging and wheel zoom, removal of the quoted map disclosure and all authored em dashes, and related employee activity during Super Admin vacation review. [The confirmed amendment](../project-memory/PRESENTATION_MAP_LEAVE_REVIEW_AMENDMENT_2026_10_16.md) records the scope and preserved boundaries.

## Result

- Semantic primary actions keep their contrasting foreground despite contextual record/link rules. Disabled controls use readable theme tokens. Existing deliberate inverse dashboard actions and forced colours remain.
- Work map leads with a searchable people/worksite list. Shared markers expose named choices rather than cycling silently. Selection, details and map focus stay synchronized. Real pointer dragging accumulates movement correctly; wheel/double-click zoom keeps the point beneath the cursor fixed. Ctrl-wheel stays browser zoom; keyboard, touch lock/pinch, layers, attribution and fallback remain. Narrow controls wrap complete buttons and labels remain inside the fitted canvas.
- The requested controls/privacy disclosure is removed. Static Published status and exact/coarse facts remain. No live tracking, provider change or broader map projection is added.
- Authored em dashes are removed from application copy, report values and the existing public preview. Missing values use meaningful text; empty timetable cells retain their accessible No assignment name. Stored user content and historical documentation are unchanged.
- Super Admin vacation review shows date-bounded cover requests for the employee and their nominations/selections to cover, Draft/Proposed assignments, other leave and permission-filtered active assigned tickets. Closed cover history is separate. Status, publication state, relationship and direct links are visible. Cover history links open the appropriate retained history. Ticket dates are informational, not booked work. Existing Published-conflict approval blocking, balances, locks, versions and separate publication remain.

## Verification

[Evidence](evidence/presentation-map-leave-2026-10-16/verification.json) records commands, frozen inputs and screenshots. Whole unit/component verification passes 425/425. Affected PostgreSQL integration passes 74/74: leave 7, tickets 25/private files 7 and reporting 35. Types, whole ESLint and registration pass (86 scenarios, 95 registered/covered test files, 40 protected routes).

The first browser diagnostic passed 13/14; its contrast checker incorrectly counted a phone calendar's font-size-zero indicator as visible text. The corrected complete run passed 14/14 with a fresh guarded typecheck/build. Screenshot review then identified clipped narrow map labels and a word-split control. The final small presentation refinement passes a fresh guarded typecheck/build and complete affected browser run **14/14**, now checking colours across all 21 main workspaces and four representative detail pages in both themes on phone/desktop, real pan/wheel, shared choices, 320px RTL label/control bounds, vacation context, actual leave decisions and lower-role refusals. Final types, whole lint and affected geometry/components 17/17 pass. The earlier 425-case whole unit/component run is bound to the explicit prior snapshot; it is not falsely attributed to the final three-file map/test refinement. No production business data is used in these maintained mutation journeys.

Ten final screenshots are byte-preserved; selected final screenshots are visually inspected, including [Create project in light mode](evidence/presentation-map-leave-2026-10-16/desktop-light-project-colours.png), [phone dark controls](evidence/presentation-map-leave-2026-10-16/mobile-dark-project-colours.png), [practical map](evidence/presentation-map-leave-2026-10-16/desktop-practical-map.png), [320px RTL map](evidence/presentation-map-leave-2026-10-16/mobile-map-320-rtl-dark.png) and [vacation context](evidence/presentation-map-leave-2026-10-16/desktop-vacation-review-context.png). Data and raster responses are fictional/controlled. All three owned browser build checkouts and disposable databases are cleaned; the existing local PostgreSQL runtime remains untouched.

The initial broad unit/component diagnostic had one five-second cold-import timeout in an existing collaboration-boundary test; the unchanged focused suite passed 9/9 and the later whole run passed 425/425. Diagnostics are preserved separately. Focused repeats are not added to unique totals.

## Limits and delivery

The full historical 14-step system lock is not rerun for this bounded amendment. Browser contrast checks cover visible authored controls/text in the exercised states; zero-size indicator glyphs are excluded, and physical devices/exhaustive accessibility certification are not claimed. Map browser tests use controlled raster responses so geometry/fallback checks do not depend on a provider outage. Settings, deferred policies, automatic scheduling and broader Phase 12/13 remain outside this delivery.

No migration, seed/reset, credential, role/grant, provider/environment or production business-data change is introduced. The pre-existing unrelated `test.py` is preserved and excluded. Source push/deployment evidence will be recorded after final checks.
