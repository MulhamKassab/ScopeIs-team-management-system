# Credential Authentication Decisions

## Scope and status

This document records the confirmed decisions for
`SCOPEIS_EXISTING_USER_CREDENTIAL_AUTHENTICATION_R1`, a narrow credential-login
remediation that replaces the fictional-persona selection screen with a
username/email-and-password form and restores a usable Production sign-in path.

It is not a Phase 13 production-readiness certification and it does not begin
Phase 12 Ticket System work. The authentication mechanism changes; the
established authorization system does not.

## Root cause of the Production error

The deployed login page presented five fictional personas and submitted
`POST /api/auth/mock-login`. That route calls `beginMockSession`, which refuses
whenever mock authentication is unavailable. Production correctly keeps
`MOCK_AUTH_ENABLED=false`, and no alternative credential path existed, so the
only reachable sign-in path produced `Mock authentication is unavailable.` The
application therefore had no usable Production sign-in at all.

The remediation resolves this by adding a real credential layer over the
existing opaque server-session architecture and by making mock login impossible
in Production regardless of any flag.

## Confirmed decisions

### D1 — One authentication layer, unchanged authorization

Authentication proves identity only. Every request continues to resolve the
current role, active state, scope grants, and `session_version` from PostgreSQL
through the existing `foundationRepository` and authorization modules. No second
source of role or scope truth is introduced. Credential login cannot grant,
widen, or redefine any capability.

### D2 — Five existing users are preserved exactly

The five approved fictional users keep their existing primary keys, roles, scope
grants, and relationships:

| User ID | Username | Email | Role |
| --- | --- | --- | --- |
| `mock-super-admin-nora` | `nora` | `nora@example.test` | `SUPER_ADMIN` |
| `mock-admin-ava` | `ava` | `ava@example.test` | `ADMIN` |
| `mock-admin-ben` | `ben` | `ben@example.test` | `ADMIN` |
| `mock-employee-cora` | `cora` | `cora@example.test` | `EMPLOYEE` |
| `mock-employee-dan` | `dan` | `dan@example.test` | `EMPLOYEE` |

Credentials are attached to these rows. No replacement business user is
created, and no business record is duplicated.

### D3 — Additive `user_credentials` table

Migration `0012_existing_user_credential_authentication.sql` adds the
`password` value to the `authentication_mode` enum and creates `user_credentials`
with `user_id` as primary key and cascade-owned foreign key to `users.id`.
Normalized username and email carry unique indexes; conservative length and
format checks bound the columns; there is no plaintext-password column. The
migration is additive and non-destructive, and historical `mock` rows are not
rewritten.

### D4 — Versioned scrypt with a server-only pepper

Passwords use Node's built-in `crypto.scrypt` with a random 16-byte salt per
user, a versioned `scrypt$v1$32768$8$1$<salt>$<hash>` format, and bounded
parameters (`N=32768, r=8, p=1`, `maxmem=48 MiB`) compatible with the Vercel
runtime. Comparison uses `timingSafeEqual`. An HMAC-SHA256 pepper from the
server-only `AUTH_PASSWORD_PEPPER` is applied before key derivation.

`AUTH_PASSWORD_PEPPER` is required in Production with a minimum length of 32
characters; a missing or short pepper fails closed with a safe configuration
error. The pepper is never logged, audited, returned, or exposed to browser
code. Tests inject a deterministic fictional pepper through the isolated
disposable runner only.

Unknown identifiers still execute a dummy verification against a fixed
decoy digest so account-enumeration timing differences stay bounded. Password
strings are never compared directly.

### D5 — Temporary shared credential

All five accounts initially accept the temporary fictional demo password
supplied through the operator bootstrap input. It is treated as a temporary
demo credential and must be replaced before any real employee or operational
data is entered. It is never stored in plaintext in PostgreSQL, never committed
to source, and never written to logs, audit metadata, or user-facing
documentation.

### D6 — Opaque server sessions, password mode

Successful credential login creates the same kind of session the application
already used: a 32-byte cryptographically random token, of which only the
SHA-256 hash is stored; an `HttpOnly`, `SameSite=Lax`, host-only cookie that is
`Secure` in Production; bounded expiry from `SESSION_TTL_HOURS`; the current
`session_version`; and revocation through the existing logout flow.

`AuthenticatedActor.authenticationMode` and the database enum support both
`mock` and `password`. Mock mode stays test-only; new Production sessions are
`password`. The browser never receives role or scope authority that the server
subsequently trusts.

### D7 — Mock authentication is test-only

Mock login is allowed only when `APP_ENV` resolves to `test` or approved local
development, `MOCK_AUTH_ENABLED=true`, and Production has not been inferred from
Vercel or runtime state. In Production the mock route returns a neutral `404`
and setting `MOCK_AUTH_ENABLED=true` cannot override the prohibition. The
persona-selection UI no longer exists, so an existing mock session is not a path
back into Production.

### D8 — Persistent, database-backed brute-force protection

Failed attempts are counted on the credential row with a fifteen-minute window.
Five failures within the window lock the credential for fifteen minutes. A
successful login resets the counters. Row-level locking (`select ... for update`)
makes concurrent failures serialize, so the threshold cannot be bypassed by
parallel requests. Unknown identifiers follow a bounded generic path and do not
create attacker-controlled rows. Lock status is never disclosed publicly, and
the unknown-identifier, wrong-password, inactive, and locked cases all return the
same status and message.

### D9 — Identical public refusals, safe responses

Every credential failure returns `401` with
`The username/email or password is incorrect.` Responses never disclose whether
an identifier exists and never distinguish inactive, locked, and
incorrect-password cases. Responses carry
`Cache-Control: private, no-store, max-age=0` and
`X-Content-Type-Options: nosniff`, and never return password hashes, salts,
internal identifiers, roles, or scopes.

### D10 — Transactional session and audit

Session creation and its success audit event are written in one transaction. If
audit persistence fails, no session row commits and no usable cookie is
produced. Refusal counters commit before the public error is raised so a
throttled attacker cannot roll back their own failure count.

### D11 — Guarded one-time bootstrap

Credential bootstrap is an explicit operator script, never part of startup,
development, build, or deployment. It operates only on the five approved user
IDs, verifies all five exist with the expected roles before any change, refuses
identity or naming conflicts and partial initialization, hashes the temporary
password independently per user, writes all five credentials plus
`session_version` increments in one transaction, and is idempotent on re-run. It
records only a sanitized count, outcome, and the approved user IDs, and it
requires a Production confirmation guard and exact target verification.

### D12 — Audit events and safe rendering

The credential flow adds `auth.password_session.started`,
`auth.password_session.refused`, `auth.password_session.ended`, and
`auth.credentials.bootstrapped`. Audit metadata never includes password,
identifier input, email, username, hash, salt, pepper, token, or cookie.
Successful login records actor ID, authentication mode, and safe outcome.
Refusal metadata is limited to the bounded reason enum `invalid_credentials`,
`inactive`, or `locked`. The Phase 10 audit presentation allowlist renders only
those safe keys; unknown actions keep the generic safe fallback. Opening the
login page creates no audit event.

## Non-goals

No registration, social login, email verification, password-reset email,
self-service password change, admin credential-management UI, SSO, mobile
authentication, MFA, Phase 12 Ticket System work, production monitoring
rollout, Preview changes, prototype changes, or unrelated database cleanup.

## Remaining limitations

This completes a narrow credential-login foundation; it does not complete all
of Phase 13 production readiness. Backups, monitoring, external security
testing, user-managed password changes, password recovery, and controlled
real-user onboarding remain separate work.
