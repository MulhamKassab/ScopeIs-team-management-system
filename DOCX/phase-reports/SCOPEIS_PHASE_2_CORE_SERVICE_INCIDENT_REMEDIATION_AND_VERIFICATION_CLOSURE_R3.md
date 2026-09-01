# ScopeIs Phase 2 Core Service Incident Remediation and Verification Closure R3

**Phase ID:** `SCOPEIS_PHASE_2_CORE_SERVICE_INCIDENT_REMEDIATION_AND_VERIFICATION_CLOSURE_R3`  
**Classification:** `PASS_PHASE_2_CORE_EMPLOYEE_SERVICE_LAYER_VERIFIED_R3`  
**Date:** 2026-08-31

## Incident remediation

R2's first route-runner attempt reloaded the persistent `.env.test` configuration inside the server-start script. Read-only investigation proved exactly ten persistent sessions and ten paired `auth.mock_session.started` audit records were created by that failed attempt.

All 20 rows were individually recorded in [`evidence/SCOPEIS_R3_PERSISTENT_TEST_DB_INCIDENT_BACKUP.md`](evidence/SCOPEIS_R3_PERSISTENT_TEST_DB_INCIDENT_BACKUP.md). Its SHA-256 is `8e55f703b2b789938347b8a9907edbda76f169e3674621f4a8aba0d1485bfd14`.

The candidates were `PROVEN_R2`: a 54 ms sequence beginning `2026-08-29T17:40:51.083Z`, exact route-test login actor sequence, one paired start-audit per session, no extra audit record for a candidate session, no foreign-key child references, and no later persistent activity. A single transaction locked and revalidated the explicit manifest, deleted 10 audit rows first, then deleted 10 session rows; every affected-row count was exact. No users, scopes, notifications, migration-ledger rows, schema objects, or employee-domain data were changed.

## Persistent database reconciliation

| Evidence | Before incident cleanup | After cleanup / final reruns | Result |
| --- | ---: | ---: | --- |
| Migration state | D | D | unchanged |
| Schema fingerprint | `9943560c…610550` | `9943560c…610550` | unchanged |
| Users | 5 | 5 | unchanged |
| Admin scope grants | 20 | 20 | unchanged |
| Sessions | 52 | 42 | exactly 10 proven R2 rows removed |
| Audit events | 94 | 84 | exactly 10 proven R2 rows removed |
| Notifications | 12 | 12 | unchanged |

The read-only snapshot immediately before final disposable reruns was identical to the snapshot immediately afterward: State D, the same fingerprint, 42 sessions, 84 audit events, five fictional personas, and the same active scope-grant set.

## Runner repair

`scripts/disposable-test-database.mjs` is the shared safety core. It creates a unique loopback test database, applies the validated normal migrator to State D, seeds only the five fictional personas plus Alpha/Bravo grants, passes a constrained environment to children, and drops only owned validated databases. It rejects unsafe, production-like, non-test, and persistent configured target names.

The environment helper now marks a child explicitly as disposable and resolves that child’s `DATABASE_URL` before `.env.test`. Server startup revalidates the resolved loopback temporary target and fixtures before build/start. Integration, route certification, core services, and Playwright now use this shared path. Unit coverage verifies the disposable environment marker and unsafe-name refusal.

## R3 verification results

| Command | Result |
| --- | --- |
| `npm run lint` | passed |
| `npm run typecheck -- --incremental false` | passed |
| `npm run test:unit` | 6 files, 25 tests passed |
| `npm run test:component` | 1 file, 2 tests passed |
| `npm run test:migration` | 1 file, 8 tests passed |
| `npm run test:phase2-core` | 1 file, 5 tests passed |
| `npm run test:integration` | 2 files, 10 tests passed on disposable DB |
| `npm run test:route-certification` | 1 file, 11 tests passed on disposable DB |
| `npm run build:phase1-certification` | passed; isolated build cleanup completed |
| `npm run validate:phase2-runbook` | passed |
| `npm run test:e2e -- --project=desktop` | 7 tests passed on disposable DB |
| `npm run test:e2e -- --project=mobile` | 7 tests passed on disposable DB |

No production service was contacted and no secret is recorded in this report. Phase 1 remains `VERIFIED_COMPLETE`; the Phase 2 database foundation remains `VERIFIED_COMPLETE`; this core employee/catalogue service layer is now `VERIFIED_COMPLETE`. Overall Phase 2 remains `PARTIAL`.
