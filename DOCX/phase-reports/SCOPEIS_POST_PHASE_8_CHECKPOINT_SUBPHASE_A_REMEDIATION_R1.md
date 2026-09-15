# ScopeIs Post-Phase-8 Checkpoint — Sub-phase A remediation R1

**Classification:** `SCOPEIS_CHECKPOINT_SUBPHASE_A_IMPLEMENTED_AND_PUSHED`

**Scope:** verification-harness remediation and documentation reconciliation only. This sub-phase does not start Phase 9, does not merge or modify the Preview worktree, does not change business behavior, permissions, privacy projections, workflows, database schemas, or Phase 8 map behavior, and does not access any production system or secret.

**Handoff:** Checkpoint Sub-phase B (independent Phase 0–8 re-verification and formal checkpoint closure) is owned by a separate agent. This report deliberately does **not** mark the overall checkpoint closed.

## 1. Custody

| Item | Value |
| --- | --- |
| Starting branch | `main` |
| Starting HEAD | `99199353f92057184cb7bd2ea97b010915a7f40d` (`feat: implement Phase 8 static planning map`) |
| Starting tracking | `main...origin/main` `0/0` |
| Final HEAD | recorded in the delivery message for this commit (`test: remediate post-phase-8 verification gates`) |
| Preview worktree | `/Users/mulhamkassab/Desktop/For Me/ScopeIs Team Management System-preview`, branch `preview` at `7c401c6add34db14c43b2139aebc9c8878618927`, aligned `0/0` with `origin/preview` |
| Preview handling | Inspected read-only. Not modified, merged, rebased, pushed, or staged. Its pre-existing untracked `* 2.tsx` / `* 2.css` duplicate files were left untouched. |

The Phase 8 closure commit `9919935` is reachable from both `main` and `origin/main`. No `git reset`, `git clean`, `checkout --`, `restore`, rebase, force-push, or broad staging (`git add .`, `git add -A`) was used.

## 2. Audit classification and what it changed

The Post-Phase-8 audit returned `CHECKPOINT_PASS_WITH_CAVEATS_READY_FOR_PHASE_9`: product journeys, authorization, privacy, security, and data integrity were sound, and Phase 8 remains validly completed. The defects were in the aggregate verification system and in the documentation that reported it.

| Audit observation | Sub-phase A disposition |
| --- | --- |
| Unit 42/42, migration 8/8, per-phase service suites, per-phase Playwright, typecheck, isolated build, seed smoke, `git diff --check` all passed | Preserved; no product code was rewritten. |
| Component suite could not run as one authoritative command | Repaired (Workstream A1). |
| Module-wide integration run shared one seeded database and produced duplicate `employee_profiles`/`schedule_periods`, empty scope grants, `NOT_FOUND` fixture Clients, and order-dependent failures | Replaced with per-file disposable isolation (Workstream A2). |
| `package.json` pointed aggregate integration/E2E at Phase 1-specific runners; `playwright.config.ts` required a runner-allocated port | Settled into one documented contract (Workstream A3). |
| Repository-wide lint reported 103 findings, all inside the untracked historical prototype | Documented lint boundary (Workstream A4). |
| Documentation still described earlier phases as unimplemented, Phase 2 as `NEXT`, Phase 3 as `BLOCKED`, and Phase 9 as simultaneously `PARTIAL` and `NOT_STARTED` | Reconciled (Workstream A5). |
| Route certification 6/11 with five inherited fixture failures | Root cause found and remediated; now 11/11. |

## 3. Workstream A1 — shared component tests

**Root cause.** Two independent regressions.

1. `test/component/phase3-operational-forms.test.tsx` still asserted the pre-Phase-6 accessible name `Add basic staffing requirement` and pre-Phase-6 explanatory copy. Phase 6 renamed that Client/Project/Location requirement form to `Add operational required skill` and replaced the copy.
2. `test/component/phase4-scheduling-forms.test.tsx` mocked only `@/modules/scheduling/actions`. Phase 6 made `@/modules/scheduling/forms` import the real `AssignmentSkillRequirementPanel` from `@/modules/capabilities/forms`, whose Server Action module reaches `@/db/client` → `@/server/env` → environment validation. The component suite has no `DATABASE_URL`, so the file could not even load. A third latent defect appeared once it loaded: `LifecyclePanel` gained a required `warnings` prop in Phase 6 and the test did not supply it.

**Decision taken.** Assert the current authoritative interface rather than reverting product copy, and cut the server→database chain at the panel's own action boundary so the suite stays a component test.

**Files changed.** `test/component/phase3-operational-forms.test.tsx`, `test/component/phase4-scheduling-forms.test.tsx`, new `test/component/database-boundary.test.ts`.

**Why this is safe.** The Phase 3 assertion was re-pointed at the live accessible name with a resilient `/operational required skill/i` role query and now verifies the current independent-rule wording. The Phase 4 test mocks `@/modules/capabilities/actions` only — the same pattern Phase 6's own component test already uses — which removes the database dependency without removing the Phase 6 panel from the graph or weakening any product functionality. `warnings` is supplied with a real warning object, so the Phase 6 non-blocking warning text is now positively asserted.

**Regression guard.** `test/component/database-boundary.test.ts` asserts the component environment has no `DATABASE_URL`, no `SCOPEIS_E2E_TEST`, and no production `APP_ENV`/`NODE_ENV`, and that importing `@/db/client` fails loudly rather than silently reaching PostgreSQL.

**Behavior intentionally unchanged.** No Phase 6 capability functionality was removed; no environment validation was weakened; no production credential was invented; no test was skipped or disabled; no component test requires PostgreSQL or `.env.production`.

**Result.** `npm run test:component` → 10 files, 20 tests, 0 failed, 0 skipped.

## 4. Workstream A2 — aggregate integration isolation

**Root cause.** `npm run test:integration` invoked Vitest once over the whole `test/integration` directory inside a single disposable database that had been seeded only with Phase 1 personas and grants. Phases 3–8 integration files each assume ownership of fixed fixture IDs (`phase3Ids`, `phase4Ids`), fixed employee codes, and singleton rows such as `schedule_periods`. Sharing one database therefore produced duplicate `employee_profiles`/`schedule_periods`, empty or contaminated scope grants, fixture Clients reported as `NOT_FOUND`, and order-dependent results: baseline `5 failed | 3 passed (8)` files, `15 failed | 26 passed (41)` tests.

**Decision taken.** The smallest robust design is an orchestrator that reuses the proven per-phase fixture helpers, giving **every integration file its own freshly created disposable database** on the same loopback cluster.

**Files changed.** New `scripts/run-aggregate-integration-tests.mjs`; `scripts/run-phase1-integration-tests.mjs` narrowed to its true Phase 1 scope; `package.json` scripts.

**Why this is safe.** `withDisposableTestDatabase` already refused non-loopback hosts, refused non-test database names, refused names implying production, verified the connected database identity, applied migrations to State D, seeded fictional fixtures, and dropped the database in a `finally` block. The aggregate command only changes *how many* databases are used, never the safety conditions. A guard in the orchestrator compares `test/integration/*.test.ts` against the scheduled suite manifest and fails if a new file would be silently ignored.

**Behavior intentionally unchanged.** No integration assertion was relaxed, removed, or skipped; the per-phase runners and their fixtures are unchanged; no product code was touched.

**Result.** `npm run test:integration` → 8/8 suites, 41/41 tests, each suite in its own disposable database, deterministic on repeated runs.

## 5. Workstream A3 — test-runner, aggregate E2E, and Playwright contract

**Root cause.** The uncommitted `package.json` pointed `test:integration` and `test:e2e` at runners named for Phase 1 while the uncommitted `playwright.config.ts` required a runner-allocated port. The root Playwright config had no `testMatch`, so a Phase 1 run would also pick up `employee-directory.spec.ts` and the Phase 3–8 specs; the directory spec would fail against Phase 1-only seed data and the phase specs would mass-skip on their guards. Phase 5–8 runners also used hard-coded ports (4315–4318).

**Decision taken.** One aggregate command per concept, each composing the existing guarded phase runners sequentially.

- `npm run test:e2e` = `scripts/run-aggregate-e2e-tests.mjs`, which runs the Phase 1, 2, 3, 4, 5, 6, 7, and 8 runners in order, printing each constituent suite and an overall status, and exiting non-zero if any journey fails.
- `npm run test:phase<N>-e2e` and `npm run test:phase<N>-service` remain available for focused work.
- The root `playwright.config.ts` is scoped with `testMatch: "foundation.spec.ts"` and keeps the fail-closed runner-port requirement.
- **Documented rule:** direct Playwright invocation is intentionally unsupported. There is no safe default port or database, so the configs fail closed and point at the canonical runners instead of inventing a default that could reach a persistent or production database.

**Files changed.** `package.json`, `playwright.config.ts`, new `scripts/run-aggregate-e2e-tests.mjs`, `scripts/run-phase5-playwright.mjs`, `scripts/run-phase6-playwright.mjs`, `scripts/run-phase7-playwright.mjs`, `scripts/run-phase8-playwright.mjs` (allocated ports), `scripts/disposable-test-database.mjs` (optional complete Phase 1 profile fixture), `scripts/run-phase1-route-certification.mjs`, new `scripts/run-seed-smoke.mjs`, new `scripts/verify-isolation.mjs`.

**Why this is safe.** Each phase keeps the fixture set its journey requires, so the employee directory never runs on Phase 1-only data and no phase spec runs against another phase's seed. Every runner still receives its own disposable loopback database and its own allocated loopback port. Skipped-by-guard specs cannot hide failures because the aggregate sets each guard and reports any real failure with a non-zero exit code.

**Behavior intentionally unchanged.** No application route, Server Action, service, schema, or map behavior changed. Phase 5–8 runners keep identical fixtures and assertions; only their port source changed from a fixed literal to a runner-allocated loopback port.

**Result.** `npm run test:e2e` → 8/8 suites, 60/60 tests, 0 skipped, 0 failed. Phase 1 14, Phase 2 20, Phase 3 14, Phase 4 2, Phase 5 2, Phase 6 2, Phase 7 2, Phase 8 4.

## 6. Workstream A4 — lint boundary around the historical prototype

**Root cause.** `eslint . --max-warnings=0` walked the preserved, untracked historical prototype `prototype/full-frontend-r1/` and reported 103 findings (97 errors, 6 warnings: `react/jsx-key`, `react-hooks/rules-of-hooks`, `@next/next/no-img-element`, `import/no-anonymous-default-export`, `react-hooks/purity`) — none of them in maintained application source.

**Decision taken.** Declare an explicit, documented ESLint ignore for the historical root prototype only, using the existing `globalIgnores` boundary in `eslint.config.mjs`.

**Files changed.** `eslint.config.mjs`.

**Why this is safe.** The boundary names exactly one historical directory. `src`, `test`, `scripts`, and repository configuration remain inside the authoritative lint result; no maintained directory was excluded to obtain a green result and no finding was suppressed.

**Boundary proof.** A temporary file `src/__lint-boundary-probe.tsx` containing an intentional `react/jsx-key` violation made `npm run lint` exit 1 (`4:35 error Missing "key" prop for element in iterator`). The probe was removed immediately; `npm run lint` then exited 0 with no output. No mutation was left behind.

**Behavior intentionally unchanged.** The prototype was not deleted, edited, formatted, migrated, relabelled, staged, or committed.

**Result.** `npm run lint` → exit 0 for the maintained application.

## 7. Workstream A5 — documentation reconciliation

**Outdated or conflicting statements corrected.**

| Document | Corrected statement |
| --- | --- |
| `DOCX/project-memory/IMPLEMENTATION_ROADMAP.md` | Phase 2 status `NEXT` → `COMPLETED`; added explicit statuses for Phases 3–13 so no phase status is ambiguous; added the Post-Phase-8 checkpoint section; recorded that preserved Phase 9 schema does not mean the Phase 9 journey started. |
| `DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md` | Current focus moved from Phase 9 to the checkpoint; Phase 3 `BLOCKED` → `COMPLETED` (with sub-phase 3.10 updated); Phase 9 `PARTIAL` → `NOT_STARTED` so Phase 9 is no longer simultaneously `PARTIAL` and `NOT_STARTED`; the "repository-wide lint/legacy-runner interference" blocker removed; Phase 7/8 evidence references that were used but never defined added; a Post-Phase-8 checkpoint section added; changelog entries added for Phases 6, 7, 8, the Phase 3 QA disposition, and this checkpoint. |
| `DOCX/project-memory/PROJECT_OVERVIEW.md` | "Phase 2 is `NEXT`" and "later journey phases remain unimplemented" replaced with the completed Phase 0–8 record, the current checkpoint, and Phase 9 as the next `NOT_STARTED` journey. |
| `DOCX/project-memory/IMPLEMENTATION_STATUS_LOG.md` | Appended the 2026-09-15 Sub-phase A entry. |
| `DOCX/INDEX.md` | Phase 3 `BLOCKED` classification removed; Phases 4–8 recorded as `COMPLETED`; checkpoint added to the index; added a verification-command section and the `build:safe` policy. |
| `PROJECT_CONTEXT.md` | Phase 3 `BLOCKED` paragraph replaced with the completed record; checkpoint, Phase 9–13 ownership, verification contract, build-safety policy, and the prototype lint boundary added. |
| `README.md` | Rewritten: it previously claimed Phase 1 + Phase 2 database foundation only, with Phases 3–8 and later as unimplemented shells. Now records Phases 0–8 as completed, lists the canonical command table, documents the unsanctioned `npm run build`, documents the Playwright rule and database isolation, and documents the lint boundary. |
| `src/modules/navigation/navigation.ts` | Notifications and audit purpose strings said "Phase 8" and reports said "Phase 8"; corrected to Phase 10 (notifications centre, audit interface) and Phase 11 (dashboards/reports/exports). `employees` and `profile` purposes no longer say Phase 2 work "will be introduced"; they record what Phase 2 delivered. |
| `src/shared/components/shell.tsx` | The Ticket System placeholder was labelled `Phase 9`; corrected to `Phase 12` to match the roadmap. |

**Authoritative Phase 0–9 status after reconciliation.**

| Phase | Status |
| --- | --- |
| 0 Discovery and technical pilot | `COMPLETED` |
| 1 Secure application foundation | `COMPLETED_IN_NARROW_FOUNDATION_SCOPE` |
| 2 Employee management journey | `COMPLETED` |
| 3 Clients, projects, and locations | `COMPLETED` (product journey completed; the former repository-wide lint blocker no longer represents product status) |
| 4 Scheduling, review, and publication (V1) | `COMPLETED` (component regression remediated in this checkpoint) |
| 5 Leave and availability | `COMPLETED` |
| 6 Skills and operational capabilities | `COMPLETED` |
| 7 Coverage and replacement | `COMPLETED` |
| 8 Static planning map | `COMPLETED` (delivered the static planning map) |
| Post-Phase-8 checkpoint | Sub-phase A implemented here; Sub-phase B owns re-verification and closure |
| 9 Certifications, CVs, portfolios, and files | `NEXT` / `NOT_STARTED` |

Notes/discussions/notification-centre completion/audit interface remain Phase 10; dashboards, reports, and exports remain Phase 11; Ticket System integration remains Phase 12; production identity and deployment remain Phase 13.

**Preserved.** Requirements, privacy rules, non-goals, entity relationships, and workflow definitions were not changed. Only outdated implementation-status statements and phase labels were corrected. No aggregate gate was claimed as passing before it actually passed.

## 8. Adopted pre-existing user-owned hunks

The audit recorded pre-existing user-owned changes. Each was inspected file-by-file and hunk-by-hunk and classified as follows.

| File | Classification | Rationale |
| --- | --- | --- |
| `package.json` | Adopted (test-runner contract) | Required to give aggregate integration/E2E one unambiguous meaning. |
| `playwright.config.ts` | Adopted (runner port) | Required to reconcile the runner-managed-port rule; kept fail-closed. |
| `README.md` | Adopted and rewritten | Documentation had to describe the verified state and canonical commands. |
| `src/server/http.ts` | Adopted | `ZodError → 400` is required by the route-certification "malformed login input" contract; without it a schema-invalid body returns 500. |
| `src/app/api/auth/mock-login/route.ts` | Adopted | Malformed JSON must produce 400, not 500, for the same certified contract. |
| `src/modules/auth/session-service.ts` | Adopted | Cookie `secure` must follow `APP_ENV`, not `NODE_ENV`; route certification builds in production mode and asserts the test cookie is not `secure`. |
| `src/app/(protected)/[module]/page.tsx` | Adopted | The catch-all module guard must return a non-enumerating 404 for an unauthorized module, matching the documented Phase 2/3/8 "non-enumerating 404" behavior and the certification contract. Previously it produced a 500. |
| `src/db/seed/index.ts` | Adopted | The idempotent, non-destructive fictional seed and its production guard are required by the seed-smoke gate. |
| `test/e2e/foundation.spec.ts` | Adopted | Phase 1 E2E harness work: session sign-out isolation, no-horizontal-overflow checks, and the Bravo-scope personas. |
| `test/integration/foundation-postgres.test.ts` | Adopted | Phase 1 integration harness work: session + audit transaction rollback coverage. |
| Phase 1 runner scripts (`run-phase1-integration-tests.mjs`, `run-phase1-playwright.mjs`, `run-phase1-route-certification.mjs`, `run-phase1-safe-build.mjs`, `start-phase1-test-server.mjs`) | Adopted | The Phase 1 certification harness; the integration runner was narrowed to its true Phase 1 scope. |
| `test/route-certification/phase1-http.test.ts` | Adopted and corrected | The Phase 1 route certification; its stale per-role module contract was remediated. |
| `scripts/remediate-r2-persistent-test-incident.mjs` | **Preserved uncommitted** | One-off historical incident cleanup with a hard-coded manifest. Not part of the ongoing verification contract; neither staged nor deleted. |
| `prototype/full-frontend-r1/` | **Preserved untouched** | Historical reference work. Not staged, deleted, edited, formatted, or migrated; excluded from application lint only. |

## 9. Route-certification remediation (the five inherited failures)

**Root cause.** The five inherited failures were the certification fixture contract, not product defects.

1. **Three failures (`/profile` → 500 for Super Admin and both Admins).** Phases 2–8 implemented real protected pages, but the disposable Phase 1 certification database seeded only users and scope grants. `/profile` requires a genuine `employee_profiles` row and threw `NOT_FOUND`, surfacing as 500.
2. **Two failures (Employee navigation for `clients`).** The certification's per-role module sets were stale: they omitted `skills` (added in Phase 6) and expected Employees to see `clients`/`projects`, which the authoritative capability model never grants.

**Decision taken.** Complete the fixture contract in the owned harness and correct the certification's role contract to the authoritative capability model, rather than changing product behavior.

- `withDisposableTestDatabase` gained an opt-in `phase1EmployeeProfiles` fixture that seeds one fictional designation and one fictional `employee_profiles` row for each of the five personas. Only the route-certification runner opts in, so Phase 3–8 suites that insert their own profiles are unaffected.
- `moduleKeys` now lists all seventeen modules (including `skills`), and the per-role expectations mirror `src/modules/authorization/capabilities.ts`.
- Employees deliberately reach a non-enumerating "management-only" refusal page for `coverage` and `replacements` instead of a 404. That behavior is pre-existing and intentional, so it is classified explicitly as `refusalModules` with an assertion that the page contains the literal `management-only` text, is never linked in navigation, and projects no management data. `/map` still returns 404 for Employees.

**Result.** `npm run test:route-certification` → 11/11 tests passed (was 6/11).

## 10. Mandatory gate results

All database checks used newly created disposable loopback-only PostgreSQL databases with fictional data. No gate read `.env.production`.

| # | Gate | Command | Result |
| --- | --- | --- | --- |
| 1 | Typecheck | `npm run typecheck` | Pass — exit 0, no diagnostics |
| 2 | Unit suite | `npm run test:unit` | Pass — 14 files, 42/42 tests, 0 skipped |
| 3 | Component suite (one aggregate command) | `npm run test:component` | Pass — 10 files, 20/20 tests, 0 skipped, no database |
| 4 | Aggregate integration | `npm run test:integration` | Pass — 8/8 suites, 41/41 tests, one database per file |
| 5 | Phase-specific service runners 2–8 | `npm run test:phase2-core`, `test:phase3-service` … `test:phase8-service` | Pass — 13, 7, 5, 3, 3, 5, 1 |
| 6 | Migration verification | `npm run test:migration` | Pass — 8/8 tests |
| 7 | Aggregate E2E | `npm run test:e2e` | Pass — 8/8 suites, 60/60 tests, 0 skipped |
| 8 | Phase-specific desktop/mobile E2E | `npm run test:phase1-e2e` … `test:phase8-e2e` | Pass — executed as the constituent suites of gate 7 |
| 9 | Route certification | `npm run test:route-certification` | Pass — 11/11 tests (was 6/11) |
| 10 | Application lint | `npm run lint` | Pass — exit 0 with the documented prototype boundary |
| 11 | Safe isolated build | `npm run build:safe` | Pass — isolated typecheck + build, exit 0 |
| 12 | Fictional seed smoke | `npm run test:seed-smoke` | Pass — 5 personas, 2 non-duplicated grants, idempotent re-run |
| 13 | Whitespace/error scan | `git diff --check` | Pass — exit 0 |
| 14 | Database and port isolation | `npm run test:isolation` | Pass — 9/9 checks |
| 15 | Negative `.env.production` check | `scripts/verify-isolation.mjs` + `stat` comparison | Pass — no harness/config file loads it; size, mtime, and atime unchanged |
| 16 | Final worktree comparison | `git status --short`, `git diff` | Pass — unrelated user-owned work preserved; Preview untouched |

### Intentional skips

There are no intentionally skipped Unit, Component, Integration, Migration, Route-certification, Isolation, or seed-smoke tests.

Six E2E specs carry `test.skip(<guard>)` statements — `phase3-operations.spec.ts`, `phase4-scheduling.spec.ts`, `phase5-leave.spec.ts`, `phase6-capabilities.spec.ts`, `phase7-coverage.spec.ts`, `phase8-planning-map.spec.ts`. They remain **by design**: each journey must run only with its own fixtures, so the guard skips the spec when it is not started by its owning runner. `npm run test:e2e` starts every owning runner, so every guard is satisfied and **0 tests were skipped** in the aggregate run. Direct `npx playwright test` remains intentionally unsupported.

### Disposable-database and isolated-port behaviour

- `withDisposableTestDatabase(label, callback, options)` reads the approved loopback `.env.test` target, refuses any non-loopback host, refuses a database name that is not explicitly test-scoped or that implies production, verifies the connected database identity and loopback addresses server-side, creates a uniquely named database (`scopeis_<label>_<pid>_<random>_test`), applies migrations to State D, seeds fictional fixtures, and drops the database in a `finally` block. `assertDisposableName` refuses unsafe names before any `drop database`.
- Each integration suite, each route-certification run, each E2E phase runner, the seed smoke, and each isolation probe get their own database, so fixed fixture IDs cannot collide across files and test order cannot change results.
- E2E runners allocate a free loopback port at run time and pass it to Playwright as `SCOPEIS_PLAYWRIGHT_PORT`. The Playwright configs throw unless a valid runner-allocated port is present, so no direct invocation can accidentally attach to a persistent service or database.
- No gate targets the persistent test database. `npm run test:isolation` proves the persistent test database is byte-for-byte unchanged across disposable work, that two concurrent disposable databases cannot see each other's rows, that databases are dropped afterwards, that ports are unique, and that no harness or configuration file references `.env.production`.

## 11. Build-safety policy

`.env.production` exists locally and can be auto-loaded by an ordinary Next.js build. Therefore:

- **`npm run build` is not a sanctioned verification gate in this repository while that file exists.**
- The authoritative build gate is **`npm run build:safe`** (`scripts/run-phase2-safe-build.mjs`): it copies an allowlist of source and configuration into an isolated temporary directory, refuses any `.env*` path, asserts the copied tree contains no environment file, then runs `tsc --noEmit` and a production build with an explicit safe environment.
- `npm run build:phase1-certification` is the older Phase 1-scoped variant of the same isolated approach and remains available; it is also `.env`-free but does not run typecheck.
- The safe-build runner's refusal of `.env*` files was not weakened, and its guarantee was not bypassed.
- `.env.production` was never opened, printed, copied, committed, renamed, or modified. Its size, modification time, and access time were identical before and after the verification run.

## 12. Blockers, debt, deferred work, and preserved changes

**Blockers for Sub-phase B.** None known. Every mandatory Sub-phase A gate passes.

**Non-blocking technical debt.**

- Two isolated safe-build runners exist (`build:safe` and `build:phase1-certification`). The relationship is documented, but consolidating them would be cleaner.
- `test/e2e/foundation.spec.ts` and `employee-directory.spec.ts` have no guard of their own; they are scoped by `testMatch` in their configs rather than by an explicit skip guard.
- The pre-existing untracked `prototype/` directory is excluded from lint but is not gitignored, so a future broad `git add` could still stage it.
- `scripts/remediate-r2-persistent-test-incident.mjs` remains an uncommitted one-off cleanup script with a hard-coded manifest.

**Intentionally deferred Phase 9+ work.** Certifications, CVs, portfolios, uploads, private storage, notification centre, audit interface, dashboards, reports, exports, Ticket System integration, production identity, deployment, and rollout. None was implemented or converted into a feature during this sub-phase.

**Preserved user-owned changes.** `scripts/remediate-r2-persistent-test-incident.mjs` and `prototype/full-frontend-r1/` remain uncommitted and unstaged/untracked exactly as found. The separate Preview worktree remains untouched.

## 13. Handoff to Checkpoint Sub-phase B

1. Check out the Sub-phase A remediation commit recorded in the delivery message (`test: remediate post-phase-8 verification gates`) on `main`, aligned `0/0` with `origin/main`.
2. Independently re-run every gate in section 10, including the negative `.env.production` check and the isolation proof.
3. Independently re-walk the Phase 0–8 documents and confirm the Phase 0–9 status table in section 7.
4. Confirm the Preview worktree is still untouched at `7c401c6` and that the preserved uncommitted files are still present.
5. Perform the formal checkpoint closure. Sub-phase A deliberately did not declare the overall checkpoint closed.
