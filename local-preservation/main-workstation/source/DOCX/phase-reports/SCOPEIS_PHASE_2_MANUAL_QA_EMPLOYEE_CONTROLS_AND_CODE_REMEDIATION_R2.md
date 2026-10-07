# Phase 2 manual-QA employee controls and code remediation R2

## Classification

`COMPLETED` — this R2 remediation corrected a real Phase 2 manual-QA product/discoverability defect and an employee-code creation defect. Phase 2 remains `COMPLETED` at 11/11 only because the corrected visible desktop/mobile journeys and all applicable safe verification passed. Phase 3 remains `NOT_STARTED`.

## Custody and scope

Work began on local `main` at `9150c37c0f8c4630498db89f31f94bafdf9e9734`, matching `origin/main` with ahead/behind `0/0` and nothing staged. Seventeen pre-existing user-owned entries were preserved and excluded: `README.md`, `package.json`, `playwright.config.ts`, `src/app/(protected)/[module]/page.tsx`, `src/app/api/auth/mock-login/route.ts`, `src/db/seed/index.ts`, `src/modules/auth/session-service.ts`, `src/server/http.ts`, `test/e2e/foundation.spec.ts`, `test/integration/foundation-postgres.test.ts`, `scripts/remediate-r2-persistent-test-incident.mjs`, `scripts/run-phase1-integration-tests.mjs`, `scripts/run-phase1-playwright.mjs`, `scripts/run-phase1-route-certification.mjs`, `scripts/run-phase1-safe-build.mjs`, `scripts/start-phase1-test-server.mjs`, and `test/route-certification/`.

No reset, clean, restore, stash, rebase, merge, force-push, production access, deployment, persistent/shared test data, or non-test environment-file loading occurred. The committed safe runners were used for every build/manual environment.

## Root cause and correction

The missing Super Admin functionality was not an authorization failure: the protected detail route already resolved Nora as `SUPER_ADMIN`, passed the real management panel/actions, and the server actions/services enforced the required protections. The only directory entry was an unlabelled employee-name link, however, and the management panel rendered several dense, unlabelled form groups. In manual QA this made the controls effectively undiscoverable. The directory now has a dedicated, labelled `Manage employee` action for Super Admin (and `View details` for read-only Admin), and the detail panel has visible named sections for basic edit, assignments, role, lifecycle, and Admin TEAM scope.

Employee code was a real contract defect: the create form, Server Action, validation contract, and service previously accepted a caller-supplied code. The form no longer contains an employee-code input. Strict form/service validation rejects crafted code fields; the management basic update contract also rejects employee-code changes.

## Server-only employee-code allocation

Migration `0003_phase_2_employee_code_sequence.sql` adds one singleton counter row. In the same PostgreSQL transaction as user/profile/audit persistence, an atomic bounded `UPDATE ... RETURNING` advances that counter. The returned number is padded to four characters, starting at `0001`; preserved numeric legacy collisions are consumed and skipped without altering existing records. The counter does not roll forward on an audit-triggered rollback, deactivated codes are never reused, and allocation fails with `EMPLOYEE_CODE_CAPACITY` once the next value would exceed `9999`. The existing unique employee-code constraint remains in force. This is deliberately only the authorized prototype policy, not a configurable numbering system.

## Authorization, privacy, and lifecycle evidence

- Nora Albright, Super Admin, receives global management data and visible forms wired to the existing server actions for basic edit, role, designation, manager, team, informational working pattern, explicit Admin TEAM grants/revocation, and deactivate/reactivate.
- Ava Mercer, Admin with `team:alpha`, remains read-only: only active explicit TEAM grants control access; the directory/details do not disclose work email, work phone, or default work location, and no management controls/actions are authorized.
- Manager assignment, designation, employee team, working pattern, and role do not confer Admin scope. The browser flow promotes an employee to Admin, then creates an explicit scope separately.
- Cora Bell, Employee, receives the real PostgreSQL-backed `/profile` form with only work email, work phone, professional summary, and Save profile. Cross-user and protected-field mutation boundaries remain server-enforced.
- No hard deletion was introduced. The visible lifecycle wording explicitly directs Super Admins to deactivate rather than permanently delete; existing final-active-Super-Admin, self-action, audit, transaction, optimistic-version, session-revocation, and manager-cycle safeguards remain in effect.

## Migration decision

One additive migration was necessary for a transaction-safe global counter. Immutable migration SHA-256 values were preserved:

- `0000_phase_1_foundation.sql`: `cd7965d9b11f756075d76c0a9ef2adb4159827391224233cc143b05dfbe22e34`
- `0001_phase_2_employee_capabilities.sql`: `d0dc109b1cca66b727ea2843186559c1b9e0f802ad001d8013322f6a2beddd60`
- `0002_phase_2_employee_management_journey.sql`: `11913dffe54013a53021896f7c57d7357cbab8cf12e674ae86366bddd039c62c`
- `0003_phase_2_employee_code_sequence.sql`: `fac18923754fb6f8049a69356749770280722d272a1b83bc42d313ccaf3b2be9`

The migration journal, adoption manifest, runtime Drizzle schema, and clean/upgrade fingerprint were reconciled. The final four-migration schema fingerprint is `1525b8ec70092611d31189cf91a1c65b4cdfc6ee76c39e701c9ceef7a485f307`.

## Verification and safety evidence

All database commands used the repository harness, which requires `APP_ENV=test`, loopback PostgreSQL, a test-only database, and a uniquely named owned database that it drops after use; no credentials or connection strings were printed.

| Command | Result |
| --- | --- |
| `npm run test:phase2-core` | Passed: 13 disposable PostgreSQL service tests, including first code, collision/concurrency, non-reuse, capacity, audit rollback, stale writes, lifecycle, sessions, and manager-cycle protection. |
| `npm run test:migration` | Passed: 8 disposable migration clean/install/upgrade/adoption/drift tests. |
| `npm run test:component` | Passed: 3 files, 9 tests. |
| `npm run test:unit` | Passed: 8 files, 29 tests. |
| `node scripts/run-phase2-playwright.mjs` | Passed: 20 tests across desktop and mobile. It exercised Super Admin create/no-code, visible manage entry, basic edit, assignments, role, explicit scope, deactivate/reactivate, Admin privacy/scope, and Employee profile update. |
| `node scripts/run-phase2-safe-build.mjs` | Passed: its isolated temporary copy contained no `.env*`; isolated typecheck and production build passed and cleaned up. |
| `node scripts/run-phase2-manual-qa.mjs --smoke` | Passed: an owned seeded manual-QA database served a random loopback URL; Super Admin directory/detail controls and Cora profile form loaded. |

`npm run lint` and `git diff --check` are recorded with the final closure verification after documentation updates.

## Desktop/mobile manual-QA equivalent

The required disposable browser automation exercised the user-visible journey at desktop and mobile viewports. It used the same fictional personas printed by the supported manual launcher: Nora Albright (Super Admin), Ava Mercer (`team:alpha` Admin), and Cora Bell (Employee). The launcher itself remains the operator command:

```bash
node scripts/run-phase2-manual-qa.mjs
```

It prints a random `127.0.0.1` URL and persona choices at `/login`; Ctrl+C terminates the application and drops only its owned database.

## Limitations

This remediation does not create a configurable numbering policy, hard deletion, a public employee API, authorization derived from management relationships, or any Phase 3/later employee features. Working pattern remains descriptive only.
