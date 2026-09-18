# ScopeIs Super Admin Account and Credential Management (R1)

**Task ID:** `SCOPEIS_SUPER_ADMIN_ACCOUNT_AND_CREDENTIAL_MANAGEMENT_R1`

**Classification:** see the final section. Phase 12 was not started.

## Super Admin-only policy

Only a currently active `SUPER_ADMIN` may administer accounts. The rule is
enforced independently at four layers: the navigation entry, the `/accounts`
page, the account-administration service, and each Server Action. Every mutation
re-reads the acting user from PostgreSQL inside its transaction, and every read
re-reads current role/active state, so a stale or demoted session cannot act.
Scoped Admins, Employees, inactive actors, demoted stale sessions, and anonymous
callers receive a non-enumerating `404` (or a login redirect for anonymous
callers). Client-side visibility is never the boundary.

| Actor | Account list | Create account | Enable credentials | Reset password | View hashes/passwords |
| --- | ---: | ---: | ---: | ---: | ---: |
| Active Super Admin | Yes | Yes | Yes | Yes | Never |
| Scoped Admin | 404 | No | No | No | Never |
| Employee | 404 | No | No | No | Never |
| Inactive actor | 404/unauthenticated | No | No | No | Never |
| Demoted stale session | 404 | No | No | No | Never |
| Anonymous caller | Redirect/login | No | No | No | Never |

## Why existing passwords cannot be viewed, and the safe reset alternative

Passwords are stored as one-way scrypt hashes with a per-user random salt and a
server-only pepper, so the original password is not recoverable. There is no
plaintext column, no reversible encryption, no decryption key, no endpoint that
returns a password or hash, no password in reports/exports, no password in the
UI, and no password in logs or audit metadata. The account UI states:
**Passwords cannot be viewed. Set a temporary password if the user needs new
credentials.** A Super Admin sets a known temporary password that is hashed
immediately and can never be retrieved afterward.

## Account-creation transaction

`createAccount` runs one transaction that (1) re-reads and re-validates the
acting Super Admin, (2) takes an advisory lock on the normalized identity,
(3) verifies username/email uniqueness, (4) allocates the employee code through
the existing locked sequence, (5) inserts `users`, (6) inserts
`employee_profiles`, (7) inserts the hashed `user_credentials` row, and (8)
writes a safe `auth.account.created` event. If any step fails, nothing remains.
The user ID and employee code are server-generated; no client input controls
them. New accounts are active by default and receive no automatic scope grant,
so creating an Admin implies no Team/Client/Project/Location access. Creating a
Super Admin requires an explicit confirmation checkbox. Duplicate username/email
returns an actionable, non-leaking error.

## Existing-workforce credential enablement

`enableCredentials` targets an existing `users` row that has no credentials. It
refuses (neutral conflict) when a credential already exists, never overwrites the
work email, leaves the target's role and active state unchanged, and writes the
credential insert, the `session_version` increment, and a safe
`auth.credentials.enabled` event in one transaction.

## Password-reset transaction

`resetPassword` runs one transaction that (1) re-reads the acting Super Admin,
(2) locks the target user and credential row, (3) enforces optimistic
concurrency on the credential `version`, (4) requires the acting password for
self-reset and for resetting another Super Admin (and explicit confirmation for
the latter), (5) hashes the new password with a fresh random salt, (6) updates
`password_hash` and `password_changed_at`, (7) sets `must_change_password`,
(8) clears `failed_attempt_count`, `failure_window_started_at`, and
`locked_until` (clearing the lock), (9) increments the credential `version`,
(10) increments the target's `session_version`, (11) revokes all of the target's
active sessions, and (12) writes a single safe `auth.password.reset` event. The
affected user must use the new password on the next login, and the password is
never returned, echoed, stored in Server Action state, or placed in a URL.

## Required-password-change journey

`must_change_password` is enforced from PostgreSQL in the protected layout on
every request: a flagged user authenticates but is redirected to
`/account/change-password` and may only change their password or log out. The
page is self-only — the subject is always the session actor, so a Super Admin
cannot use it to view or change another user's password. A successful change
creates a new salted hash, clears the flag, clears lock state, increments the
credential version, invalidates other sessions, rotates the current session
under the new credential version, and writes a content-free `auth.password.changed`
event.

## Session revocation and last-Super-Admin protection

Credential and authority changes revoke sessions: password reset/change revoke
all target sessions and bump `session_version`; role changes and deactivation
continue to use the existing employee-management services, which already revoke
sessions. Deactivation blocks login even with the correct password; reactivation
never changes or reveals the password; role changes never inherit Admin scope;
and the last active Super Admin cannot be demoted or deactivated.

## Privacy exclusions and audit allowlist

The account repository uses an explicit safe column list and never selects
`password_hash`. New allowlisted actions are `auth.account.created`,
`auth.credentials.enabled`, `auth.password.reset`, and `auth.password.changed`,
with metadata limited to target user ID, outcome, resulting role,
`sessionsRevoked`, `mustChangePassword`, credential version, and whether sign-in
was enabled. Usernames, emails, passwords, password length, hashes, salts,
peppers, cookies, tokens, request bodies, raw rows, and stacks are never
recorded. Viewing `/accounts` writes no audit event, and unknown actions keep the
generic safe fallback.

## Migration details

Additive `0013_super_admin_account_management.sql` adds
`must_change_password boolean NOT NULL DEFAULT false` and `version integer NOT
NULL DEFAULT 1` with a `version > 0` check to `user_credentials`, and `version`
provides optimistic concurrency. Final schema: 33 public tables; migration
ledger and journal advance to 14 rows/migrations. `0013` is applied only after
`0012`.

## Local gate results

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run test:unit` | PASS (18 files, 97 tests) |
| `npm run test:component` | PASS (15 files, 59 tests) |
| `npm run test:integration` | PASS (13/13 suites; account 22 tests, credential 20 tests) |
| Phase 2–11 focused service runners | PASS |
| Credential-authentication service runner | PASS (20/20) |
| Account-administration service runner | PASS (22/22) |
| `npm run test:migration` | PASS (8/8) |
| `npm run test:route-certification` | PASS (18/18) |
| `npm run test:seed-smoke` | PASS |
| `npm run test:isolation` | PASS (9/9) |
| `npm run test:system-smoke` | PASS |
| `npm run test:e2e` | PASS (13/13 suites) |
| Credential-authentication E2E | PASS (desktop + mobile) |
| Account-administration E2E | PASS (desktop + mobile) |
| `npm run test:phase11-e2e` | PASS (6/6) |
| `npm run test:system-concurrency` | PASS (21/21 runs) |
| `npm run lint` | PASS |
| `npm run build:safe` | PASS |
| `git diff --check` / `--cached --check` | PASS |
| `npm run test:system-lock` (twice) | see the delivery receipt |

## Exact committed files

Recorded in the delivery receipt at the end of this document.

## Production blocker or cutover receipt

**Production remains `BLOCKED`, matching the credential remediation.** The
Production `DATABASE_URL` is a write-only Vercel Secret with no reachable Neon
CLI, API key, or `.pgpass`, so the Production target identity, current migration
ledger, and an appropriate recovery point cannot be independently verified; and
`AUTH_PASSWORD_PEPPER` is still unset. Per the task's own gate, no Production
migration, bootstrap, or deployment was performed, and the deployed application
continues to return a safe `503 AUTH_UNAVAILABLE` on credential login. The exact
remaining cutover steps are: establish a recovery point; confirm Production is at
migration state `0011`; apply `0012` then `0013`; add `AUTH_PASSWORD_PEPPER`
(32+ random bytes) as a Vercel Production secret; run the guarded five-user
credential bootstrap; verify five credential rows by safe counts; deploy the new
commit; verify the five accounts, role/scope boundaries, `/accounts`, password
reset, session revocation, the change-password journey, Admin/Employee `404` on
`/accounts`, mock-login `404`, and sanitized logs.

## Starting and final SHAs

- Starting HEAD: `54e9432adb2c97bb43695d881dbec134cb894d33` (`docs: record
  credential auth R1 delivery and blocked production cutover`), `main...origin/main`
  at `0/0`.
- Final SHA and commit are recorded in the delivery receipt below.

## Push result

Recorded in the delivery receipt below.

## Remaining limitations

This adds Super Admin account and credential administration; it does not
complete Phase 13. There is no self-service forgot-password flow, no email
delivery, no MFA, and no approval workflow for high-risk actions. Backups,
monitoring, external security testing, password recovery, and controlled
real-user onboarding remain separate work.
