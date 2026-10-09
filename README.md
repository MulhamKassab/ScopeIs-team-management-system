# ScopeIs Team Management System

The latest Company ticket amendment is implemented and locally verified: all active authenticated company users can create without workspace enrollment, choose multiple assignees and mention/include any active company person. Creators manage participants; assignees work and included observers read only and receive an in-app notification. Published dashboard routing is company-wide, while ticket contents remain private to authorized participation/management. Workspace → Dashboards → Tickets reuses existing ticket-board containers with no migration; container supervision retains existing manager scope/membership. [The amendment report](DOCX/phase-reports/SCOPEIS_COMPANY_TICKET_COLLABORATION_AMENDMENT_2026_10_09.md) records 106 passing affected cases, desktop/phone evidence and pending source/production delivery; the earlier release evidence below does not certify this change.

Responsive internal workforce-planning application covering the secure foundation, employee management, clients/projects/locations, scheduling Draft → Proposed → Published V1, annual leave, controlled skills with non-blocking warnings, coverage/replacement, the management-only static planning map, capability evidence with private files, collaboration and governance, and role-and-scope dashboards, reports and bounded CSV exports. The live tracker retains Phase 4 as `PARTIAL` for retained-history assignment omission/removal; other completed journeys are bounded verification claims.

The header's **Find a feature** search exposes each role's delivered tools through tasks such as CVs, staffing and exports. Dashboard shortcuts connect daily work to the appropriate workflow. The planning map fits authorized assignments, groups coincident pins, supports search/layers/touch interaction and links selected assignments to schedule and coverage. See the [UI experience review](DOCX/phase-reports/SCOPEIS_UI_EXPERIENCE_AND_PLANNING_MAP_2026_10_05.md) for screenshots and verification.

Company tickets are the locally authorized Phase 12 core workflow: independent workspaces/boards with optional Client/Project links, ticket status and priority, people access, work logs, private files, in-app notifications and retained archive/restore. The approved core is implemented and locally verified; [the delivery report](DOCX/phase-reports/SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md) records the checks and their limits. Employees land on Tickets and use Tickets, Schedule, Vacations and My profile as primary destinations; their own recorded skills appear in My profile. Managers keep their existing tools and gain Tickets. [The confirmed decisions](DOCX/project-memory/PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md) define the exact role and participation boundaries. Full Phase 12 remains `PARTIAL`; future workforce handoffs and required-skill semantics are separate, and daily work, flowcharts and cost/PDF reporting are deferred. Production identity/rollout remains Phase 13.

The product owner subsequently authorized production deployment on 9 October 2026. Fresh backup/independent restore and additive migration passed with prior facts preserved; application `4307413` is Ready at the canonical [ScopeIs application](https://scopeis-team-management-system.vercel.app/), and final anonymous smoke passed 10/10. [The production report](DOCX/phase-reports/SCOPEIS_COMPANY_TICKETS_PRODUCTION_2026_10_09.md) records exact source/target, initial findings and limits. Ordinary sign-in was visually verified; authenticated live Employee/manager/private-byte certification remains pending without ordinary credentials. This bounded deployment does not certify the broader Phase 12/13 rollout.

Ticket files accept PDF, JPEG, PNG and DOCX. The Vercel production release limits each ticket upload to **4 MiB**; local uploads retain **5 MiB**. The page presents the same environment-specific limit enforced by the server. Downloads remain private and reauthorize current ticket access; archive retains bytes and history.

Reporting reads the current Published schedule. The separate `PLANNING (unpublished)` report carries Draft and Proposed rows to management inside their current scope and is never visible to an Employee. Phase 11 reports never claim general staffing availability: the only permitted derived fact is the four-value conflict fact. CSV exports are streamed, bounded at 5,000 rows with refusal rather than truncation, formula-neutralised, and audited with safe metadata only.

Shared Client, Project, and Location notes are readable and creatable only by authenticated users already authorized on the parent record: Super Admin globally, Admin within their Client, Project, or Location scope, and Employees not at all. Employee-management notes stay private-to-author or shared-upward, and the subject never sees them. `/notifications` is a per-recipient inbox, and `/audit` is Super Admin-only, read-only, and renders only per-action allowlisted metadata.

## Architecture

- Next.js App Router and TypeScript
- PostgreSQL with Drizzle migrations
- Credential (username/email + password) authentication over opaque server sessions; scrypt hashing with a server-only pepper
- Mock authentication retained only for the guarded local/test automation harness
- Centralized Super Admin, Admin, and Employee role/scope authorization

## Local setup

Prerequisites: Node.js 22+, npm, and PostgreSQL.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Use only a local development database in `.env`. The supplied mock personas are fictional and mock authentication is restricted to development/test; it must never be enabled for production use.

Sign in with `username or email` and password. The five fictional users accept
either their username (`nora`, `ava`, `ben`, `cora`, `dan`) or their email
address. Credential login requires the server-only `AUTH_PASSWORD_PEPPER`
(minimum 32 characters); a missing Production pepper fails closed. The shared
fictional demo password is temporary and must be replaced before any real
employee or operational data is entered. Production sign-in never uses mock
authentication: `/api/auth/mock-login` returns a neutral refusal outside the
explicit disposable test harness.

An operator may initialize the five existing users' credentials with the guarded
one-time bootstrap (`scripts/bootstrap-existing-user-credentials.ts`). It is not
invoked by startup, development, build, or deployment, requires an explicit
Production confirmation guard and exact target verification, and never prints the
password, hash, salt, pepper, or database URL.

### Configured Windows checkout

This checkout has a development-only PostgreSQL runtime under `%LOCALAPPDATA%\ScopeIsLocal` and an ignored `.env` for its local application database. Once those prerequisites and dependencies are present, start or reuse the local application from PowerShell:

```powershell
./Start-Local.ps1
```

The launcher starts the configured local PostgreSQL cluster if needed, runs Next.js directly on `http://127.0.0.1:3000`, checks an existing port owner, and writes logs under `%LOCALAPPDATA%\ScopeIsLocal`. It does not install dependencies, create a database or apply migrations. Calling Node directly also avoids Windows npm command-shim failures caused by the ampersand in this checkout's directory name.

For local private uploads to survive application restarts, configure an absolute private directory in the ignored `.env`:

```dotenv
EVIDENCE_STORAGE_MODE=local
EVIDENCE_LOCAL_DIRECTORY=C:/Users/your-user/AppData/Local/ScopeIsLocal/private-files
```

Keep this directory outside `public` and back it up with its database metadata. Without an explicit directory, local storage is temporary. Production refuses the local storage provider; disposable tests use owned temporary storage.

The additive Company migration has a guarded local upgrade command. Its default is a read-only dry run against the explicit development `.env` database:

```powershell
node scripts/upgrade-local-company-tickets.mjs
```

`--apply` is restricted to a canonical loopback development database with only `0015_company_tickets` pending. It records a private pre-upgrade snapshot and receipt under `%LOCALAPPDATA%\ScopeIsLocal\backups`, and refuses the commit if any prior table facts, schema fingerprints or historical migration rows change. This script is a local development procedure. The separately authorized production release follows target verification, backup/restore proof and the preservation checks recorded in the production report; this local command must not be repurposed against production.

The configured fictional company demo can be populated with five ticket examples and one private example PDF using `node scripts/seed-local-ticket-demo.mjs --apply`. Without `--apply` it only describes the operation. It requires the explicit local demo environment, signs in through ordinary credential authentication, preserves existing matching examples, and performs ticket operations through the application API.

## Account administration

A currently active Super Admin can open `/accounts` to create application
accounts (and their workforce profile) atomically, enable sign-in for an
existing workforce record, and reset passwords. Passwords are one-way scrypt
hashes and **can never be viewed or recovered**; the UI states this explicitly
and offers a temporary-password reset instead. A reset clears any sign-in lock,
increments the target's `session_version`, revokes all of that user's sessions,
and optionally requires a password change at next login. Scoped Admins and
Employees receive a non-enumerating `404` on `/accounts`.

When `must_change_password` is set, the user authenticates but is redirected to
`/account/change-password` and cannot reach the rest of the application until
they set a new password. That page is self-only: a Super Admin cannot use it to
change another user's password.

## Verification contract

Each concept has exactly one meaning. Every gate below is safe to run locally: it uses only freshly created disposable loopback-only PostgreSQL databases and fictional data, and none of them read `.env.production`.

| Concept | Command | Meaning |
| --- | --- | --- |
| Unit tests | `npm run test:unit` | Pure unit/validation suites under `test/unit`. |
| Component tests | `npm run test:component` | All jsdom component suites in one pass, with no PostgreSQL or environment dependency. |
| Aggregate integration tests | `npm run test:integration` | Every file in `test/integration`, each in its own freshly created disposable database. |
| Phase-specific integration tests | `npm run test:phase1-integration`, `npm run test:phase2-core`, `npm run test:phase3-service` … `npm run test:phase11-service` | One phase's service/migration slice only. Retained for focused work; `npm run test:integration` is the authoritative aggregate. |
| Company ticket integration | `npm run test:tickets` | Ticket service and private-file integration suites, each on a fresh disposable loopback database. |
| Aggregate E2E | `npm run test:e2e` | Phase 1–11, Company tickets, credential/account and responsive UI browser journeys, run sequentially, each on its own disposable database and runner-allocated port. |
| Phase-specific E2E | `npm run test:phase1-e2e` … `npm run test:phase11-e2e` | One phase's guarded desktop/mobile journey only. |
| Company ticket E2E | `npm run test:tickets-e2e` | Guarded Company ticket browser journey on an owned disposable database, temporary private-file directory and runner-allocated loopback port. |
| Responsive and visual presentation E2E | `npm run test:responsive` | Supplemental UI gate using installed Chrome, an isolated safe build, one owned disposable database and fictional edge-case fixtures. Checks 320–1920px layouts, dialogs, role navigation and feature discovery, planning-map fit/search/layers/offline recovery, RTL, both themes, doubled text, a simulated onscreen keyboard, contrast/focus, native modal behavior, reduced motion, desktop hover and forced colors. |
| Route certification | `npm run test:route-certification` | Phase 1 HTTP route/role/scope/privacy certification against a built test server. |
| Migration verification | `npm run test:migration` | Migration ledger, journal, manifest, and TypeScript-schema parity. |
| Seed smoke | `npm run test:seed-smoke` | The real fictional seed against a fresh disposable database, including an idempotent re-run. |
| Lint | `npm run lint` | Authoritative application lint (`eslint . --max-warnings=0`). |
| Typecheck | `npm run typecheck` | `tsc --noEmit`. |
| Safe build | `npm run build:safe` | Authoritative isolated build gate. |
| Fresh-system smoke | `npm run test:system-smoke` | Migrates a disposable database, seeds idempotently, signs in every persona, opens permitted and forbidden routes, verifies audit and notification records, runs the safe build, and leaves no resource behind. |
| Concurrency/rollback repeat | `npm run test:system-concurrency` | The concurrency- and rollback-sensitive integration suites, three consecutive passes in fresh disposable databases. |
| System lock | `npm run test:system-lock` | The fail-closed aggregate that validates the scenario manifest and runs the complete verification contract in a deterministic order. |

`npm run test` runs unit, component, and aggregate integration. `npm run test:all` runs the whole contract: lint, typecheck, unit, component, integration, migration, route certification, seed smoke, safe build, and aggregate E2E. `npm run test:system-lock` adds scenario-manifest validation, the fresh-system smoke, isolation and a diff whitespace check. Its current registration includes Company tickets; earlier pre-Phase-12 passing receipts certify their own frozen source, not the new integration.

In this Windows directory, invoke installed JavaScript entry points directly when an npm command shim fails:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js . --max-warnings=0
node node_modules/vitest/vitest.mjs run test/unit
node node_modules/vitest/vitest.mjs run test/component
node scripts/run-ticket-service-tests.mjs
node scripts/run-ticket-playwright.mjs
```

Company ticket commands are verification entry points, not claims that the current source has passed. Final results must be recorded in the live tracker with their actual evidence.

### Build safety

A local `.env.production` can be auto-loaded by an ordinary Next.js build, so **`npm run build` is not a sanctioned verification gate** in this repository while that file exists. Use `npm run build:safe`, which copies an allowlist of source and configuration into an isolated temporary directory, proves the copy contains no `.env*` file, and then typechecks and builds there. `npm run build:phase1-certification` is the older Phase 1-scoped variant of the same isolated approach.

### Playwright and database isolation

Direct Playwright invocation is intentionally unsupported. Playwright is run only through the guarded runners, because each journey needs its own disposable database and an isolated port. The root `playwright.config.ts`, Phase 2–11 configs and `playwright.tickets.config.ts` therefore require a runner-allocated loopback port and fail closed rather than guessing a default that could reach a persistent or production database. Phase journey specs carry guards so they can never run against another journey's seed data; their guarded runners establish the correct environment.

### Lint boundary

`npm run lint` covers all maintained application source, tests, scripts, and configuration. The historical root prototype `prototype/full-frontend-r1/` is preserved reference work and is intentionally outside that boundary; it must not be deleted, edited, formatted, migrated, or treated as application source.

Do not commit credentials, real employee data, or local environment files.

For a fresh empty database, use the normal Drizzle migrator. For an existing database, run `npm run db:migration:inspect` and the default-dry-run `npm run db:migration:reconcile` first. Never run the ordinary migrator against an unclassified ledgerless database. The future production procedure is in `DOCX/phase-reports/PHASE_2_PRODUCTION_MIGRATION_RUNBOOK.md`; it requires backup/restore proof and separate approval.

## Documentation

See [the documentation index](DOCX/INDEX.md) for canonical requirements, [the live tracker](DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md) for current status, [Company ticket decisions](DOCX/project-memory/PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md) for the approved core, and [the production release report](DOCX/phase-reports/SCOPEIS_COMPANY_TICKETS_PRODUCTION_2026_10_09.md) for the subsequent deployment request. Historical phase evidence certifies only its own source and stated scope; broader Phase 12/13 completion is not implied by core deployment.
