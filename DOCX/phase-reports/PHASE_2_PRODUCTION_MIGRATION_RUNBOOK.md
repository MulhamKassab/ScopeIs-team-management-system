# Phase 2 Production Migration and Ledger-Adoption Runbook

## Status and absolute boundaries

This is a future production procedure only. It was validated with uniquely named disposable loopback PostgreSQL databases; it has not been run against Production. Production schema, ledger, migration, and seed state remain unknown.

Do not manually execute raw migration SQL as the normal workflow. Do not run the ordinary Drizzle migrator against a ledgerless database. Never insert ledger rows based on table names, an operator assumption, or an earlier report.

Before any production mutation:

1. Create a database backup using the provider-supported mechanism.
2. Restore-test that backup to a separate safe environment.
3. Record the backup identifier and responsible reviewer outside this repository.
4. Supply the database URL securely through `SCOPEIS_MIGRATION_DATABASE_URL`; never place it in command history, reports, or committed files.
5. Inspect and classify before approving any plan.

Stop on any State E result, hash change, ledger discrepancy, unexpected object, failed backup test, command failure, or unclear diagnostic. Require manual review before any repair.

## Immutable migration identity

| File | Lines | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `src/db/migrations/0000_phase_1_foundation.sql` | 67 | 3089 | `cd7965d9b11f756075d76c0a9ef2adb4159827391224233cc143b05dfbe22e34` |
| `src/db/migrations/0001_phase_2_employee_capabilities.sql` | 16 | 4887 | `d0dc109b1cca66b727ea2843186559c1b9e0f802ad001d8013322f6a2beddd60` |

Drizzle ORM 0.45.2 hashes the exact SQL bytes with SHA-256, orders migrations by `_journal.json` `when`, and stores `hash` plus that millisecond value as `created_at` in `drizzle.__drizzle_migrations`. PostgreSQL migrations and their ledger insert run in one transaction. The adoption tool uses those installed-version semantics and refuses changed files or journal ordering.

Run `npm run validate:phase2-runbook` before using this runbook.

## Database-state classifications

| State | Exact meaning | Safe behavior |
|---|---|---|
| State A | Public schema is empty and no Drizzle ledger exists | Normal Drizzle migrator applies all migrations and creates the ledger |
| State B | Public schema exactly fingerprints as migration `0000`, with no ledger | Dry-run; adopt exact `0000` hash/time; normal migrator applies pending migrations |
| State C | Public schema exactly fingerprints as migrations `0000`+`0001`, with no ledger | Dry-run; adopt exact `0000` and `0001` rows; normal migrator applies only later pending migrations |
| State D | Ledger is a valid contiguous journal prefix and schema exactly matches that prefix | Normal migrator applies pending migrations; validate final ledger/schema |
| State E | Partial, contradictory, extra, altered, unknown, or ledger-disagreeing state | Refuse with non-zero exit; make no schema or ledger changes |

Fingerprints include enums, every table and column, PostgreSQL types, nullability, defaults, primary/unique/check/foreign-key constraints, delete/update behavior, and indexes. Table names alone are never sufficient.

## Read-only inspection and dry run

The CLI never loads `.env`, `.env.local`, `.env.production`, or another environment file. Supply the target explicitly through the process environment without printing it.

```bash
node scripts/phase2-migration-state.mjs inspect
node scripts/phase2-migration-state.mjs reconcile
```

Both commands require `SCOPEIS_MIGRATION_DATABASE_URL`. `reconcile` is dry-run by default. Review the non-secret classification, pending migrations, adoption rows, and fingerprint diagnostics. State E exits non-zero.

The repository `npm run db:migration:*` wrappers intentionally target `.env.test` and are for the verified local disposable test database only; do not use those wrappers for Production.

## Explicit application after approval

Only after backup/restore proof and plan review:

```bash
node scripts/phase2-migration-state.mjs reconcile --apply --backup-confirmed
node scripts/phase2-migration-state.mjs validate
```

The apply command re-inspects before mutation. For States B/C it creates the exact installed Drizzle ledger in a transaction and inserts only verified historical rows, then invokes the normal migrator. For States A/D it invokes the normal migrator without fabricating history. Final validation requires State D with no pending migrations.

Do not run `db:seed` during migration reconciliation. Seeding requires a separate approved purpose, identity posture, and safety review.

## Post-migration verification

Verify all of the following before application release:

- State D with no pending migrations.
- Exactly two ledger rows for the current repository, in journal order, with exact hashes and timestamps.
- All five Phase 1 and eight Phase 2 tables match the authoritative fingerprint.
- Migration validation is idempotent and a second normal migrator run is a no-op.
- Application health check succeeds without schema errors.
- Phase 1 login/session/authorization smoke checks remain green.
- Seed state is reviewed separately; no production seed is assumed.

If any verification fails, stop release activity. Do not delete ledger rows, rewrite migrations, replay raw SQL, or improvise a corrective migration without a reviewed backup-based repair plan.
