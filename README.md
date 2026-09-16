# ScopeIs Team Management System

Responsive internal workforce-planning application. Phases 0–11 are `COMPLETED` as bounded vertical journeys: the secure mock-account foundation, employee management, clients/projects/locations, scheduling Draft → Proposed → Published V1, annual leave, controlled skills with non-blocking warnings, coverage/replacement, the management-only static planning map, capability evidence with private files, collaboration and governance (shared operational notes, employee-management notes, participant-only replacement-request discussions, the notification centre, and the Super Admin audit history), and reporting (role-and-scope dashboards, thirteen registered reports, a separate unpublished planning report, and bounded CSV exports).

Phase 12 — Ticket System integration — is the next journey and is `NEXT`; it has not started. Production identity/rollout remains Phase 13. Those modules exist only as clearly labelled shells.

Reporting reads the current Published schedule. The separate `PLANNING (unpublished)` report carries Draft and Proposed rows to management inside their current scope and is never visible to an Employee. Phase 11 reports never claim general staffing availability: the only permitted derived fact is the four-value conflict fact. CSV exports are streamed, bounded at 5,000 rows with refusal rather than truncation, formula-neutralised, and audited with safe metadata only.

Shared Client, Project, and Location notes are readable and creatable only by authenticated users already authorized on the parent record: Super Admin globally, Admin within their Client, Project, or Location scope, and Employees not at all. Employee-management notes stay private-to-author or shared-upward, and the subject never sees them. `/notifications` is a per-recipient inbox, and `/audit` is Super Admin-only, read-only, and renders only per-action allowlisted metadata.

## Architecture

- Next.js App Router and TypeScript
- PostgreSQL with Drizzle migrations
- Development/test mock server sessions
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

## Verification contract

Each concept has exactly one meaning. Every gate below is safe to run locally: it uses only freshly created disposable loopback-only PostgreSQL databases and fictional data, and none of them read `.env.production`.

| Concept | Command | Meaning |
| --- | --- | --- |
| Unit tests | `npm run test:unit` | Pure unit/validation suites under `test/unit`. |
| Component tests | `npm run test:component` | All jsdom component suites in one pass, with no PostgreSQL or environment dependency. |
| Aggregate integration tests | `npm run test:integration` | Every file in `test/integration`, each in its own freshly created disposable database. |
| Phase-specific integration tests | `npm run test:phase1-integration`, `npm run test:phase2-core`, `npm run test:phase3-service` … `npm run test:phase11-service` | One phase's service/migration slice only. Retained for focused work; `npm run test:integration` is the authoritative aggregate. |
| Aggregate E2E | `npm run test:e2e` | The Phase 1–11 guarded browser journeys, run sequentially, each on its own disposable database and runner-allocated port. |
| Phase-specific E2E | `npm run test:phase1-e2e` … `npm run test:phase11-e2e` | One phase's guarded desktop/mobile journey only. |
| Route certification | `npm run test:route-certification` | Phase 1 HTTP route/role/scope/privacy certification against a built test server. |
| Migration verification | `npm run test:migration` | Migration ledger, journal, manifest, and TypeScript-schema parity. |
| Seed smoke | `npm run test:seed-smoke` | The real fictional seed against a fresh disposable database, including an idempotent re-run. |
| Lint | `npm run lint` | Authoritative application lint (`eslint . --max-warnings=0`). |
| Typecheck | `npm run typecheck` | `tsc --noEmit`. |
| Safe build | `npm run build:safe` | Authoritative isolated build gate. |

`npm run test` runs unit, component, and aggregate integration. `npm run test:all` runs the whole contract: lint, typecheck, unit, component, integration, migration, route certification, seed smoke, safe build, and aggregate E2E.

### Build safety

A local `.env.production` can be auto-loaded by an ordinary Next.js build, so **`npm run build` is not a sanctioned verification gate** in this repository while that file exists. Use `npm run build:safe`, which copies an allowlist of source and configuration into an isolated temporary directory, proves the copy contains no `.env*` file, and then typechecks and builds there. `npm run build:phase1-certification` is the older Phase 1-scoped variant of the same isolated approach.

### Playwright and database isolation

Direct Playwright invocation is intentionally unsupported. Playwright is run only through the guarded runners, because each journey needs its own disposable database and an isolated port. The root `playwright.config.ts` and the Phase 2–11 configs therefore require a runner-allocated loopback port and fail closed rather than guessing a default that could reach a persistent or production database. Phase 3–11 journey specs additionally carry `test.skip(<guard>)` statements so they can never run against another phase's seed data; the aggregate runner sets each guard, so nothing is skipped in `npm run test:e2e`.

### Lint boundary

`npm run lint` covers all maintained application source, tests, scripts, and configuration. The historical root prototype `prototype/full-frontend-r1/` is preserved reference work and is intentionally outside that boundary; it must not be deleted, edited, formatted, migrated, or treated as application source.

Do not commit credentials, real employee data, or local environment files.

For a fresh empty database, use the normal Drizzle migrator. For an existing database, run `npm run db:migration:inspect` and the default-dry-run `npm run db:migration:reconcile` first. Never run the ordinary migrator against an unclassified ledgerless database. The future production procedure is in `DOCX/phase-reports/PHASE_2_PRODUCTION_MIGRATION_RUNBOOK.md`; it requires backup/restore proof and separate approval.

## Documentation

See `DOCX/INDEX.md` for canonical requirements and design references, `DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md` for live status, and `DOCX/phase-reports/SCOPEIS_PHASE_11_DASHBOARDS_REPORTS_AND_AUTHORIZED_EXPORTS_R1.md` for the current phase evidence. Phase evidence remains in `DOCX/phase-reports/`.
