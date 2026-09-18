# System-Wide Test Scenario Catalogue

Checkpoint: `SCOPEIS_PRE_PHASE_12_SYSTEM_WIDE_HARDENING_AND_REGRESSION_LOCK_R1`

This document is the human-readable catalogue for the pre-Phase-12 system-wide hardening and
regression lock. The machine-readable authority is
[`test/system-lock/scenario-manifest.json`](../../test/system-lock/scenario-manifest.json), which is
validated fail-closed by `scripts/verify-scenario-manifest.mjs` at the start of
`npm run test:system-lock`. The catalogue and the manifest describe the same scenario set; the
manifest is what the lock enforces.

Coverage in this checkpoint is scenario coverage, not an arbitrary line-coverage percentage. A
scenario is covered when its supported contract, role, scope, state transition, privacy boundary,
material validation boundary, or credible failure path has automated evidence. Manual-only
exceptions are rare and carry an explicit justification.

## Summary

| Domain | Prefix | Scenarios |
|---|---|---|
| System, foundation, smoke, isolation, seed, concurrency, build | SYS | 13 |
| Authentication, sessions, application shell | AUTH | 3 |
| Employee management | EMP | 7 |
| Clients, projects, locations | ORG | 4 |
| Scheduling | SCH | 4 |
| Leave | LEV | 4 |
| Skills and operational requirements | SKL | 4 |
| Coverage and replacement | CVR | 4 |
| Static planning map | MAP | 4 |
| Certifications, evidence, CVs, portfolios, files | EVD | 4 |
| Notes, discussions | COL | 4 |
| Notifications | NTF | 2 |
| Audit | AUD | 2 |
| Dashboards, reports, exports | RPT | 4 |
| **Total** | | **63** |

63 scenarios total: 62 automated and 1 justified manual-only (performance/resource sanity).

## Automated evidence inventory

The manifest declares exactly 54 test files and asserts, at lock time, that the on-disk test tree and
the authoritative runner coverage are identical, so a Phase 0-11 test file cannot be silently omitted.

| Layer | Runner | Files |
|---|---|---|
| unit | `npm run test:unit` | 16 |
| component | `npm run test:component` | 13 |
| integration | `npm run test:integration` | 12 |
| migration | `npm run test:migration` | 1 |
| route-certification | `npm run test:route-certification` | 1 |
| e2e | `npm run test:e2e` | 11 |
| **Total** | | **54** |

The 28 protected page and API routes declared in the manifest are certified by
`test/route-certification/phase1-http.test.ts`.

## Scenario listing

Each entry names the scenario id, owning phase, module, actor, test layer, and the automated evidence
file. Full scenario metadata (preconditions, input, action, expected result, mutation, audit,
notification, privacy, transaction, and concurrency expectations) lives in the manifest.

### System and foundation (SYS)

| ID | Phase | Module | Actor | Layer | Evidence |
|---|---|---|---|---|---|
| SYS-01 | 1 | authorization | Admin/Super Admin | unit | test/unit/authorization.test.ts |
| SYS-02 | 1 | environment | runtime | unit | test/unit/environment-guard.test.ts |
| SYS-03 | 1 | navigation | all roles | unit | test/unit/navigation.test.ts |
| SYS-04 | 1 | component DB boundary | runtime | component | test/component/database-boundary.test.ts |
| SYS-05 | 1 | visual states | visitor | component | test/component/states.test.tsx |
| SYS-06 | 1 | foundation transaction | personas | integration | test/integration/foundation-postgres.test.ts |
| SYS-07 | 2 | migrations | tooling | migration | test/migration/phase2-database-foundation.test.ts |
| SYS-08 | 0-11 | fresh-system smoke | all personas | smoke | scripts/run-system-smoke.mjs |
| SYS-09 | 0-11 | isolation | harness | isolation | scripts/verify-isolation.mjs |
| SYS-10 | 0-11 | seed smoke | seed | seed | scripts/run-seed-smoke.mjs |
| SYS-11 | 0-11 | concurrency/rollback repeat | concurrent actors | integration | scripts/run-system-concurrency-tests.mjs |
| SYS-12 | 0-11 | safe build | build | build | scripts/run-phase2-safe-build.mjs |
| SYS-13 | 0-11 | performance sanity | operator | manual | documented procedure |

### Authentication (AUTH)

| ID | Phase | Module | Actor | Layer | Evidence |
|---|---|---|---|---|---|
| AUTH-01 | 1 | authentication | login caller | unit | test/unit/mock-auth-boundaries.test.ts |
| AUTH-02 | 1 | route certification | all personas | route-certification | test/route-certification/phase1-http.test.ts |
| AUTH-03 | 1 | application shell | all personas | e2e | test/e2e/foundation.spec.ts |
| AUTH-04 | R1 | credential authentication | all five fictional users | unit + integration | test/unit/credential-authentication.test.ts; test/integration/credential-authentication.test.ts |
| AUTH-05 | R1 | credential login journey | all five fictional users | e2e | test/e2e/credential-login.spec.ts |
| AUTH-06 | R1 account administration | account and credential administration | Super Admin and prohibited roles | unit + integration | test/unit/account-administration.test.ts; test/integration/account-administration.test.ts |
| AUTH-07 | R1 account administration | account administration journey | Super Admin and prohibited roles | component + e2e | test/component/account-administration.test.tsx; test/e2e/account-administration.spec.ts |

### Employee management (EMP)

| ID | Phase | Module | Layer | Evidence |
|---|---|---|---|---|
| EMP-01 | 2 | create validation | unit | test/unit/employee-create-validation.test.ts |
| EMP-02 | 2 | directory query | unit | test/unit/employee-directory-query.test.ts |
| EMP-03 | 2,10 | policy and management-note authorization | unit | test/unit/employee-policy.test.ts |
| EMP-04 | 2 | detail projection | component | test/component/employee-detail.test.tsx |
| EMP-05 | 2 | directory component | component | test/component/employee-directory.test.tsx |
| EMP-06 | 2 | core service | integration | test/integration/phase2-core-service.test.ts |
| EMP-07 | 2 | directory journey | e2e | test/e2e/employee-directory.spec.ts |

### Clients, projects, locations (ORG)

| ID | Phase | Module | Layer | Evidence |
|---|---|---|---|---|
| ORG-01 | 3 | validation | unit | test/unit/phase3-operational-validation.test.ts |
| ORG-02 | 3 | forms | component | test/component/phase3-operational-forms.test.tsx |
| ORG-03 | 3 | service | integration | test/integration/phase3-operational-service.test.ts |
| ORG-04 | 3 | journey | e2e | test/e2e/phase3-operations.spec.ts |

### Scheduling (SCH)

| ID | Phase | Module | Layer | Evidence |
|---|---|---|---|---|
| SCH-01 | 4 | validation | unit | test/unit/phase4-scheduling-validation.test.ts |
| SCH-02 | 4 | forms | component | test/component/phase4-scheduling-forms.test.tsx |
| SCH-03 | 4 | service | integration | test/integration/phase4-scheduling-service.test.ts |
| SCH-04 | 4 | journey | e2e | test/e2e/phase4-scheduling.spec.ts |

### Leave (LEV)

| ID | Phase | Module | Layer | Evidence |
|---|---|---|---|---|
| LEV-01 | 5 | validation | unit | test/unit/phase5-leave-validation.test.ts |
| LEV-02 | 5 | forms | component | test/component/phase5-leave-forms.test.tsx |
| LEV-03 | 5 | service | integration | test/integration/phase5-leave-service.test.ts |
| LEV-04 | 5 | journey | e2e | test/e2e/phase5-leave.spec.ts |

### Skills (SKL), Coverage (CVR), Map (MAP), Evidence (EVD)

| ID | Phase | Module | Layer | Evidence |
|---|---|---|---|---|
| SKL-01 | 6 | validation | unit | test/unit/phase6-capabilities-validation.test.ts |
| SKL-02 | 6 | forms | component | test/component/phase6-capability-forms.test.tsx |
| SKL-03 | 6 | service | integration | test/integration/phase6-capabilities-service.test.ts |
| SKL-04 | 6 | journey | e2e | test/e2e/phase6-capabilities.spec.ts |
| CVR-01 | 7 | validation | unit | test/unit/phase7-coverage-validation.test.ts |
| CVR-02 | 7 | forms | component | test/component/phase7-coverage-forms.test.tsx |
| CVR-03 | 7 | service | integration | test/integration/phase7-coverage-service.test.ts |
| CVR-04 | 7 | journey | e2e | test/e2e/phase7-coverage.spec.ts |
| MAP-01 | 8 | validation | unit | test/unit/phase8-map-validation.test.ts |
| MAP-02 | 8 | component | component | test/component/phase8-planning-map.test.tsx |
| MAP-03 | 8 | service | integration | test/integration/phase8-planning-map-service.test.ts |
| MAP-04 | 8 | journey | e2e | test/e2e/phase8-planning-map.spec.ts |
| EVD-01 | 9 | validation | unit | test/unit/evidence-validation.test.ts |
| EVD-02 | 9 | forms | component | test/component/phase9-evidence-forms.test.tsx |
| EVD-03 | 9 | service | integration | test/integration/phase9-evidence-service.test.ts |
| EVD-04 | 9 | journey | e2e | test/e2e/phase9-evidence.spec.ts |

### Collaboration, notifications, audit, reports

| ID | Phase | Module | Layer | Evidence |
|---|---|---|---|---|
| COL-01 | 10 | collaboration forms | component | test/component/phase10-collaboration-forms.test.tsx |
| COL-02 | 10 | collaboration service | integration | test/integration/phase10-collaboration-service.test.ts |
| COL-03 | 10 | management-note authorization | integration | test/integration/phase10-management-note-authorization.test.ts |
| COL-04 | 10 | collaboration journey | e2e | test/e2e/phase10-collaboration.spec.ts |
| NTF-01 | 10 | notification centre | integration | test/integration/phase10-collaboration-service.test.ts |
| NTF-02 | 10 | notification centre component | component | test/component/phase10-collaboration-forms.test.tsx |
| AUD-01 | 1 | audit validation | unit | test/unit/audit-validation.test.ts |
| AUD-02 | 10 | audit interface | integration | test/integration/phase10-collaboration-service.test.ts |
| RPT-01 | 11 | reporting validation | unit | test/unit/phase11-reporting-validation.test.ts |
| RPT-02 | 11 | reporting forms | component | test/component/phase11-reporting-forms.test.tsx |
| RPT-03 | 11 | reporting service | integration | test/integration/phase11-reporting-service.test.ts |
| RPT-04 | 11 | reporting journey | e2e | test/e2e/phase11-reporting.spec.ts |

## Cross-cutting coverage

Role and scope boundaries are exercised across Super Admin, the two scoped Admin personas, the two
Employee personas, and the anonymous caller, primarily in `AUTH-02`, `AUTH-03`, and each domain
service and E2E scenario. Privacy is proved by negative leakage assertions that search for distinctive
private markers in DOM, projections, API responses, CSV bytes, and audit metadata. State transitions
are covered by the scheduling, leave, coverage, and evidence services. Validation boundaries are
covered by every unit and service suite. Transaction and rollback evidence is present in every
multi-record mutation suite (`SYS-06`, `EMP-06`, `ORG-03`, `SCH-03`, `LEV-03`, `CVR-03`, `EVD-03`,
`COL-02`, `RPT-03`). Concurrency evidence is present in the foundation, employee, scheduling, leave,
coverage, evidence, and collaboration services and is repeated three times by `SYS-11`.

The full hardening report is
[`SCOPEIS_PRE_PHASE_12_SYSTEM_WIDE_HARDENING_AND_REGRESSION_LOCK_R1.md`](../phase-reports/SCOPEIS_PRE_PHASE_12_SYSTEM_WIDE_HARDENING_AND_REGRESSION_LOCK_R1.md).
