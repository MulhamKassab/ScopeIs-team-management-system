# SCOPEIS_PHASE_4_SCHEDULING_DRAFT_PROPOSED_PUBLISHED_JOURNEY_R1

## Completion classification

**COMPLETED for the approved Phase 4 V1 journey.** The verified journey is: an authorized manager creates a Client-month Draft, adds assignments using real active Employee/Client/Project/Location records, proposes the period, Super Admin publishes it, and an Employee sees only their own current Published assignments. The broader assignment-type expansion listed in the older roadmap is explicitly deferred; V1 supports same-day timed one-time assignments only.

No production access, production migration, production QA, deployment, Phase 5 work, or later-phase work occurred.

## Git custody

Starting custody was independently inspected before modification:

- Repository root: `/Users/mulhamkassab/Desktop/For Me/ScopeIs Team Management System`
- Branch: `main`
- Starting HEAD: `f2d99d5c09b7874931d303a9cbdddcd9a9dc0943`
- Remote: `origin https://github.com/MulhamKassab/ScopeIs-team-management-system.git`
- Starting `main...origin/main`: ahead `0`, behind `0`
- Owner-supplied commit matched checked-out HEAD exactly.
- No Git lock, merge, rebase, cherry-pick, or unmerged-branch state was present.
- Existing branches were inspected; no branch was switched or created.

The final delivery step uses one reviewed Phase 4-focused commit and a normal push to `origin/main`. The exact resulting commit hash and final ahead/behind alignment are recorded in the delivery response because this report is itself part of the committed tree.

## Phase 3 architecture reconciled

Phase 4 uses the Phase 3 normalized `clients`, `projects`, `locations`, and `project_locations` records. The shared `hasOperationalTargetScope` helper preserves Phase 3 semantics: Client scope inherits downward, Project/Location scope stays narrow, and relationship fields do not authorize scheduling. Schedule assignments remain separate from operational relationships, staffing requirements, arrangement labels, designation, hierarchy, team membership, and account-manager/responsible-admin fields.

Employee selection reuses the established TEAM-based `canReadEmployee` projection. Operational Client/Project/Location authority does not become permission to browse employees. The existing audit and notification persistence services are reused transactionally.

## Schema and migration

Added additive migration `0005_phase_4_scheduling.sql`; existing migrations were not edited. The schema adds:

- `schedule_period_status` enum with `DRAFT`, `PROPOSED`, and `PUBLISHED`.
- `schedule_periods`: one Client, first day of planning month, revision lineage, revision number, optional parent period, lifecycle state, current-published flag, return reason, lifecycle timestamps, and optimistic version.
- `schedule_assignments`: period, Employee, Project, Location, assignment date, `time(0)` local start/end, optional short shared instruction, copied-from predecessor, and optimistic version.
- Restrictive foreign keys, first-day/time-order/instruction-length/version checks, period/revision and lookup indexes, and partial unique indexes preventing concurrent active Draft/Proposed duplicates and multiple current Published versions for a Client-month.

Migration journal and adoption fingerprints were updated using the repository’s established process. Migration/export fingerprint parity passed with 24 public tables and 6 migration-ledger rows.

## Lifecycle and revision semantics

- `DRAFT`: authorized editing; assignment add/edit/remove is allowed.
- `PROPOSED`: read-only and awaiting Super Admin review.
- `PUBLISHED`: immutable employee-visible version.
- Super Admin can return `PROPOSED` to `DRAFT` with a required audited reason presence; the reason is stored on the schedule period, while audit metadata contains only safe `reasonProvided` data.
- Publication atomically makes the Proposed period the current Published version and leaves prior Published versions immutable historical evidence.
- A Published change creates a linked editable Draft revision and copies assignments with predecessor links. Published rows are never updated in place.

## Authorization and privacy matrix

| Actor/capability | Phase 4 behavior |
|---|---|
| Super Admin | Global schedule management; create/manage all Client-month periods; propose, return, publish, and create revisions. |
| Client-scoped Admin | Manage Draft assignments for the authorized Client; create that Client-month Draft and propose it; cannot publish or return/publish revisions. |
| Project-scoped Admin | Narrow assignment work only within an existing authorized Client Draft and authorized Project; cannot create the Client-period container or propose the whole Client schedule. |
| Location-scoped Admin | Narrow assignment work only within an existing authorized Client Draft and authorized Location; cannot climb to Client-wide/sibling authority or propose the whole schedule. |
| Unscoped/relationship-only Admin | No schedule management authority. Account-manager, responsible-admin, operational association, designation, hierarchy, and arrangement labels grant none. |
| Employee | Only own assignments from current Published periods; no Draft, Proposed, superseded, other-employee, management, address, coordinate, contact, access-instruction, scope, staffing, private-note, or audit fields. |

The manager route is `/schedule` with server-side role branching. Client/Project/Location cascading is server-backed and relationship validation is repeated at the service boundary. Unauthorized and no-TEAM-visibility states are explicit and non-enumerating.

## Time model

The organization planning timezone is explicitly `Asia/Dubai`. V1 stores a calendar date and local wall-clock `time(0)` start/end values, requires the date to be inside the Client-month, and requires end strictly after start. UI surfaces the timezone in manager and Employee views. No UTC conversion, multi-day, recurring, all-day, on-call, attendance, payroll, travel, or route behavior was added.

## Integrity, overlap, and transactions

Same-Employee same-date overlaps are checked across active Draft, Proposed, and Published periods. Each Employee/date key is serialized with a PostgreSQL transaction advisory lock before querying overlap candidates, preventing concurrent submissions from bypassing the check. A copied unchanged predecessor in the immediately preceding Published revision is exempted from self-conflict; overlaps with other Client-month work remain blocked.

Period and assignment mutations use optimistic versions. Client → Project → Location, active-record, same-Client, linked-location, month, time-order, and Employee-role/activity checks are server-side. Forced audit failure was tested to roll back schedule mutation. No leave, working-pattern, staffing, skill, severity, override, coverage, or replacement logic was added.

## Audit and notification behavior

Create, assignment create/update/remove, propose, return, publish, and revision events write sanitized identifiers, lifecycle values, counts, and safe relationship IDs through the existing audit service in the same database transaction. Sensitive instructions, addresses, contacts, access text, coordinates, and return-reason contents are not audit metadata.

Publication uses the existing generic notification persistence transactionally for affected Employees (`schedule.published`). No external delivery or notification-centre UI was added.

## Verification evidence

All commands were local-only and used owned disposable loopback PostgreSQL databases where persistence was required:

| Command/check | Result |
|---|---|
| `npm run db:migrate` | Passed; disposable target, idempotent migration path. |
| `npm run db:seed` | Passed; 5 fictional mock personas. |
| `npm run dev` | Passed; loopback `/login` smoke served successfully, then process was stopped. |
| `npm run test:migration` | Passed: 8/8; migration/journal/manifest/Drizzle schema parity. |
| `node scripts/run-phase4-service-tests.mjs` | Passed: 5/5 PostgreSQL service tests, including the concurrent cross-client overlap race. |
| `npm run test:unit` | Passed: 35/35 across 10 files. |
| `npm run test:component` | Passed: 14/14 across 5 files. |
| Targeted Phase 4 ESLint | Passed with `--max-warnings=0`. |
| `npm run typecheck` | Passed. |
| `git diff --check` | Passed. |
| Guarded safe build through `node scripts/run-phase4-playwright.mjs` | Passed isolated no-`.env*` build/server workflow. |
| Desktop Playwright | Passed: 1/1 at 1440×900. |
| Mobile Playwright | Passed: 1/1 at 390×844; horizontal-overflow assertion passed. |

The browser journey covered real seeded data: Nora creates Alpha Facilities May/June Drafts, cascades to Alpha Modernization and Alpha Shared Site, assigns Cora Bell, proposes, publishes, and Cora sees only `My Schedule` with date/time, identity, timezone, and short instruction. Initial harness-only failures (locator ambiguity, shared-month worker race, and transient action-status assertion) were corrected before the passing run; the underlying product journey then passed.

The repository-wide `npm run lint` check remains separately red with 97 errors and 6 warnings in the preserved user-owned `prototype/` tree. No prototype files were changed or staged; targeted Phase 4 ESLint passed.

## Controlled checkpoints

4.1 schedule-period model/lifecycle, 4.2 real assignment model, 4.3 scope/authorization, 4.4 monthly workspace/editor, 4.5 lifecycle/revision, 4.6 Employee projection, 4.7 overlap/concurrency/audit/transactions, and 4.8 targeted QA were all verified. The repository’s older 4.1–4.12 tracker mapping records 4.5’s broader assignment-type expansion as `DEFERRED` and all other applicable Phase 4 V1 gates as `COMPLETED`.

## Changed files

Phase 4 implementation and evidence files in the explicit staging allowlist:

- `DOCX/INDEX.md`
- `DOCX/phase-reports/SCOPEIS_PHASE_4_SCHEDULING_DRAFT_PROPOSED_PUBLISHED_JOURNEY_R1.md`
- `DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md`
- `DOCX/project-memory/PHASE_4_SCHEDULING_DOMAIN_DECISIONS.md`
- `PROJECT_CONTEXT.md`
- `scripts/phase2-migration-core.mjs`
- `scripts/phase4-test-fixtures.mjs`
- `scripts/run-phase4-playwright.mjs`
- `scripts/run-phase4-service-tests.mjs`
- `playwright.phase4.config.ts`
- `src/app/(protected)/schedule/page.tsx`
- `src/app/styles.css`
- `src/db/migrations/0005_phase_4_scheduling.sql`
- `src/db/migrations/meta/_journal.json`
- `src/db/migrations/meta/adoption-fingerprints.json`
- `src/db/schema/index.ts`
- `src/modules/authorization/operational-scope.ts`
- `src/modules/navigation/navigation.ts`
- `src/modules/operations/service.ts`
- `src/modules/scheduling/actions.ts`
- `src/modules/scheduling/domain-error.ts`
- `src/modules/scheduling/forms.tsx`
- `src/modules/scheduling/repositories.ts`
- `src/modules/scheduling/service.ts`
- `src/modules/scheduling/validation.ts`
- `test/component/phase4-scheduling-forms.test.tsx`
- `test/e2e/phase4-scheduling.spec.ts`
- `test/integration/phase4-scheduling-service.test.ts`
- `test/migration/phase2-database-foundation.test.ts`
- `test/unit/phase4-scheduling-validation.test.ts`

## Preserved user-owned work

The following unrelated pre-existing or user-owned work was not staged or altered for Phase 4: `README.md`, `package.json`, `playwright.config.ts`, `next-env.d.ts`, `src/app/(protected)/[module]/page.tsx`, `src/app/api/auth/mock-login/route.ts`, `src/db/seed/index.ts`, `src/modules/auth/session-service.ts`, `src/server/http.ts`, `test/e2e/foundation.spec.ts`, `test/integration/foundation-postgres.test.ts`, `prototype/`, `scripts/remediate-r2-persistent-test-incident.mjs`, `scripts/run-phase1-integration-tests.mjs`, `scripts/run-phase1-playwright.mjs`, `scripts/run-phase1-route-certification.mjs`, `scripts/run-phase1-safe-build.mjs`, `scripts/start-phase1-test-server.mjs`, and `test/route-certification/`.

The preserved repository-wide lint/inherited-runner interference described by the Phase 3 report remains separate and unchanged. Phase-scoped Phase 4 checks pass; it is not treated as a Phase 4 product blocker.

## Delivery and phase boundary

Before delivery, `git diff` and `git diff --cached` are reviewed and only the allowlist above is staged; no `git add .`, `git add -A`, reset, clean, restore, stash, rebase, destructive checkout, or force push is used. The final focused commit/push outcome is reported with the final custody state in the delivery response.

Phase 5 (leave/availability), Phase 6 (skills/capabilities), coverage/replacements, maps, tickets, production authentication, production migration, production QA, and production deployment were not started.

## Remaining blocker

There is no blocker for the approved Phase 4 V1 journey. Deferred by explicit scope: broader assignment types and all later planning/production phases listed above.
