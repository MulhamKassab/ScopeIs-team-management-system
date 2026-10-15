# Consolidated Cover, timetable and map implementation — 2026-10-15

Status: **LOCAL_VERIFIED_PRODUCTION_PENDING**. The owner authorized a single reviewed release. [Combined verification](SCOPEIS_BROWSER_VERIFICATION_2026_10_15.md) passes full14/14,813 cases,all15 browser suites/responsive24/24 on its frozen source. A separately frozen mobile-label CSS-only follow-up passes4/4 affected browser journeys and a guarded typecheck/build. Source push/deployment and final production checks remain pending.

## Delivered behaviour

- **Cover** combines the authorized monthly timetable, cell details with Request cover, visible Create request buttons, Current requests, direct Super Admin decisions and retained history. Pending work is amber and labelled; approved unpublished work is green and labelled Draft prepared. Month, People and Agenda retain their filters and accessibility.
- Managers can request a replacement without a recorded gap. Extra support still needs an actual staffing gap. Pending requests support nominee editing and cancellation by their requester or Super Admin, with row locks, expected versions, eligibility checks and atomic audit. Changing the target/type uses cancellation plus a new request. No request or discussion history is deleted.
- `/replacements` redirects to Cover's current queue. Admin retains participant conversations at `/requests`, labelled Conversations; legacy links remain functional. Cancellation displays consistently in Cover, conversations and reports. The confirmed database-compatible withdrawal representation is documented in [the amendment](../project-memory/COVER_WORKSPACE_AND_ACCESS_AMENDMENT_2026_10_15.md).
- Super Admin alone sees unpublished schedules, team leave and report pages/exports, creates clients/projects and writes assignments. Admin reads only authorized current Published work; direct unpublished identifiers are refused. Admin dashboard/map omit leave data. Employee own published work and vacation self-service remain.
- Main Timetable provides Create assignment, a monthly-Draft picker and the selected date. Existing proposal, revision and publication remain explicit.
- Work map has place labels, a selected-assignment card below the canvas, Previous/Next focus, double-click zoom and readable RTL time ranges. Placing the card below preserves all marker hit areas. Coverage flags now use the displayed Published assignments, so an approved unpublished cover revision cannot break the map or reveal its changes. Exact/coarse privacy, scope intersection, touch/keyboard interaction and provider fallback remain.

The combined review additionally reproduced an existing schedule-detail scope mismatch: Admin’s timetable hid another team’s person, while the Published schedule editor returned both employees. The repository now applies current TEAM grants in SQL before projecting assignments or fetching their requirements, independently of active-person/skill pickers. Super Admin remains global and retained inactive Published assignments are not removed by an active-person filter. [The before-proof](evidence/browser-verification-2026-10-15/editor-team-scope-before.log) is preserved; [the identical after-proof](evidence/browser-verification-2026-10-15/editor-team-scope-after.log) passes6/6, including Super Admin global reads, Admin isolation and immediate grant revocation. Types and focused lint also pass.

The request-edit Client Component receives an explicit three-field projection, so a legacy Admin-owned unpublished request cannot carry its anchor/period/effect identifiers in the React page payload. The Phase10 browser journey asserts that the own request ID remains present while its unpublished period/assignment IDs are absent.

The final publication-state repair batch-reads existing effect-period statuses. A published effect clears pending-publication markers and its Draft-publication link; history shows Schedule published even after supersession. Missing effects use neutral Approved. Coverage integration/validation now passes24/24, including an effect applied to an existing Draft and later publication/supersession; its final desktop/phone publication journey passes2/2, verifying cleared markers/links and Schedule published after actual publication.

No provider, background service, authentication change, migration, reset or production business-data write was introduced. Existing TaskDialog and browser-harness work from the coordinating chat is preserved.

## Verification and limits

[The bounded receipt](evidence/cover-workspace-2026-10-15/verification.json) links actual logs and final source hashes. Coverage integration/validation passes24/24; collaboration/governance services26/26; affected unit/components50/50; final map/timetable/guide checks19/19. Types, lint and scenario registration pass. The complete unit/component diagnostic passed421/422; its obsolete Admin discovery wording was repaired and the affected test passes in the focused final run. The full combined rerun is required.

Final desktop and phone Cover journeys pass2/2 against an isolated build and disposable PostgreSQL. Both exercise cell-to-request navigation, creation, nominee editing, cancellation/history, direct rejection/approval, immutable Published work, main-timetable creation, Employee vacation access and320px RTL/dark map reflow. Both owned build directories and databases are cleaned. The final four linked screenshots come from the publication journey on the latest source, including the TEAM/DTO repairs. The combined frozen gate still remains required. Screenshots were visually inspected; the final dock preserves the employee and worksite markers.

The additional collaboration browser diagnostic passed phone and failed desktop's5-second management-note success expectation while concurrent builds ran; its screenshot showed the form still Saving. No permission error was observed. The pending sequential combined gate must resolve this before release. Earlier browser diagnostics preserve the fixed Published-map failure and a history locator collision separately. Focused successes are not added together as a unique whole-system total.

- [Desktop Cover](evidence/cover-workspace-2026-10-15/final-desktop-cover-admin-pending.png)
- [Phone Cover](evidence/cover-workspace-2026-10-15/final-mobile-cover-admin-pending.png)
- [Desktop work map](evidence/cover-workspace-2026-10-15/final-desktop-work-map-selection.png)
- [320px RTL/dark work map](evidence/cover-workspace-2026-10-15/final-mobile-work-map-320-rtl-dark.png)

## Release handoff

Application source is settled under [the input hashes](evidence/cover-workspace-2026-10-15/source-inputs.json). The coordinating chat owns remaining historical-contract tests, final frozen system gate, combined commit/push, deployment and read-only production preservation/live-role checks. The [combined receipt](evidence/browser-verification-2026-10-15/verification.json) now records both local source snapshots and cleanup; the production receipt follows deployment. General Phase13 readiness, deferred policy and Settings remain outside this amendment.
