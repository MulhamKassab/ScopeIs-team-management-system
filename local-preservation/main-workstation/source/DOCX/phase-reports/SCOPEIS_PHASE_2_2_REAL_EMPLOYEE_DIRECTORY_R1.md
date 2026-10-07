# ScopeIs Phase 2.2 Real Employee Directory R1

**Phase ID:** `SCOPEIS_PHASE_2_2_REAL_EMPLOYEE_DIRECTORY_R1`
**Classification:** `COMPLETED_BACKEND_CONNECTED_READ_ONLY_DIRECTORY`
**Date:** 2026-09-01

## Scope and result

Phase 2.2 replaces the explanatory `/employees` shell with a responsive, server-rendered PostgreSQL directory for management users. The page calls the verified employee service and contains neither database access nor authorization policy. It has no public API, Route Handler, Server Action, detail link, form, search/filter/sort/pagination control, export, bulk action, or later employee journey.

Super Admin receives authorized global employee-profile records. Admin receives only profiles in an active `TEAM` grant through the existing scoped projection. Employee is denied the route and the management-only service. The UI renders only display name, employee code, team, and active/inactive status; it never renders `defaultWorkLocation`, work email, work phone, protected home data, skills, evidence, or notes.

## Custody and implementation evidence

Starting branch, `HEAD`, and `origin/main` were `main` and `cc176975ce56caab5f9148934530f5280697e964`, ahead/behind `0/0`, with no staged files. The pre-existing `/employees` shell was the only user-owned source file reconciled: its explanatory body was safely replaced. `src/app/styles.css` is a Phase 2.2 directory-only addition.

The other 17 preserved user-owned status entries remain unstaged and untouched: `README.md`, `package.json`, `playwright.config.ts`, `src/app/(protected)/[module]/page.tsx`, `src/app/api/auth/mock-login/route.ts`, `src/db/seed/index.ts`, `src/modules/auth/session-service.ts`, `src/server/http.ts`, `test/e2e/foundation.spec.ts`, `test/integration/foundation-postgres.test.ts`, `scripts/remediate-r2-persistent-test-incident.mjs`, `scripts/run-phase1-integration-tests.mjs`, `scripts/run-phase1-playwright.mjs`, `scripts/run-phase1-route-certification.mjs`, `scripts/run-phase1-safe-build.mjs`, `scripts/start-phase1-test-server.mjs`, and `test/route-certification/phase1-http.test.ts`.

| Capability | Files | Evidence and outcome |
| --- | --- | --- |
| Thin protected page | `src/app/(protected)/employees/page.tsx` | Authenticates server-side, checks management capability, then invokes the management directory service. |
| Management-only boundary | `src/modules/employees/employee-services.ts` | `listDirectoryProfiles` explicitly rejects Employee and delegates Super Admin/Admin reads to the verified repository-backed list/scoped projection. |
| Safe responsive UI | `src/modules/employees/employee-directory.tsx`; `src/app/styles.css` | Approved metadata only; mobile transforms rows into labeled record blocks; empty scope uses a safe status state. |
| Scope/privacy proof | `test/integration/phase2-core-service.test.ts` | Global list, TEAM inclusion/cross-scope absence, Admin location/contact omissions, empty no-scope Admin, and Employee prohibition pass. |
| Component proof | `test/component/employee-directory.test.tsx` | Approved metadata and safe empty state pass. |
| Browser proof | `test/e2e/employee-directory.spec.ts`; `playwright.phase2.config.ts`; `scripts/run-phase2-playwright.mjs`; `scripts/start-phase2-test-server.mjs` | Desktop/mobile prove global Super Admin directory, Admin scope/privacy, and Employee denial. |

## Schema, migration, and safety conclusion

No schema or migration change was required. `0001_phase_2_employee_capabilities.sql` remains byte-for-byte unchanged with SHA-256 `d0dc109b1cca66b727ea2843186559c1b9e0f802ad001d8013322f6a2beddd60`. The journal, adoption fingerprints, and runtime schema passed the committed migration suite (8/8). Employee profile, catalogue, arrangement-label, and employee-skill boundaries remain server-side. Arrangement labels remain descriptive only.

`.env.test` was parsed without sourcing a production environment file. Sanitized preflight confirmed PostgreSQL `127.0.0.1:5432`, database `scopeis_team_management_test`, a test-only name, `APP_ENV=test`, and fictional mock authentication. The committed harness verifies loopback server/client addresses, creates an owned unique temporary database, migrates it to State D, and drops it afterward.

| Command | Result |
| --- | --- |
| `node --input-type=module -e '…loadPhase1TestConfiguration…'` | Passed: test-only loopback target confirmed without printing credentials. |
| `npx vitest run test/unit/employee-policy.test.ts test/component/employee-directory.test.tsx` | Passed: 2 files, 5 tests. |
| `npm run test:phase2-core` | Passed: disposable PostgreSQL, 1 file, 6 tests; cleanup confirmed. |
| `npm run test:migration` | Passed: migration/schema validation, 1 file, 8 tests. |
| `node scripts/run-phase2-playwright.mjs` | Passed: 6 desktop/mobile tests, temporary safe build, random loopback port, and owned-database cleanup. |
| `npm run typecheck -- --incremental false` | Passed. |
| `npm run lint` | Passed with zero warnings. |
| `git diff --check` | Passed. |

An initial new core assertion incorrectly expected test-case isolation in a suite that intentionally accumulates fictional rows. It was corrected to prove the required inclusion and cross-scope exclusion; final integration/migration runs passed.

## Status and limits

Phase 2.2 is `COMPLETED` only as the basic backend-connected directory. Phase 2 remains `PARTIAL` at 2/11. Sub-phases 2.3–2.11 remain `NOT_STARTED`: no search, create, detail, edit, activation, assignment, self-service, or complete employee journey is claimed.

No Phase 2.3+ work, production access, production-environment sourcing, deployment, or persistent/shared-data mutation occurred.

Related evidence: [Phase 2.1 closure](SCOPEIS_PHASE_2_1_CUSTODY_RESOLUTION_VERIFIED_MAIN_CLOSURE_R1.md), [Phase 2.1 reconciliation](SCOPEIS_PHASE_2_1_PRESERVE_AND_RECONCILE_EXISTING_EMPLOYEE_BACKEND_R1.md), and [Phase 2 core R3](SCOPEIS_PHASE_2_CORE_SERVICE_INCIDENT_REMEDIATION_AND_VERIFICATION_CLOSURE_R3.md).
