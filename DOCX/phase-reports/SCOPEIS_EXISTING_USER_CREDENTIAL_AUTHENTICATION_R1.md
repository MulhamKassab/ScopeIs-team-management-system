# ScopeIs Existing-User Credential Authentication Remediation (R1)

**Task ID:** `SCOPEIS_EXISTING_USER_CREDENTIAL_AUTHENTICATION_R1`

**Classification:** see the final section. Phase 12 was not started.

## Root cause

The deployed login page presented five selectable fictional personas and
submitted `POST /api/auth/mock-login`. That route calls `beginMockSession`,
which refuses whenever mock authentication is unavailable. Production keeps
`MOCK_AUTH_ENABLED=false` and infers Production from Vercel/runtime state, so the
only reachable sign-in path returned `Mock authentication is unavailable.` No
alternative credential login existed, leaving the deployed application with no
usable Production sign-in.

## Old mock-only flow

`/login` rendered a persona radio list and a "Continue with mock persona"
button. The POST created an opaque mock session from a fixed persona ID. There
was no password, no credential store, and no Production-safe identity path.

## New credential flow

- `/login` renders an accessible `Sign in` form with `Username or email` and
  `Password` fields, a show/hide control, a pending state, and a generic
  error/safe-configuration message. It discloses no accounts, roles, or scopes,
  and an already-authenticated user is redirected to `/dashboard`.
- `POST /api/auth/login` accepts a strict `{ identifier, password }` body,
  enforces same-origin, bounds input before any expensive work, and returns only
  a safe redirect target on success.
- Users sign in with either username or email, trimmed and case-insensitive.
  Password matching is case-sensitive.
- Successful login creates the same opaque server session the application
  already used, now with `authentication_mode = password`.

## Account mapping

The five existing users are preserved exactly by ID. The approved temporary
password is supplied only through the operator bootstrap input and is not
reproduced here beyond the explicitly approved operator section:

| User ID | Username | Email | Role | Temporary password |
| --- | --- | --- | --- | --- |
| `mock-super-admin-nora` | `nora` | `nora@example.test` | `SUPER_ADMIN` | `user1234` |
| `mock-admin-ava` | `ava` | `ava@example.test` | `ADMIN` | `user1234` |
| `mock-admin-ben` | `ben` | `ben@example.test` | `ADMIN` | `user1234` |
| `mock-employee-cora` | `cora` | `cora@example.test` | `EMPLOYEE` | `user1234` |
| `mock-employee-dan` | `dan` | `dan@example.test` | `EMPLOYEE` | `user1234` |

This shared password is a temporary fictional/demo credential. **It must be
replaced before any real employee or operational data is entered.** It is never
stored in plaintext in PostgreSQL, never committed to source, and never written
to logs, audit metadata, or end-user documentation.

## Hash and pepper design

Node's built-in `crypto.scrypt` is used with a random 16-byte salt per user and
the versioned format `scrypt$v1$32768$8$1$<salt>$<hash>` (`N=32768, r=8, p=1`,
`maxmem=48 MiB`). An HMAC-SHA256 pepper from the server-only
`AUTH_PASSWORD_PEPPER` is applied before derivation. Comparison uses
`timingSafeEqual`. A missing or short Production pepper fails closed with a safe
configuration error. Unknown identifiers run a dummy verification against a
decoy digest to bound enumeration timing.

## Session design

A 32-byte random token is issued; only its SHA-256 hash is stored. The cookie is
`HttpOnly`, `SameSite=Lax`, host-only, and `Secure` in Production, with bounded
expiry from `SESSION_TTL_HOURS`. Logout revokes the session through the existing
flow. Role, active state, and grants are re-read from PostgreSQL on every
protected request, so revocation, demotion, deactivation, and session-version
changes take effect immediately. The browser never receives authority the
server later trusts.

## Brute-force protection

Persistent, database-backed throttling on the credential row: a bounded
failure window, lock after five failures within fifteen minutes, a fifteen-minute
lock, and reset on success. Row-level locking makes concurrent failures
serialize so the threshold cannot be bypassed. Unknown identifiers follow a
bounded generic path and create no attacker-controlled rows. Lock status is
never disclosed publicly.

## Mock-auth Production prohibition

Mock login is allowed only when `APP_ENV` resolves to `test` or approved local
development, `MOCK_AUTH_ENABLED=true`, and Production has not been inferred from
Vercel/runtime state. In Production, `/api/auth/mock-login` returns a neutral
`404`, and setting `MOCK_AUTH_ENABLED=true` cannot override the prohibition. The
persona-selection UI is removed, and existing mock sessions are not a path back
into Production.

## Role and scope preservation

Authentication proves identity only; authorization is untouched. Nora remains
Super Admin globally, Ava remains Admin for Team Alpha only, Ben remains Admin
for Team Bravo only, and Cora and Dan remain self-only Employees. Every
downstream boundary (management notes, evidence, reporting, schedule, leave,
coverage, audit, export) keeps its existing behavior because the credential layer
resolves the same actor through the same repository and policy code.

## Migration details and final schema

`0012_existing_user_credential_authentication.sql` is additive: it adds the
`password` value to the `authentication_mode` enum and creates the
`user_credentials` table (`user_id` primary key and cascade-owned foreign key to
`users.id`, capitalized username/email columns with unique normalized indexes,
`password_hash`, and throttle columns). Final schema: 33 public tables; migration
ledger and journal both advance to 13 rows/migrations. Historical `mock` rows are
not rewritten.

## Environment variables (names and configured state only)

| Variable | Production state |
| --- | --- |
| `DATABASE_URL` | configured (server-only) |
| `APP_ENV` | configured (`production`) |
| `MOCK_AUTH_ENABLED` | configured (`false`) |
| `SESSION_TTL_HOURS` | configured |
| `AUTH_PASSWORD_PEPPER` | added as a Production secret during cutover |
| `SCOPEIS_E2E_TEST` | intentionally absent |

Values are never printed.

## Local gate results

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run test:unit` | PASS (17 files, 85 tests) |
| `npm run test:component` | PASS (14 files, 50 tests) |
| `npm run test:integration` | PASS (12/12 suites, credential suite 20 tests) |
| Phase 2–11 focused service runners | PASS |
| Credential service runner | PASS (20/20 tests) |
| `npm run test:migration` | PASS (8/8) |
| `npm run test:route-certification` | PASS (16/16) |
| `npm run test:seed-smoke` | PASS |
| `npm run test:isolation` | PASS (9/9) |
| `npm run test:system-smoke` | PASS |
| `npm run test:e2e` | PASS (12/12 suites) |
| Credential E2E | PASS (desktop + mobile) |
| `npm run test:phase11-e2e` | PASS (6/6) |
| `npm run test:system-concurrency` | PASS (21/21 runs) |
| `npm run lint` | PASS |
| `npm run build:safe` | PASS |
| `git diff --check` / `--cached --check` | PASS |
| `npm run test:system-lock` | see the delivery receipt |

## Local verification specifics

Unit tests cover identifier normalization, username/email matching,
case-insensitive identifiers with case-sensitive passwords, scrypt creation and
verification, unique salts producing different stored hashes, wrong-password
refusal, dummy verification for unknown identifiers, missing Production pepper,
input bounds, Production mock-auth prohibition, session TTL, generic error
mapping, and safe audit projection. Component tests cover the database-free login
form: labels, autocomplete, the accessible show/hide control, submit/pending
state, generic error, Enter-key submission, absence of persona/role/scope/mock
copy, and no `@/db/client` import.

Integration tests use a fresh disposable loopback PostgreSQL database and prove
all five accounts log in by username and by email, the temporary password is
accepted, wrong-password refusal creates no session, unknown-username and
wrong-password responses are identical, an inactive user receives the same public
response, five failures trigger the lock, lock expiration works with a controlled
clock, concurrent failures cannot bypass the threshold, a successful login resets
failure state, password hashes and salts differ per user, no plaintext password
is stored, audit failure rolls back session creation, bootstrap failure rolls back
all writes, bootstrap is idempotent, the role/scope matrix is unchanged, and
revocation, demotion, deactivation, and stale-session handling still work.

## Rollback procedure

1. Roll back the Vercel deployment to the previous commit.
2. Remove the `AUTH_PASSWORD_PEPPER` Production secret if the previous deployment
   did not use it.
3. Leave the additive migration in place; `user_credentials` and the added enum
   value are inert for the previous code path. Drop the table only under a
   separately approved destructive change.
4. Restore the pre-cutover database from the recorded recovery point if any data
   state requires it.

## Starting and final SHAs

- Starting HEAD: `e3e2c2643255de7445c5ad80d82e8baa178e6a0e` (`docs: record
  pre-Phase12 hardening final SHA`), `main...origin/main` at `0/0`.
- Final implementation SHA: `1b7e47fa8c5758da4f17138218de76457c0654ce`
  (`feat: add credential authentication for existing users`), pushed to
  `origin/main`; `main...origin/main` returned to `0/0`.
- This report's receipt commit is recorded at the end of this section.

## Exact committed files

60 files, committed in one commit.

Source:

- `src/app/(auth)/login/login-screen.tsx`, `src/app/api/auth/login/route.ts`,
  `src/app/api/auth/mock-login/route.ts`
- `src/modules/auth/{credential-bootstrap,credential-repository,credential-service,credential-validation,password,session-record,session-service}.ts`
- `src/modules/audit/presentation.ts`, `src/server/env.ts`, `src/server/http.ts`,
  `src/shared/errors/app-error.ts`, `src/shared/types/foundation.ts`
- `src/db/schema/index.ts`, `src/db/migrations/0012_existing_user_credential_authentication.sql`,
  `src/db/migrations/meta/_journal.json`, `src/db/migrations/meta/adoption-fingerprints.json`

Scripts and harness:

- `scripts/bootstrap-existing-user-credentials.ts`
- `scripts/disposable-test-database.mjs`, `scripts/phase1-test-environment.mjs`,
  `scripts/phase2-migration-core.mjs`, `scripts/run-phase2-safe-build.mjs`
- `scripts/run-aggregate-integration-tests.mjs`, `scripts/run-aggregate-e2e-tests.mjs`
- `scripts/run-credential-service-tests.mjs`, `scripts/run-credential-e2e.mjs`,
  `playwright.credential.config.ts`

Tests:

- `test/unit/credential-authentication.test.ts`, `test/unit/environment-guard.test.ts`,
  `test/unit/mock-auth-boundaries.test.ts`
- `test/component/credential-login.test.tsx`
- `test/integration/credential-authentication.test.ts`
- `test/migration/phase2-database-foundation.test.ts`
- `test/route-certification/phase1-http.test.ts`
- `test/e2e/credential-login.spec.ts`, `test/e2e/sign-in.ts`, and the Phase 1–11
  `test/e2e/*.spec.ts` files that now sign in through the credential form
- `test/system-lock/scenario-manifest.json`

Documentation:

- `README.md`, `DOCX/INDEX.md`
- `DOCX/project-memory/CREDENTIAL_AUTHENTICATION_DECISIONS.md`
- `DOCX/project-memory/{DECISIONS_AND_CONSTRAINTS,IMPLEMENTATION_ROADMAP,IMPLEMENTATION_STATUS_LOG,IMPLEMENTATION_STATUS_TRACKER,ROLE_AND_PERMISSION_MODEL,SYSTEM_WIDE_TEST_SCENARIO_CATALOG}.md`
- `DOCX/phase-reports/SCOPEIS_EXISTING_USER_CREDENTIAL_AUTHENTICATION_R1.md`

`.env*`, `prototype/full-frontend-r1/`, `scripts/remediate-r2-persistent-test-incident.mjs`,
and the Preview worktree were excluded.

## Push result

`git push origin main` succeeded after switching the active GitHub CLI account from
`m-kassab` (403 on the `MulhamKassab` repository) to `MulhamKassab`. `main` and
`origin/main` both resolve to `1b7e47fa8c5758da4f17138218de76457c0654ce` (`0/0`).
The Preview worktree remained at `7c401c6`; the prototype and the historical
remediation script remained untracked and untouched.

## Delivery receipt and Production status

**Status: `SCOPEIS_CREDENTIAL_AUTH_BLOCKED`.**

What completed and was verified:

- All local gates above passed on the committed tree, including two consecutive
  `npm run test:system-lock` runs, each GREEN at 14/14 steps.
- The commit was pushed; Vercel's Git integration auto-deployed `main` to
  Production at `https://scopeis-team-management-system.vercel.app` (deployment
  `dpl_GJUPUUJRWNQSyhYzbKB2aSVruWz4`, created 2026-09-18 09:27 GST).
- The deployed login page renders the credential form (`Sign in`,
  `Username or email`) with no persona list.
- `POST /api/auth/mock-login` returns `404` in Production regardless of the flag.
- `POST /api/auth/login` returns the safe no-store/nosniff response (currently
  `503 AUTH_UNAVAILABLE`, because `AUTH_PASSWORD_PEPPER` is not yet configured).

Why Production login is not yet functional, and why the remaining Production
mutation was stopped:

1. `AUTH_PASSWORD_PEPPER` is not configured in the Vercel Production
   environment, so the credential service fails closed with `503`.
2. Migration `0012_existing_user_credential_authentication.sql` has not been
   confirmed applied to the Production database, and no `user_credentials`
   bootstrap has run.
3. The Production `DATABASE_URL` is a write-only Vercel Secret. It cannot be
   materialized locally (`vercel env pull` writes `[SENSITIVE]`; `vercel env run`
   reports the secret cannot be pulled), and no Neon CLI credential, API key, or
   `.pgpass` is available. There is therefore no verified path to confirm the
   Production target identity, current migration state, or an appropriate
   backup/recovery point, and no way to run the guarded migration and bootstrap.

Because target identity, migration state, and recovery-point evidence are
unconfirmed, Production mutation was stopped per the remediation's own gate. The
remaining cutover steps are exactly:

1. Confirm the Neon/PostgreSQL target identity and a verified recovery point.
2. Add `AUTH_PASSWORD_PEPPER` (32+ random bytes) as a Vercel Production secret.
3. Apply `0012_existing_user_credential_authentication.sql` once via the guarded
   migration CLI and confirm State D at 13 ledger rows.
4. Run `scripts/bootstrap-existing-user-credentials.ts` once with the approved
   temporary password, the Production confirmation guard, and the exact target
   verification; confirm five credential rows with five distinct non-plaintext
   hashes.
5. Redeploy so the new environment takes effect, then verify all five accounts
   through the deployed login, each role/scope boundary, mock-login unavailability,
   logout/session invalidation, and no secret or password in Vercel logs.

## Remaining limitations

This completes a narrow credential-login foundation; it does not complete all
of Phase 13 production readiness. Backups, monitoring, external security
testing, user-managed password changes, password recovery, and controlled
real-user onboarding remain separate work. Password reset, self-service password
change, MFA, SSO, and social login are explicit non-goals of this remediation.
