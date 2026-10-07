# ScopeIs Phase 2 Core Employee and Catalogue Service Layer R1

**Status:** `BLOCKED_PHASE_2_CORE_SERVICE_VERIFICATION` (2026-08-29)

The implementation and focused disposable-database certification are complete, but this R1 cannot be marked certified until the existing Phase 1 integration and route-certification scripts can be run without modifying the persistent configured test database. Overall Phase 2 remains `PARTIAL`.

## Implemented boundary

- Drizzle repositories provide deterministic list/search, normalized duplicate detection, version-aware mutation, reference checks, profile projections, manager-chain queries, and employee-skill queries.
- Application services authorize each read and mutation: Super Admin manages global catalogues and employee records; Admin reads only records in an assigned `TEAM` scope; Employees read only their own profile/skills.
- The confirmed employee self-service fields are `workEmail`, `workPhone`, and `professionalSummary`. Role, team, manager, designation, active state, employee code, and default work location are management-controlled. Unknown self-service fields are rejected.
- Scoped Admin projections omit work contact, professional summary, manager, and default work location. The schema contains no protected home-address/coordinate field; no home data is introduced or exposed.
- Only Super Admin can mutate employee-skill associations. Employee self-maintenance of skills is intentionally denied because the current decisions do not expressly authorize it.
- Arrangement labels are global descriptive catalogue values only. The certified schema has no employee-label assignment relation; labels cannot affect permissions, availability, leave, coverage, replacement eligibility, work hours, or conflicts.
- Mutations use PostgreSQL transactions, optimistic versions, and atomic audit events. Failed audit writes roll back the business mutation.

## Verification

`npm run test:phase2-core` creates a uniquely named loopback disposable PostgreSQL database, runs the normal verified migration/reconciliation path, executes `test/integration/phase2-core-service.test.ts`, and drops the database. The R1 focused result was **1 file / 5 tests passed / 0 skipped**. It covered catalogue authorization and normalization, Admin Alpha/Bravo scope isolation, own-profile projection/update limits, manager-cycle prevention, stale versions, deactivation history, employee-skill access/mutation boundaries, auditing, transaction rollback, and deterministic pagination.

The legacy `test:integration` and `test:route-certification` commands were deliberately not executed in R1 because they currently target the persistent `.env.test` database and mutate sessions, audit rows, or scope fixtures. That conflicts with this task's explicit persistent-test-database prohibition. No pass status is claimed from historical results.

No production service was contacted, no production or persistent configured test database was migrated or modified by this focused suite, and no secrets are recorded here.

## Remaining Phase 2 work

Evidence/certifications/portfolio/files and storage access control, employee-management notes, notifications, API or Server Action boundaries, UI, and complete end-to-end certification remain outside this task.
