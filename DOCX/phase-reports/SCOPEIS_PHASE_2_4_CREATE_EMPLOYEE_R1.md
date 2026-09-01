# Phase 2.4 — Create employee R1

## Classification

`BLOCKED` — implementation candidates and focused disposable verification passed, but closure cannot be claimed because `npm run build` automatically loaded `.env.production`, contrary to the authorized no-production-environment-sourcing boundary. No secret value was printed, and no production database, deployment, or external production service was contacted. The event cannot be undone; explicit user disposition is required before any commit or push.

## Scope and custody

- Phase ID: `SCOPEIS_PHASE_2_4_CREATE_EMPLOYEE_R1`.
- Starting branch/HEAD/origin: `main` at `f5a79b57082ef43686fc8f8ab9627fd29e6056e5`; ahead/behind `0/0`; no staged files.
- Seventeen pre-existing unrelated user entries were preserved without modification: `README.md`, `package.json`, `playwright.config.ts`, `src/app/(protected)/[module]/page.tsx`, `src/app/api/auth/mock-login/route.ts`, `src/db/seed/index.ts`, `src/modules/auth/session-service.ts`, `src/server/http.ts`, `test/e2e/foundation.spec.ts`, `test/integration/foundation-postgres.test.ts`, six `scripts/run-phase1-*`/remediation files, and `test/route-certification/`.
- No migration, journal, or adoption fingerprint changed. `0001_phase_2_employee_capabilities.sql` remains byte-for-byte unchanged.

## Implemented Phase 2.4 candidate

The protected `/employees` page supplies an Add employee action only for Super Admin. Its Server Action re-authenticates, validates an allowlisted form contract, and delegates to `EmployeeProfileService.createEmployee`; the page and components contain no SQL or authorization decisions.

The service obtains a transaction-scoped employee-code advisory lock; checks normalized code uniqueness; creates an active `EMPLOYEE` user with a server-generated identifier; creates the minimal profile; then writes `employee_profile.created` audit metadata containing only `displayName` and `employeeCode` field names. It writes no sessions, credentials, passwords, invitations, mock personas, scopes, teams, designations, managers, locations, skills, evidence, notes, or notifications. Empty optional work email, work phone, and summary are accepted; supplied values are bounded and validated. Admin and Employee calls are rejected by the service, while the Admin UI has no action and Employee remains denied from `/employees`.

## Evidence and tests

The harness read only `.env.test` key names for preflight, requires PostgreSQL on a loopback host with a `test`-named database, and creates/drops owned disposable databases. Safety assertion result: `Disposable PostgreSQL safety passed: loopback test database (scopeis_team_management_test).`

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed (rerun after Server Action export correction). |
| `npm run test:unit` | Passed: 8 files, 29 tests. |
| `npm run test:component` | Passed: 2 files, 7 tests. |
| `npm run test:phase2-core` | Passed: 1 file, 8 tests in disposable PostgreSQL. Includes Super Admin-only creation, normalized duplicate rejection, no session row, sensitive audit-metadata exclusion, and forced-audit rollback of both user/profile. |
| `npm run test:migration` | Passed: 1 file, 8 migration/schema tests in the disposable harness. |
| `node scripts/run-phase2-playwright.mjs` | Passed: 14 tests across desktop/mobile. Includes Super Admin creation and field errors, Admin no-action/scope privacy, and Employee denial. |
| `npm run lint` | Passed. |
| `git diff --check` | Passed. |
| `npm run build` | Compiled successfully, but automatically loaded `.env.production`; this is the blocking safety deviation. |

Two preliminary test failures were corrected before final passing results: omitted optional values were initially rejected by the creation schema, and a test omitted the `EmployeeProfileService` import. An initial browser build exposed that a `"use server"` file exported a non-async value; that export was removed. The later browser run passed all 14 tests.

## Exclusions and limitations

This is not a completed employee journey and does not authorize Phase 2.5 or later. It does not add search/filter changes, detail routes, employee links, edit/activation/assignment controls, self-service, API routes, Route Handlers, browser data access, credentials, production identity, production database access, deployment, or persistent/shared test data.

## Required disposition

Leave this uncommitted worktree intact. A user must decide how to disposition the `.env.production` automatic-load deviation before an isolated Phase 2.4 commit/push can be considered. Until then Phase 2 remains `PARTIAL` (3/11), Phase 2.4 remains `BLOCKED`, and every later Phase 2 sub-phase is `NOT_STARTED`.

## Safety remediation and verified closure

The user authorized `SCOPEIS_PHASE_2_4_SAFE_BUILD_REMEDIATION_AND_CLOSURE_R1` after the incident. The original incident remains a violation: direct `npm run build` loaded `.env.production` automatically. No secret value was printed, and no production database, deployment, credential, or external production service was contacted. The remediation does not reclassify that load as acceptable.

`scripts/run-phase2-safe-build.mjs` now creates an owned temporary application from a strict allowlist (`src`, `public`, Next/TypeScript/package configuration), recursively rejects `.env*`, `.git`, `.next`, logs, test outputs, backups, and symbolic links in copied source, and then verifies again that the copied tree contains no `.env*` files. It reuses installed dependencies only as a symlink, supplies a sanitized child environment with `APP_ENV=test`, mock authentication, a synthetic loopback `scopeis_phase2_safe_build_test` URL, and the non-secret test TTL, then runs isolated `tsc --noEmit` and `next build --webpack`. The directory is removed in `finally` on success or failure.

Safe-build output recorded: `Phase 2 safe build preflight passed: isolated copy contains no .env* files.`, `Phase 2 isolated typecheck passed.`, production build passed, and `Phase 2 isolated safe build cleanup complete.` The direct workspace `npm run typecheck` was not a trustworthy verification command because the prior unsafe build left duplicate generated declarations under the pre-existing `.next`; those user/generated artifacts were neither read as environment input nor deleted. The isolated typecheck, from a copy excluding `.next`, passed instead.

### Remediation verification

| Command | Result |
| --- | --- |
| Loopback safety assertion using `.env.test` without printing credentials | Passed: approved test-named loopback PostgreSQL target. |
| `node scripts/run-phase2-safe-build.mjs` | Passed: no `.env*` in copy, isolated typecheck/build passed, cleanup completed. |
| `npm run test:unit` | Passed: 8 files, 29 tests. |
| `npm run test:component` | Passed: 2 files, 7 tests. |
| `npm run test:phase2-core` | Passed: 8 disposable PostgreSQL integration tests. |
| `npm run test:migration` | Passed: 8 disposable migration/schema tests. |
| `node scripts/run-phase2-playwright.mjs` | Passed: 14 desktop/mobile tests. |
| `npm run lint` | Passed. |
| `git diff --check` | Passed. |

### Closure decision

Phase 2.4 is `COMPLETED` only for its narrow workforce-record creation journey. Phase 2 remains `PARTIAL` at 4/11, and every Phase 2.5+ journey remains `NOT_STARTED`. The earlier incident and its absence of known production access remain preserved in this report. No production environment file was sourced, read, copied, exposed, or loaded during remediation verification.
