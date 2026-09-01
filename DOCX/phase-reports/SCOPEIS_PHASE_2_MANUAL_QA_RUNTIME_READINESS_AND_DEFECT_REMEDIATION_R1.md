# Phase 2 manual-QA runtime readiness and defect remediation R1

## Classification

`SCOPEIS_PHASE_2_MANUAL_QA_RUNTIME_READINESS_AND_DEFECT_REMEDIATION_R1` is `COMPLETED` after a full fictional, disposable manual-QA environment loaded both previously failing routes. This is a **manual-environment readiness gap**, not a demonstrated Phase 2 product-route defect. Phase 2 remains `COMPLETED` at 11/11; Phase 3 remains `NOT_STARTED`.

## Custody

Work began on `main` at `b861db980428711f4472b01396ab42d9ab027ad4`; `origin/main` resolved to the same commit and local ahead/behind was `0/0`. Nothing was staged. The pre-existing user-owned modifications and untracked Phase 1 tooling were inventoried before edits and are excluded from this remediation commit:

```
README.md
package.json
playwright.config.ts
src/app/(protected)/[module]/page.tsx
src/app/api/auth/mock-login/route.ts
src/db/seed/index.ts
src/modules/auth/session-service.ts
src/server/http.ts
test/e2e/foundation.spec.ts
test/integration/foundation-postgres.test.ts
scripts/remediate-r2-persistent-test-incident.mjs
scripts/run-phase1-integration-tests.mjs
scripts/run-phase1-playwright.mjs
scripts/run-phase1-route-certification.mjs
scripts/run-phase1-safe-build.mjs
scripts/start-phase1-test-server.mjs
test/route-certification/
```

No reset, clean, restore, stash, rebase, merge, force push, or destructive checkout was used. A sandbox limitation prevented process-list inspection; no unsafe process operation was attempted.

## Diagnosis

The supported disposable database base fixture deliberately creates the five fictional users and the two Admin TEAM grants, but not employee profiles, designations, or the other Phase 2 management records. The existing user-owned seed edit confirms that it also intentionally omits employee profiles/catalogues. In that minimal state, `EmployeeProfileService.getOwnProfile` correctly returns `NOT_FOUND` for a fictional user without an `employee_profiles` row. The protected `/profile` page therefore reaches the generic `app/error.tsx` boundary. The boundary correctly keeps browser details generic:

```
Something went wrong
No internal details were exposed. Return to a safe page and try again.
```

The Phase 2 Playwright suite seeded its own private directory/profile fixture, so it passed without providing a reusable interactive manual-QA environment. There was no repository-supported command that combined migrations, complete Phase 2 fixture data, an isolated no-environment-file build, and a long-running local server.

The reported `/employees` boundary could not be reproduced against a freshly migrated owned fixture: the new smoke check returns its real directory page. Inspecting a user's existing local database, stale output, or non-test environment would violate the task's safety constraints, so no claim is made about its exact local state. The available evidence makes an unsupported/unmigrated/stale manual runtime the safe explanation for that route, while the missing profile fixture directly explains `/profile`.

No secret, production environment value, local environment value, production database, external production service, deployment, or persistent/shared test data was accessed.

## Remediation

Two focused runner changes provide a supported manual workflow without altering employee product behavior:

- `scripts/run-phase2-manual-qa.mjs` creates a uniquely named, owned disposable loopback PostgreSQL database through the established harness; applies immutable migrations `0000`, `0001`, and additive `0002`; then seeds a complete fictional Phase 2 graph.
- The fixture contains Nora Albright (Super Admin), Ava Mercer (Admin with active `team:alpha` grant), Ben Iqbal (Admin with active `team:bravo` grant), Cora Bell (in-scope Employee self-service profile), Dan Rowan (out-of-scope Employee), a designation, employee teams, manager relationships, descriptive working patterns, work contact/profile data, and the scope records needed to exercise management behavior.
- The launcher runs `scripts/run-phase2-safe-build.mjs --serve-port <random>` on loopback. The safe builder copies an explicit application allowlist into an owned temporary directory, excludes `.env*`, `.git`, `.next`, reports and generated artifacts, checks that no `.env*` exists in the copy, derives only guarded test settings from `.env.test`, and starts Next only from that copy.
- Signal handling now terminates a live isolated server or in-flight child safely before its owned temporary build directory is removed. The manual launcher waits for the child to stop before the harness drops only its owned database.

The generic browser boundary was deliberately preserved. The supported launcher is the server-side diagnostic/readiness mechanism; it exposes only safe operational facts and normal fictional persona names.

## Manual-QA operation

Start the environment with:

```sh
node scripts/run-phase2-manual-qa.mjs
```

It prints a random loopback URL such as `http://127.0.0.1:60297`. Open that URL, visit `/login`, and select:

| Persona | Expected use |
| --- | --- |
| Nora Albright | Super Admin: directory, search/filter, creation, details, management mutations and explicit TEAM grants. |
| Ava Mercer | Admin with only `team:alpha`: safe scoped directory/details, no management mutations. |
| Ben Iqbal | Admin with only `team:bravo`: safe scoped directory/details, no management mutations. |
| Cora Bell | Employee: `/profile` real self-service profile only; `/employees` is denied. |

Use `Ctrl+C` in the launcher terminal to stop it. No separate manual cleanup command is needed: termination kills the isolated server, removes the temporary build copy, and drops only the database created by that running launcher. This was exercised against a ready launcher and emitted `Phase 2 isolated safe build cleanup complete.` with exit code 0. If the process exits normally, the same cleanup runs automatically.

For the executable route regression, use:

```sh
node scripts/run-phase2-manual-qa.mjs --smoke
```

That starts the same isolated environment, mock-signs in Nora for `/employees` and Cora for `/profile`, asserts HTTP 200 and real page headings, and then cleans up.

## Safety evidence

The existing guarded parser requires `.env.test` to declare `APP_ENV=test`, `MOCK_AUTH_ENABLED=true`, a loopback PostgreSQL host, and a test-only database name. The disposable harness performs a sanitized connection check for matching test database name and loopback server/client addresses before creating a uniquely named owned database. Credentials and connection strings are never printed.

The isolated build reports the safe fact `Phase 2 safe build preflight passed: isolated copy contains no .env* files.` before compilation. It never invokes `npm run build`, never reads or copies `.env.production` or `.env.local`, and its temporary directory is removed in `finally`.

## Verification

The following commands were run from the repository root after remediation. Database and browser commands use the owned disposable loopback harness only. `npx playwright install chromium` and `npx playwright install chromium-headless-shell` restored a missing local Playwright cache runtime only; they did not modify repository files or application data.

| Command | Result |
| --- | --- |
| `node scripts/run-phase2-manual-qa.mjs --smoke` | Passed: isolated no-`.env*` typecheck/build/server; Nora `/employees` and Cora `/profile` returned 200; owned database and temporary app cleaned up. |
| `npm run test:phase2-core` | Passed: 1 file, 11 tests, including the unprofiled-fictional-session readiness regression. |
| `npm run test:migration` | Passed: 1 file, 8 migration/fingerprint/clean-upgrade tests. |
| `npm run test:component` | Passed: 3 files, 8 tests. |
| `npm run test:unit` | Passed: 8 files, 29 tests. |
| `node scripts/run-phase2-playwright.mjs` | Passed: 18 desktop/mobile Phase 2 journey tests. The first attempted run diagnosed a missing local Playwright headless-shell binary before test execution; the suite was rerun successfully after restoring that test dependency. |
| `node scripts/run-phase2-safe-build.mjs` | Passed isolated typecheck and build with no `.env*` in its temporary copy. |
| `npm run lint` | Passed with zero warnings. |
| `git diff --check` | Passed. |

Exact output/counts are retained in the terminal record for this controlled closure. No direct browser E2E against a persistent environment or direct `npm run build` was run.

## Changed-file inventory

- `scripts/run-phase2-manual-qa.mjs` — new supported owned-disposable fixture/server/smoke workflow.
- `scripts/run-phase2-safe-build.mjs` — signal-aware child cleanup for long-running isolated manual QA.
- `test/integration/phase2-core-service.test.ts` — focused missing-profile readiness regression.
- `DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md` — truthful readiness evidence, Definition-of-Done manual gate, and append-only remediation status log.
- `PROJECT_CONTEXT.md` — active manual-QA launch guidance.
- `DOCX/INDEX.md` — indexed manual-QA readiness evidence.
- This report — immutable remediation evidence.

## Completion decision

The launcher smoke proves both real user-facing routes load with complete fictional PostgreSQL data, while preserving safe browser errors for genuine faults. The Phase 2 product implementation was not expanded or redesigned; only its missing supported manual-runtime preparation and deterministic cleanup behavior were added. Phase 2 remains complete at 11/11. Phase 3 and later employee features were not started.
