# ScopeIs Team Management System

Responsive internal workforce-planning application. Phases 0–8 are `COMPLETED` as bounded vertical journeys: the secure mock-account foundation, employee management, clients/projects/locations, scheduling Draft → Proposed → Published V1, annual leave, controlled skills with non-blocking warnings, coverage/replacement, and the management-only static planning map. The repository is currently at the **Post-Phase-8 Checkpoint Sub-phase A**, a verification-harness and documentation remediation that starts no new product phase.

Phase 9 — certifications, CVs, portfolios, and files is the next journey and is `NOT_STARTED`. Notes/discussions/notification centre/audit interface remain Phase 10, dashboards/reports/exports remain Phase 11, Ticket System integration remains Phase 12, and production identity/rollout remains Phase 13. Those modules exist only as clearly labelled shells.

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
| Phase-specific integration tests | `npm run test:phase1-integration`, `npm run test:phase2-core`, `npm run test:phase3-service` … `npm run test:phase8-service` | One phase's service/migration slice only. Retained for focused work; `npm run test:integration` is the authoritative aggregate. |
| Aggregate E2E | `npm run test:e2e` | The Phase 1–8 guarded browser journeys, run sequentially, each on its own disposable database and runner-allocated port. |
| Phase-specific E2E | `npm run test:phase1-e2e` … `npm run test:phase8-e2e` | One phase's guarded desktop/mobile journey only. |
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

Direct Playwright invocation is intentionally unsupported. Playwright is run only through the guarded runners, because each journey needs its own disposable database and an isolated port. The root `playwright.config.ts` and the Phase 2–8 configs therefore require a runner-allocated loopback port and fail closed rather than guessing a default that could reach a persistent or production database. Phase 3–8 journey specs additionally carry `test.skip(<guard>)` statements so they can never run against another phase's seed data; the aggregate runner sets each guard, so nothing is skipped in `npm run test:e2e`.

### Lint boundary

`npm run lint` covers all maintained application source, tests, scripts, and configuration. The historical root prototype `prototype/full-frontend-r1/` is preserved reference work and is intentionally outside that boundary; it must not be deleted, edited, formatted, migrated, or treated as application source.

Do not commit credentials, real employee data, or local environment files.

For a fresh empty database, use the normal Drizzle migrator. For an existing database, run `npm run db:migration:inspect` and the default-dry-run `npm run db:migration:reconcile` first. Never run the ordinary migrator against an unclassified ledgerless database. The future production procedure is in `DOCX/phase-reports/PHASE_2_PRODUCTION_MIGRATION_RUNBOOK.md`; it requires backup/restore proof and separate approval.

## Documentation

See `DOCX/INDEX.md` for canonical requirements and design references, `DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md` for live status, and `DOCX/phase-reports/SCOPEIS_POST_PHASE_8_CHECKPOINT_SUBPHASE_A_REMEDIATION_R1.md` for the current checkpoint remediation. Phase evidence remains in `DOCX/phase-reports/`.
