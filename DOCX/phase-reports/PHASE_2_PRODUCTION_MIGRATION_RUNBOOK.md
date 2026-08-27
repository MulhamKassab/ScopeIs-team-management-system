# Phase 2 Production Migration Runbook

## Preconditions and stop conditions

The user confirmed Neon SQL Editor preflight `public_table_count = 0`. This is Production: never seed, reset, truncate, or test it. Stop and report before applying anything if the count is not zero, either migration fails, or the observed schema differs. No rollback SQL is supplied: both migrations are additive and the database is empty before bootstrap.

The authoritative SQL is the exact byte content of the checked source files below. Do not use a copied Markdown SQL block. After a verified local commit exists, open each source file in the repository and copy its complete contents directly into Neon SQL Editor in this order:

1. `src/db/migrations/0000_phase_1_foundation.sql`
2. `src/db/migrations/0001_phase_2_employee_capabilities.sql`

| File | Lines | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `src/db/migrations/0000_phase_1_foundation.sql` | 67 | 3089 | `cd7965d9b11f756075d76c0a9ef2adb4159827391224233cc143b05dfbe22e34` |
| `src/db/migrations/0001_phase_2_employee_capabilities.sql` | 16 | 4887 | `d0dc109b1cca66b727ea2843186559c1b9e0f802ad001d8013322f6a2beddd60` |

Run `npm run validate:phase2-runbook` locally before using this runbook. It calculates the source file line counts, byte counts, and SHA-256 values and rejects stale runbook metadata.

## Read-only verification SQL

After Phase 1, run:

```sql
SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT to_regclass('public.__drizzle_migrations') AS drizzle_ledger;
```

Expected tables: `admin_scope_grants`, `audit_events`, `notifications`, `sessions`, `users`. The raw SQL files do not create Drizzle's ledger; `__drizzle_migrations` is expected to be absent.

After Phase 2, run the same read-only SQL. Expected tables: `admin_scope_grants`, `arrangement_labels`, `audit_events`, `designations`, `employee_evidence`, `employee_files`, `employee_management_notes`, `employee_profiles`, `employee_skills`, `notifications`, `sessions`, `skills`, `users`. The ledger remains absent.

Do not fabricate ledger rows. Because the user applies raw SQL manually, future Drizzle migration commands must not be run against this manually bootstrapped Production database until a separately approved ledger-adoption migration is designed and validated.
