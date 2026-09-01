# ScopeIs Phase 2.1 Preserve and Reconcile Existing Employee Backend R1

**Phase ID:** `SCOPEIS_PHASE_2_1_PRESERVE_AND_RECONCILE_EXISTING_EMPLOYEE_BACKEND_R1`  
**Final classification:** `BLOCKED_GIT_CUSTODY_UNPROVEN_WORKTREE_BASELINE`  
**Date:** 2026-09-01

## Scope and final decision

This is backend-only Phase 2.1 reconciliation. No employee route, Server Action, API, screen, directory, filter, self-service UI, or later Phase 2 journey work was created. The current worktree contains a coherent employee profile/catalogue/employee-skill backend and its disposable PostgreSQL harness. The focused migration, policy, service, audit rollback, optimistic-version, and scoped-projection checks passed.

Phase 2.1 cannot be marked `COMPLETED` and must not be committed or pushed: the claimed R1/R3 service, migration, harness, test, and evidence files were already modified or untracked at the authorized start; the untracked artifacts have no reachable Git commit provenance. They are treated as user-owned. A safe isolated commit cannot include those files or truthfully claim them as task-owned. The one actual privacy defect discovered is corrected in the preserved worktree, but the full worktree remains custody-blocked until its owner establishes provenance and selects what may be committed.

## Custody

| Item | Starting observation | Final observation |
| --- | --- | --- |
| Repository root | `/Users/mulhamkassab/Desktop/For Me/ScopeIs Team Management System` | unchanged |
| Branch / HEAD | `main` / `26e5d5346086d56c4cac2664a66823f9e16b6f94` | unchanged |
| Remote relation | `main...origin/main` with `0 0` ahead/behind | unchanged |
| Git lock | no `.git/index.lock` | no destructive Git operation used |
| Existing worktree | 21 modified tracked files and 29 untracked paths/groups, including all claimed R1/R3 artifacts | preserved; this task added only the scoped skill-member projection/test and Phase 2.1 documentation updates |
| Active-process check | sandbox denied `ps`; no Git lock was present | no task-owned server/database process was started outside the disposable harness |

`git log --all` contains no history for the untracked R1/R3 reports, employee services/repositories/validation, migration scripts, disposable harness, or corresponding integration/migration tests. Their content also did not match an unreachable blob. This establishes their Git state as untracked, not their authorship or safe commit provenance.

## Reconciliation evidence

| Claimed capability | Actual files | Git state at start | Test coverage | Outcome |
| --- | --- | --- | --- | --- |
| Immutable Phase 2 migration | `src/db/migrations/0001_phase_2_employee_capabilities.sql`, `_journal.json` | tracked, clean | `npm run test:migration` (8/8) | **verified**; SHA-256 `d0dc109b1cca66b727ea2843186559c1b9e0f802ad001d8013322f6a2beddd60`, unchanged; no additive migration required |
| Runtime Drizzle model and adoption fingerprints | `src/db/schema/index.ts`, `meta/adoption-fingerprints.json`, migration core/fingerprint scripts | schema modified; fingerprints/scripts untracked | migration clean install, adoption, drift, runtime schema tests | **verified in worktree**, but custody unproven |
| Employee profiles | `employee-repositories.ts`, `employee-services.ts`, `employee-validation.ts`, `employee-policy.ts` | repositories/services/validation untracked; policy modified | focused core integration (5/5), policy unit (3/3) | **verified in worktree**: server-side validation, Super Admin management, own three-field mutation, scoped read policy, audit/version/rollback |
| Catalogues: designations, skills, arrangement labels | schema plus employee repository/service/validation files | schema/policy modified; service layer untracked | focused core integration | **verified in worktree**: Super Admin-only mutation, normalization, archive/version/audit behavior; labels remain descriptive only |
| Employee-skill associations | schema plus employee repository/service/validation files | schema modified; services/tests untracked | focused core integration | **verified after minimal correction**: Super Admin-only mutation, scoped read, stale version, archive, audit, rollback |
| Scoped Admin privacy | `employee-services.ts` | untracked | new focused integration assertions | **corrected**: Admin `listEmployeesForSkill` now returns `scopedProjection`, withholding `workEmail` and `defaultWorkLocation` |
| Audit, transactions, rollback, concurrency | `employee-services.ts`, audit service, core integration test | service/test untracked; audit service tracked | focused core integration | **verified in worktree**: audit writer is inside each transaction; forced audit failure rolls back; version predicates reject stale updates |
| Disposable PostgreSQL harness | `phase1-test-environment.mjs`, `disposable-test-database.mjs`, phase-2 runners | environment runner untracked; related configs modified | actual focused core and migration runs | **verified in worktree**: loopback-only preflight, unique temporary database, migration to State D, fixture check, owned-database cleanup |
| R1/R3 historical evidence | `SCOPEIS_PHASE_2_CORE_EMPLOYEE_SERVICE_LAYER_R1.md`, `...R3.md`, evidence backup | untracked | claims independently re-run only where in scope | **stale as provenance evidence, partially corroborated by current focused runs** |

## Schema and migration conclusion

The runtime schema exports the eight Phase 2 tables created by `0001`: `designations`, `skills`, `arrangement_labels`, `employee_profiles`, `employee_skills`, `employee_evidence`, `employee_files`, and `employee_management_notes`. Migration tests confirmed clean normal migration, exact ledgerless Phase 1 and Phase 1+2 adoption, State E no-mutation refusal, ledger/schema-drift refusal, runtime constraints/relations, Drizzle export fingerprint equality, and cleanup.

`0001` was not edited. Its journal order and adoption hash agree with the migration test. Evidence/files/notes structures were inspected only and remain preserved for their later owning phases.

## Confirmed backend rules

- Super Admin globally administers profiles and all three catalogues; Admin and Employee catalogue mutations are denied.
- Admin reads employees only through assigned `TEAM` scopes. Employee reads only their own profile/skills.
- Only `workEmail`, `workPhone`, and `professionalSummary` are self-editable; unknown or management-controlled fields are rejected.
- Role, manager, team, designation, active state, employee code, scope, protected home data, and employee skills cannot be self-changed.
- Scoped Admin profile and skill-member projections withhold `defaultWorkLocation`; the correction also withholds work email.
- Arrangement labels have no employee association and do not determine authorization, availability, leave, coverage, conflicts, or staffing.

## Minimal correction

`EmployeeSkillService.listEmployeesForSkill` formerly returned raw `employee_profiles` rows to scoped Admins. That path bypassed the existing `scopedProjection` and could disclose `defaultWorkLocation` (and work contact). The service now maps Admin results through the scoped projection, and the disposable integration test asserts both fields are absent. No data model, route, UI, or future-phase behavior changed.

## Disposable test safety and verification

The `.env.test` configuration was parsed without sourcing any production file. Its sanitized result was PostgreSQL `127.0.0.1:5432`, database name `scopeis_team_management_test`, test-name match true, production-like-name match false. The runner code requires a PostgreSQL loopback host, `APP_ENV=test`, `MOCK_AUTH_ENABLED=true`, a test-only configured name, observed loopback server/client addresses, and a separately named owned temporary database. It migrates that temporary database to State D and drops it in `finally`.

| Command | Result |
| --- | --- |
| `node --input-type=module -e '…loadPhase1TestConfiguration…'` | passed; sanitized loopback/test-only configuration reported |
| `npm run test:phase2-core` | passed twice through the disposable harness; final run: 1 file, 5 tests |
| `npm run test:migration` | passed; 1 file, 8 tests on disposable databases |
| `npx vitest run test/unit/employee-policy.test.ts` | passed; 1 file, 3 tests |
| `npm run typecheck -- --incremental false` | passed |
| `npm run lint` | passed |
| `git diff --check` | passed |

The first non-escalated core run was blocked by the workspace sandbox with `EPERM` before any database connection. The permitted rerun used only the repository harness and completed cleanup. `npm run test:unit -- --runInBand` was not a product failure: current Vitest rejects the unsupported Jest flag; the relevant policy test was then run successfully without that flag. Route/API, component, browser E2E, build, and persistent-test commands were intentionally not run because Phase 2.1 created no browser-facing employee journey and persistent test data is excluded.

## Limitations and required custody resolution

This reconciliation does not certify Phase 2 as a completed user journey. Routes, Server Actions/APIs, real employee UI, and desktop/mobile journey QA remain Phase 2.2–2.11 work. Production identity, database, backup/restore, and deployment remain unverified. No production environment file was sourced, no production/shared/persistent test data was queried or changed, and no deployment occurred.

Before any commit or push, the owner must establish the provenance of the pre-existing modified/untracked Phase 2 work, decide which files are authorized for inclusion, and provide a clean isolated commit set. Until then, do not stage, commit, or push the worktree.

## Related evidence

- [Phase 2 database reconciliation R1](SCOPEIS_PHASE_2_DATABASE_FOUNDATION_RECONCILIATION_R1.md)
- [Phase 2 core employee service R1](SCOPEIS_PHASE_2_CORE_EMPLOYEE_SERVICE_LAYER_R1.md)
- [Phase 2 core-service R3 closure](SCOPEIS_PHASE_2_CORE_SERVICE_INCIDENT_REMEDIATION_AND_VERIFICATION_CLOSURE_R3.md)
- [R3 incident evidence backup](evidence/SCOPEIS_R3_PERSISTENT_TEST_DB_INCIDENT_BACKUP.md)
