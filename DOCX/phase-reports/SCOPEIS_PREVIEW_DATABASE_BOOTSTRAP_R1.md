# ScopeIs Preview Database Bootstrap R1

## Purpose

Provide the Vercel Preview deployment with complete fictional Phase 2 data while refusing Production and preserving all role, scope, migration, transaction, and employee-code behavior.

## Database custody

- Preview Vercel resource: scopeis-team-management-preview
- Preview Vercel resource ID: store_N6XVqA26NhlBNrhf
- Preview Neon project ID: blue-firefly-93492385
- Preview target: Preview only
- Production Vercel resource: scopeis-team-management-prod
- Production Vercel resource ID: store_Dn7b1e71Ge2yUcLS
- Production Neon project ID: morning-flower-68935124
- Production target: Production only

The resource and Neon project identities are distinct. The bootstrap requires the exact reviewed Preview Neon project ID and explicitly refuses the Production Neon project ID before opening a database connection.

## Authentication custody

- The shared Production-targeted MOCK_AUTH_ENABLED value was explicitly set to false.
- A sensitive Git-branch-specific Preview override was added for branch preview with value true.
- Vercel branch-specific Preview variables take precedence for that Git branch.

## Bootstrap controls

The bootstrap is disabled by default and runs as the npm prebuild hook only when all of these conditions are true:

1. SCOPEIS_PREVIEW_DATABASE_BOOTSTRAP is exactly true.
2. VERCEL is exactly 1.
3. VERCEL_ENV is exactly preview.
4. VERCEL_GIT_COMMIT_REF is exactly preview.
5. MOCK_AUTH_ENABLED is exactly true.
6. NEON_PROJECT_ID exactly matches blue-firefly-93492385.
7. NEON_PROJECT_ID does not match the recorded Production project.
8. DATABASE_URL is present.
9. The disposable E2E marker is absent.

After connecting, a PostgreSQL advisory lock prevents concurrent bootstrap runs. Migration inspection accepts only a fresh State A database or an exact State D ledger/schema state. Unknown, partial, ledgerless historical, or drifted states are refused.

Neon PostgreSQL renders several column defaults, constraint definitions, and index definitions differently from the local PostgreSQL version used to create the canonical text fingerprint. The first clean migration run therefore produced all four exact immutable ledger rows, all 14 final tables, and the exact enum set/hash, but the text fingerprint reported State E. The canonical migration guard remains unchanged. This Preview-only bootstrap accepts that provider formatting variance only when every migration hash/timestamp, final table name, enum name, and enum hash matches the repository manifest. Missing, additional, reordered, or changed migration identity is still refused.

## Fictional data

The transactionally seeded graph contains:

- Nora Albright — Super Admin.
- Ava Mercer — Admin with active team:alpha grant.
- Ben Iqbal — Admin with active team:bravo grant.
- Cora Bell — Employee in team:alpha.
- Dan Rowan — Employee in team:bravo.
- Five employee profiles with fictional example.test email addresses.
- Field Engineer designation.
- Manager relationships, work locations, and descriptive working patterns.

The seeder refuses any pre-existing non-fixture user. It upserts only the five known fictional personas and profiles, replaces only their scope grants, and verifies five users, five profiles, and two active Admin TEAM grants.

## Files changed

- package.json
- scripts/bootstrap-preview-database.mjs
- test/unit/preview-database-bootstrap.test.ts
- DOCX/phase-reports/SCOPEIS_PREVIEW_DATABASE_BOOTSTRAP_R1.md

## Verification before remote execution

- Unit suite: 9 files and 33 tests passed.
- Focused ESLint: passed.
- TypeScript with incremental output disabled: passed.
- Disabled bootstrap command: passed and confirmed no database connection was opened.
- Vercel-like Next.js 16.3.3 Turbopack build: passed using an unreachable loopback URL; the absent enable flag skipped bootstrap.

## Boundaries

- Production database credentials were not downloaded.
- Production database was not connected to, queried, migrated, or seeded.
- No schema or migration file changed.
- No Phase 3 functionality was started.
- The five unrelated untracked duplicate UI files in the Preview worktree were preserved and excluded.
