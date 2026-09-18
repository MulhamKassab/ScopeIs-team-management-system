# Super Admin Account and Credential Management Decisions

## Scope and status

This document records the confirmed decisions for
`SCOPEIS_SUPER_ADMIN_ACCOUNT_AND_CREDENTIAL_MANAGEMENT_R1`, which adds a
Super Admin-only account-administration journey on top of the existing
credential-login foundation.

It does not replace the credential architecture, does not begin Phase 12, and
does not complete Phase 13. Production mutation remains gated on verified target,
migration, and recovery evidence plus a configured password pepper.

## Confirmed decisions

### AC1 — Existing passwords can never be viewed

The application stores one-way scrypt password hashes and therefore cannot
recover any existing password. There is no plaintext column, no reversible
encryption, no decryption key, no endpoint that returns a password or hash, no
password column in reports or exports, no password in the Super Admin UI, no
password logging or audit metadata, and no "show existing password" feature.

The account-management UI states: **Passwords cannot be viewed. Set a temporary
password if the user needs new credentials.** A Super Admin may set a known
temporary password; it is hashed immediately and can never be retrieved
afterward.

### AC2 — Super Admin-only, enforced independently at every layer

Only a currently active `SUPER_ADMIN` may administer accounts. The navigation
entry, the `/accounts` page, the service, and every Server Action each enforce
the rule independently, and the acting user is re-read from PostgreSQL inside
every mutation transaction and on every read. A scoped Admin, an Employee, an
inactive actor, a demoted stale session, and an anonymous caller all receive a
non-enumerating refusal. Client-side visibility is never the boundary.

### AC3 — Create an account and its workforce profile atomically

The account-creation flow creates the `users` row, the `employee_profiles` row
(with a server-allocated employee code from the existing locked sequence), the
`user_credentials` row, and a safe audit event in one transaction. The user ID
and employee code are generated server-side; no client input can choose them.
The default role is Employee; creating a Super Admin requires an explicit
confirmation checkbox. New accounts are active by default and receive no
automatic scope grant, so creating an Admin does not imply Team, Client,
Project, or Location access. If any step or the audit write fails, none of the
records remain.

### AC4 — Enable sign-in for an existing workforce record

A workforce record created without login access can later have sign-in enabled.
The target must exist and must not already have credentials; a record that
already has credentials receives a neutral conflict response, and its work
email is never silently overwritten. Credential insertion, the session-version
increment, and the audit event are one transaction.

### AC5 — Password reset is a full credential rotation

A reset hashes the new temporary password with a fresh random salt, updates
`password_hash` and `password_changed_at`, sets `must_change_password` from the
form, clears `failed_attempt_count`/`failure_window_started_at`/`locked_until`
(clearing an account lock), increments the acting user's `session_version`,
revokes every active session belonging to the target, and writes one safe audit
event — atomically. The affected user must use the new password on the next
login. The password never appears in audit metadata, logs, Server Action state,
URLs, notifications, browser storage, errors, reports, or exports.

### AC6 — Required password change before entering the application

`must_change_password` is enforced from PostgreSQL in the protected layout on
every request. When set, the user authenticates successfully but is redirected
to `/account/change-password` and may only change their password or log out.
The page is self-only: the subject is always the session actor, so a Super
Admin cannot use it to view or change another user's password. A successful
change creates a new salted hash, clears the flag, clears lock state, increments
the credential version, invalidates other sessions, and rotates the current
session under the new credential version, with a content-free audit event.

### AC7 — Password rules

For this controlled internal version: minimum 8 and maximum 128 characters, at
least one letter and one number, no whitespace-only values, and the password may
not equal the username or the login email. A self-change must differ from the
current password. `user1234` satisfies the temporary-password rule. No arbitrary
symbol or mixed-case rule is added. Validation input is never logged.

### AC8 — High-risk self and Super Admin actions

Administrative self-reset and resetting another Super Admin both require the
acting Super Admin's current password; only resetting another Super Admin
additionally requires explicit confirmation in the form. A successful self-reset
rotates the session so no session survives under the old credential version.
No approval workflow or MFA is implemented in this task; both are recorded as
limitations.

### AC9 — Status changes reuse the existing policy

Activation, deactivation, and role changes continue to use the existing
employee-management services. Deactivation revokes sessions and blocks login
even with a correct password; reactivation does not change or reveal the
password; role changes revoke sessions and never inherit Admin scope; the last
active Super Admin cannot be demoted or deactivated. A password reset never
activates an inactive account and never changes role or scope.

### AC10 — Safe projections only

The account repository uses an explicit safe column list and never selects
`password_hash`. The table and its projection expose only display name, employee
code, username, login email, system role, active status, credential status,
password-changed timestamp, lock status, the password-change requirement,
creation date, and safe management actions. No hash, salt, pepper, session
token, session-token hash, raw login attempt, cookie, or raw audit metadata is
selected, returned, rendered, or serialized.

### AC11 — Migration

Additive migration `0013_super_admin_account_management.sql` adds
`must_change_password boolean NOT NULL DEFAULT false` and `version integer NOT
NULL DEFAULT 1` (with a `version > 0` check) to `user_credentials`, and the
`version` column provides optimistic concurrency for credential-management
forms. The migration is applied only after `0012`; it never runs against an
unidentified database.

### AC12 — Audit allowlist

New allowlisted actions: `auth.account.created`, `auth.credentials.enabled`,
`auth.password.reset`, and `auth.password.changed`. Safe metadata may contain
only the target user ID, result/outcome, resulting role, `sessionsRevoked`
count, `mustChangePassword`, credential version, and whether sign-in was
enabled. Usernames, emails, passwords, password length, hashes, salts, peppers,
cookies, tokens, request bodies, raw database rows, and failure stacks are never
recorded. Viewing `/accounts` writes no audit event. Unknown actions keep the
generic safe fallback.

## Non-goals

No password viewing or recovery, reversible password storage, bulk password
export, CSV account export, Admin or Employee access to account administration,
open registration, invitation email, password-reset email, social login,
MFA, SSO, Phase 12 Ticket System work, general Phase 13 rollout, production
monitoring, or changes to the Preview worktree or prototype.

## Remaining limitations

Production account management will not function until the Production migration
sequence (`0012` then `0013`) is applied to a verified target and
`AUTH_PASSWORD_PEPPER` is configured. There is no self-service forgot-password
flow, no email delivery, no MFA, and no approval workflow for high-risk actions.
Backups, monitoring, external security testing, and controlled real-user
onboarding remain separate Phase 13 work.
