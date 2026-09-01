# ScopeIs Phase 2.1 Custody Resolution Verified Main Closure R1

**Phase ID:** `SCOPEIS_PHASE_2_1_CUSTODY_RESOLUTION_VERIFIED_MAIN_CLOSURE_R1`
**Classification:** `PASS_PHASE_2_1_BACKEND_ONLY_CLOSURE`
**Date:** 2026-09-01

## Scope and result

This controlled closure adopts the verified Phase 2.1 employee-backend baseline from a pre-existing local worktree. It is backend-only: no employee routes, Server Actions, APIs, directory/search/filter UI, forms, details, self-service UI, or later Phase 2 work is included.

The prior custody blocker was resolved by explicit authorization to adopt the fully inspected, non-sensitive, Phase 2.1-relevant local worktree files. The adoption set is limited to the runtime schema, immutable-migration validation/adoption tooling, employee profile/catalogue/employee-skill server services, disposable test harness, focused tests, and truthful documentation/evidence. Phase 2.1 is complete as a reusable backend baseline; Phase 2 remains `PARTIAL` because its end-to-end employee journey and sub-phases 2.2–2.11 are not started.

## Starting custody and adoption inventory

Starting branch and local/remote HEAD were `main` and `26e5d5346086d56c4cac2664a66823f9e16b6f94`, with `0 0` ahead/behind and no staged files. The worktree contained 21 modified tracked entries and 29 untracked entries/groups. Each adopted untracked artifact is recorded as adopted from the pre-existing local worktree; no earlier reachable Git provenance is claimed.

| Adopted group | Paths | State at start | Purpose and evidence |
| --- | --- | --- | --- |
| Runtime schema and history pins | `src/db/schema/index.ts`; `src/db/migrations/meta/adoption-fingerprints.json`; `drizzle.config.ts`; `drizzle.test.config.ts`; `drizzle.certification.config.ts` | modified / untracked | Reconciles runtime Drizzle schema with immutable `0000`/`0001`, journal, and fingerprints; migration suite passed 8/8. |
| Migration validation/adoption | `scripts/phase2-migration-core.mjs`; `scripts/phase2-migration-state.mjs`; `scripts/run-phase2-migration-command.mjs`; `scripts/run-phase2-migration-tests.mjs`; `scripts/schema-fingerprint.mjs`; `scripts/validate-phase2-runbook.mjs`; `package.json` Phase 2 scripts | modified / untracked | Exact byte-hash, journal, ledger, State A–E, runtime drift, and disposable cleanup validation. |
| Disposable harness | `scripts/phase1-test-environment.mjs`; `scripts/disposable-test-database.mjs`; `scripts/run-phase2-core-service-tests.mjs`; `src/server/env.ts`; `src/shared/validation/foundation.ts`; `test/unit/environment-guard.test.ts` | modified / untracked | Parses only `.env.test`, requires loopback/test-only configuration, passes a constrained child environment, and creates/drops owned temporary databases. |
| Employee backend | `src/modules/employees/contracts.ts`; `domain-error.ts`; `employee-validation.ts`; `employee-repositories.ts`; `employee-services.ts`; `employee-policy.ts` | modified / untracked | Server-side validation, Super Admin management, scoped Admin reads, own three-field update boundary, audit/transaction/version handling. |
| Focused tests | `test/integration/phase2-core-service.test.ts`; `test/migration/phase2-database-foundation.test.ts` | untracked | Core service suite passed 5/5; migration/schema suite passed 8/8. |
| Documentation and evidence | `.gitattributes`; `PROJECT_CONTEXT.md`; `DOCX/INDEX.md`; `DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md`; `DOCX/phase-reports/PHASE_2_EMPLOYEES_AND_CAPABILITIES_IMPLEMENTATION_REPORT.md`; `DOCX/phase-reports/PHASE_2_PRODUCTION_MIGRATION_RUNBOOK.md`; both Phase 2.1 reports; Phase 1 R1; Phase 2 database R1; Phase 2 core R1/R3; and the non-secret R3 evidence backup | modified / untracked | Preserves historical evidence and records the verified, committed backend-only closure. `.gitattributes` retains its canonical project-memory rule and adds narrow exceptions for intentional Markdown hard breaks in immutable historical evidence during diff hygiene. |

## Preserved exclusions

The following pre-existing user work is deliberately not staged: `README.md`; the unstaged non-Phase-2 runner edits in `package.json`; `src/app/(protected)/[module]/page.tsx`; `src/app/(protected)/employees/page.tsx`; `src/app/api/auth/mock-login/route.ts`; `src/db/seed/index.ts`; `src/modules/auth/session-service.ts`; `src/server/http.ts`; `playwright.config.ts`; `test/e2e/foundation.spec.ts`; `test/integration/foundation-postgres.test.ts`; `scripts/remediate-r2-persistent-test-incident.mjs`; `scripts/run-phase1-integration-tests.mjs`; `scripts/run-phase1-playwright.mjs`; `scripts/run-phase1-route-certification.mjs`; `scripts/run-phase1-safe-build.mjs`; `scripts/start-phase1-test-server.mjs`; and `test/route-certification/phase1-http.test.ts`.

These are browser/route work, unrelated foundation work, or a persistent-incident remediation utility. They remain untouched in the local worktree and are not part of this Phase 2.1 commit.

## Verified backend boundaries

- Super Admin globally administers profiles, designations, skills, arrangement labels, and employee-skill associations.
- Admin access is server-enforced and limited to assigned `TEAM` scope.
- Admin projections omit `defaultWorkLocation`, `workEmail`, and `workPhone`; the focused skill-member integration test asserts all three omissions.
- An Employee can update only their own `workEmail`, `workPhone`, and `professionalSummary`; management-controlled fields and employee skills are rejected.
- Arrangement labels are descriptive catalogue records only, without employee association or authorization/availability behavior.
- Mutations are transaction-scoped, write audit events atomically, and use optimistic versions; audit failure rolls back the mutation and stale writes are rejected.

## Migration and test-environment verification

Migration `0001_phase_2_employee_capabilities.sql` remains byte-for-byte unchanged with SHA-256 `d0dc109b1cca66b727ea2843186559c1b9e0f802ad001d8013322f6a2beddd60`. The journal and adoption fingerprints agree with it. No additive migration was created.

The `.env.test` configuration was parsed without sourcing any production environment file. The sanitized preflight reported PostgreSQL `127.0.0.1:5432`, `scopeis_team_management_test`, test-name true, and production-like-name false. The disposable harness separately verifies loopback server/client addresses, creates uniquely named temporary databases, migrates them to State D, and drops only owned databases.

| Command | Result |
| --- | --- |
| `node --input-type=module -e '…loadPhase1TestConfiguration…'` | Passed; sanitized disposable-loopback configuration confirmed. |
| `npm run test:phase2-core` | Passed; 1 file / 5 tests, disposable database cleanup confirmed. |
| `npm run test:migration` | Passed; 1 file / 8 tests covering clean migration, ledger adoption, refusal, drift, runtime schema, and cleanup. |
| `npx vitest run test/unit/employee-policy.test.ts` | Passed; 1 file / 3 tests. |
| `npm run typecheck -- --incremental false` | Passed. |
| `npm run lint` | Passed. |
| `git diff --check` | Passed. |

Browser, component, route/API, build, and persistent/shared-data tests were intentionally not run. No production environment file was sourced, no production credentials or service were used, and no persistent/shared test data was mutated.

## Status and remaining work

Phase 2.1 moves from `BLOCKED` to `COMPLETED` as a verified backend-only sub-phase after the isolated custody adoption and push. Phase 2 remains `PARTIAL`. Phase 2.2 through 2.11 remain `NOT_STARTED`; no end-to-end employee journey is claimed.

Related committed evidence: [database reconciliation R1](SCOPEIS_PHASE_2_DATABASE_FOUNDATION_RECONCILIATION_R1.md), [core service R1](SCOPEIS_PHASE_2_CORE_EMPLOYEE_SERVICE_LAYER_R1.md), [core-service R3](SCOPEIS_PHASE_2_CORE_SERVICE_INCIDENT_REMEDIATION_AND_VERIFICATION_CLOSURE_R3.md), and the preserved [initial Phase 2.1 reconciliation](SCOPEIS_PHASE_2_1_PRESERVE_AND_RECONCILE_EXISTING_EMPLOYEE_BACKEND_R1.md).
