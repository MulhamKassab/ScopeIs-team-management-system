# ScopeIs Preview Vercel Database Environment Fix R1

## Incident

The Vercel build for Git branch `preview` at commit `ffb3216` compiled and passed TypeScript, then failed while collecting route configuration for `/api/auth/logout`. Environment validation reported that `DATABASE_URL` was undefined.

## Root cause

The ScopeIs Neon resource `scopeis-team-management-prod` was connected to the Vercel project only for the Production target. The Preview environment therefore contained application and Blob variables but none of the PostgreSQL variables, including `DATABASE_URL`.

The problem was Vercel resource targeting, not the Next.js route, database client, build cache, Node engine warning, or npm install-script warning.

## Remediation

The existing Neon resource was reconnected to the existing ScopeIs Vercel project with both `production` and `preview` targets. No database content was queried or changed. Verification confirmed that:

- The resource binding lists both `production` and `preview`.
- Preview now contains a sensitive `DATABASE_URL` variable injected by the integration.
- Production remains connected to the same resource.

The application continues to require the canonical `DATABASE_URL`; it does not guess among provider aliases. The environment guard now emits an actionable message instructing operators to connect the PostgreSQL resource to the affected Vercel deployment environment.

## Files changed

- `src/server/env.ts`
- `test/unit/environment-guard.test.ts`
- `DOCX/phase-reports/SCOPEIS_PREVIEW_VERCEL_DATABASE_ENV_FIX_R1.md`

## Safety and scope

- No schema, migration, repository, service authorization, session semantics, employee-code behavior, or Phase 3 functionality changed.
- No Vercel secret value was printed, downloaded, or committed.
- No production deployment was triggered or promoted.
- The fix is committed only to Git branch `preview`; `main` is not changed or merged.

## Verification

- `npm run lint` — passed with zero warnings.
- `npm run typecheck -- --incremental false` — passed.
- `npm run test:unit -- --run test/unit/environment-guard.test.ts` — passed; Vitest executed all 8 unit files and all 29 tests.
- `DATABASE_URL=postgresql://scopeis_build_only@127.0.0.1:1/scopeis_build_only APP_ENV=production MOCK_AUTH_ENABLED=false VERCEL_ENV=preview npm run build` — passed with Next.js 16.3.3 and Turbopack, including route configuration collection for `/api/auth/logout`.
- `git diff --check` — passed.

The build URL intentionally targeted unreachable loopback port `1`, which proves configuration and route collection without accessing Neon or any shared database.
