# Frontend and backend gap fixes — 2026-10-14

The product owner authorized implementing the confirmed gaps from the [feature audit](SCOPEIS_FRONTEND_BACKEND_AUDIT_2026_10_14.md), in its recommended order, while preserving existing roles and permissions. This report records the resulting local implementation. The audit remains the historical baseline.

**Final disposition — 2026-10-15:** confirmed gaps implemented locally; all six focused desktop/phone journeys pass. The broad system run passed 13/14 gates and retains an interrupted browser gate. Source is uncommitted and undeployed. [The verification receipt](evidence/frontend-backend-gap-fixes-2026-10-14/verification.json) records results, 466 matching source/test/configuration hashes and cleanup.

## Implemented behavior

| Area | Result |
| --- | --- |
| Recorded skill lifecycle | Super Admin can restore archived associations, retaining the original row/history. Archived parent skills must first be reactivated. The new-skill picker avoids existing active/archived duplicates. |
| Private evidence transport | Hosted production uploads use a 4 MiB limit; local uploads retain 5 MiB. The actual multipart stream is bounded before parsing. Retained larger files download through 1 MiB ranges with fresh authorization and completeness checks for each range. |
| Assignment removal | Draft and revision removal sets a nullable omission timestamp, retaining requirements/provenance/coverage history. All active schedule, overlap, map, leave and report projections exclude omitted rows. The Published predecessor remains effective until separate revision publication. |
| Assignment labels | A Super Admin-only catalogue supports create/edit/name/colour/order/archive/reactivate through the existing catalogue service. Labels remain descriptive. |
| Job titles | Existing lifecycle services now have archive/reactivate controls. Existing members retain archived titles, including when editing other profile assignments; newly assigning an archived title remains refused. |
| Default work location | A separate Super Admin field writes the existing versioned profile reference, without creating an assignment or coordinate. |
| Planning coordinates | Super Admin can manually create/correct/clear existing employee coordinates. Current actor/session checks, target serialization and dual profile/coordinate versions prevent stale/concurrent writes and delete/recreate reuse. Audit excludes raw coordinates. |
| Notification count | The shell shows the user's own unread count and refreshes it after recipient-authorized read/archive operations. |
| Skill descriptions | Super Admin can edit optional existing proficiency/experience descriptions and notes. These do not affect verification, eligibility, ranking or coverage. |

Super Admin alone writes schedules and publishes, decides leave and coverage, and uses the added catalogue/employee/coordinate controls. Admin retains current TEAM and operational scope checks, read-only schedule access and the separate cover-request workflow. Employee retains own Published schedule, own evidence and permitted self-service. System roles, job titles, teams, arrangement labels, profile location text and actual scheduled work remain separate.

## Migration and preservation

`src/db/migrations/0016_schedule_assignment_omission.sql` contains one additive nullable column. The Drizzle snapshot, migration journal, exact schema fingerprints and adoption-stage validation are updated to 17 migrations. Earlier SQL is unchanged. Preservation verification compares existing workforce facts while excluding only the new null field and checks existing ledger entries remain unchanged. The repair avoids foreign-key deletion failures by keeping assignment identities and historical references.

No production database, environment, account, credential or provider has been changed. The migration is prepared locally and has been applied only to fresh disposable test databases. Source remains uncommitted and has not been pushed or deployed. Production needs migration `0016` before deploying the updated application.

## Verification

The maintained full-system attempt finished **13/14 gates passed**, with one interruption in Aggregate E2E. Types, lint, 242 unit tests, 176 component tests, all 16 integration suites, 11 migration cases, HTTP role certification, isolation, seed/fresh-system smoke, safe build and whitespace passed. The broad browser gate is **not certified green**: a Windows temporary-directory lock affected foundation setup, a long client setup case reached its deadline, and the aggregate was eventually terminated by its outer deadline. Evidence is preserved in [the full-system log](evidence/frontend-backend-gap-fixes-2026-10-14/system-lock.log); this is not represented as a complete 15-suite or responsive pass.

All **6/6 final focused browser journeys pass** with one worker: four capability/management cases and two scheduling cases, each covering desktop and phone. The scheduling test waits for the Draft editor and opens its skills disclosure only when closed. The management test checks persistent page confirmation when a task dialog closes and reads native disclosure state before reactivation. Assertions and role refusals remain intact. See [the focused browser log](evidence/frontend-backend-gap-fixes-2026-10-14/focused-browser-final.log).

Final TypeScript and ESLint checks pass. The final full component repeat recorded 171 passes, one timeout and a failed worker startup affecting four cases. An isolated one-worker rerun passed all 9 selected cases across the affected and changed component files, covering all 176 distinct component cases across those runs. [The repeat](evidence/frontend-backend-gap-fixes-2026-10-14/component-final.log) and [isolated recheck](evidence/frontend-backend-gap-fixes-2026-10-14/component-isolated-final.log) remain separate; neither is presented as a clean single final full invocation. Earlier complete component verification passed 176/176. The main run also passed all 229 integration cases across 16 independent suites, 11 migration cases and 21 HTTP role checks covering 40 protected routes.

All 466 frozen implementation/test/configuration inputs match after verification. The owned disposable databases were dropped, the temporary PostgreSQL server was stopped, and the temporary awake guard was cleared. Downloaded binaries remain in the operating-system temporary directory; no permanent database installation or Windows service was added.

Added/strengthened checks cover archived skill restoration and version/role refusals; environment file limits, malformed ranges and actual multipart stream bounds; retained-download access loss; assignment history retention, audit rollback and publication effects on timetable/map/report/leave; archived-title preservation; manual-coordinate bounds, fresh authority, concurrency and delete/recreate stale refusal; and desktop/phone catalogue/profile controls with Admin/Employee refusal. Existing scenario and role certification now include `/arrangements`.

Earlier diagnostic browser runs found a disappearing skill-restore confirmation and ambiguous test locators/disclosure sequencing. The feedback defect is repaired; locators are scoped to the actual forms/dialogs. Earlier failed runs are not counted as successful verification.

The first full-system attempt inherited the temporary `DATABASE_URL` into mocked component tests, violating their existing no-database boundary. The system-lock runner now removes that override only for unit/component gates while retaining it for guarded database-owning gates. The diagnostic attempt was stopped after that known failure; the resulting single interrupted disposable database was identified and cleaned on the verified owned temporary PostgreSQL runtime, with no active connections. The final run uses the corrected environment separation. The diagnostic log remains preserved.

The next attempt passed the application, migration and route gates but found that the isolated baseline test database was empty, while the isolation proof requires migrated tables for its before/after comparison. That owned temporary baseline was migrated to State D and the separate isolation recheck passed 9/9. The attempt was stopped at completed fresh-system smoke; inspection confirmed only the owned baseline and default PostgreSQL database remained. A clean full run follows with unchanged application/test/configuration inputs. No existing project or production database was migrated.

A later run reached the reporting bulk test's default five-second deadline while exercising 5,001 fictional employees. That single test now has a bounded 15-second budget, with unchanged data, completeness, pagination, export-limit and audit assertions. A concurrent-build diagnostic also reached the new deadline; the serialized full reporting recheck passed 35/35, with the bulk case taking 1.044 seconds. The failed attempt was stopped before browser verification and its interrupted owned smoke database was cleaned. Final source hashes are refreshed for this test-only budget change, and final gates run sequentially.

Final UI review added persistent coordinate-clear confirmation outside the disappearing dialog, and the desktop/phone controls journey now saves and clears the coordinate. This bounded UI/test adjustment follows the backend/component gates and precedes browser verification; hashes are refrozen for the three affected files. Final type, lint and component checks are repeated on this final source. The unaffected domain/migration gates retain their passing evidence.

## Remaining boundaries

Settings stays explicitly unfinished. The historical root prototype and Company ticket preview are preserved as historical surfaces. Phase 4's deferred additional assignment types, verified-evidence coverage linkage (9.9), broader Phase 12 work and general Phase 13 readiness remain outside this delivery. No new provider, notification worker, recurrence, live tracking or qualification policy is assumed. Local Chrome desktop/phone emulation does not certify physical devices or every browser, and local checks do not certify production deployment.
