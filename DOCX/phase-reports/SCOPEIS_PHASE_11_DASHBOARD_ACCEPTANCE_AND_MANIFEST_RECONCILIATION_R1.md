# Phase 11 dashboard acceptance and manifest reconciliation R1

**Classification:** `SCOPEIS_PHASE_11_RECONCILIATION_COMPLETED_AND_PUSHED`

**Remediation ID:** `SCOPEIS_PHASE_11_DASHBOARD_ACCEPTANCE_AND_MANIFEST_RECONCILIATION_R1`

**Starting point:** `e08f76f1aa76cb8c916ca12cba9a3daa63d53333` (`feat: implement Phase 11 dashboards reports and exports`) on `main`, `main...origin/main` at `0/0`.

## 1. What this reconciliation checked

Two possible inconsistencies in the Phase 11 completion receipt were investigated against the repository rather than the summary:

1. Whether the reported commit-file categories were misclassified.
2. Whether the dashboard delivered fewer information surfaces than the approved acceptance contract.

The two turned out to be different kinds of problem. The manifest issue was a conversational miscount with no corresponding repository-documentation error. The dashboard issue was a **genuine acceptance gap**: two approved Super Admin surfaces and one approved Employee area were missing from the implementation.

## 2. Authoritative commit manifest

Obtained directly from Git for `e08f76f1aa76cb8c916ca12cba9a3daa63d53333`:

| Category | Count | Rule applied |
| --- | ---: | --- |
| Documentation | **11** | `DOCX/**` (9) + `PROJECT_CONTEXT.md` + `README.md` |
| Harness and configuration | **7** | `scripts/**` (5) + `package.json` + `playwright.phase11.config.ts` |
| Application | **20** | `src/**` |
| Tests | **5** | `test/**` |
| **Total** | **43** | 25 added, 18 modified |

No file failed to fit a category, and the category totals sum exactly to the commit total.

### Exact files by category

**Documentation (11):** `DOCX/INDEX.md` · `DOCX/project-memory/DECISIONS_AND_CONSTRAINTS.md` · `DOCX/project-memory/IMPLEMENTATION_ROADMAP.md` · `DOCX/project-memory/IMPLEMENTATION_STATUS_LOG.md` · `DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md` · `DOCX/project-memory/PHASE_11_REPORTING_DECISIONS.md` · `DOCX/project-memory/PROJECT_OVERVIEW.md` · `DOCX/project-memory/ROLE_AND_PERMISSION_MODEL.md` · `DOCX/phase-reports/SCOPEIS_PHASE_11_DASHBOARDS_REPORTS_AND_AUTHORIZED_EXPORTS_R1.md` · `PROJECT_CONTEXT.md` · `README.md`

**Harness and configuration (7):** `package.json` · `playwright.phase11.config.ts` · `scripts/phase11-test-fixtures.mjs` · `scripts/run-phase11-playwright.mjs` · `scripts/run-phase11-service-tests.mjs` · `scripts/run-aggregate-e2e-tests.mjs` · `scripts/run-aggregate-integration-tests.mjs`

**Application (20):** `src/app/(protected)/dashboard/page.tsx` · `src/app/(protected)/reports/page.tsx` · `src/app/(protected)/reports/[reportKey]/page.tsx` · `src/app/api/reports/[reportKey]/export/route.ts` · `src/app/layout.tsx` · `src/app/phase11.css` · `src/modules/audit/presentation.ts` · `src/modules/authorization/capabilities.ts` · `src/modules/authorization/current-actor.ts` · `src/modules/navigation/navigation.ts` · `src/modules/reporting/csv.ts` · `src/modules/reporting/date-rules.ts` · `src/modules/reporting/definitions.ts` · `src/modules/reporting/domain-error.ts` · `src/modules/reporting/export-service.ts` · `src/modules/reporting/forms.tsx` · `src/modules/reporting/presentation.ts` · `src/modules/reporting/repositories.ts` · `src/modules/reporting/service.ts` · `src/modules/reporting/validation.ts`

**Tests (5):** `test/component/phase11-reporting-forms.test.tsx` · `test/e2e/phase11-reporting.spec.ts` · `test/integration/phase11-reporting-service.test.ts` · `test/unit/phase11-reporting-validation.test.ts` · `test/route-certification/phase1-http.test.ts`

### Why the earlier categorisation differed

The completion receipt reported `Documentation 10 · Harness 7 · Application 21 · Tests 5`. The Git manifest shows `11 · 7 · 20 · 5`.

- **Documentation** was under-labelled by one: the prose grouped `PROJECT_CONTEXT.md` and `README.md` with the `DOCX/**` set but wrote the label `10` while enumerating eleven files.
- **Application** was over-labelled by one: the enumerated `src/**` list contains twenty paths, and the prose label said `21` without a twenty-first file.

**The Phase 11 report and every authoritative summary document were checked for the same statement and contain no committed-file counts or exact-file claim at all**, so no repository documentation was inaccurate on this point. The miscount existed only in the conversational completion receipt, and per the remediation instruction the distinction is recorded here rather than by editing unrelated documentation. The Phase 11 commit was **not** amended or rewritten.

## 3. Super Admin dashboard acceptance — twelve surfaces

The approved contract requires twelve distinct, named information surfaces. Before this reconciliation the dashboard delivered **ten**: nine cards plus the employees-by-team table. **Schedule lifecycle and Recent recorded actions were genuinely missing**, not merely implied.

| # | Approved surface | Delivered as | Visible heading | Metric key | Source | Window | Drill-down | Test | Empty / missing-source |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Active employees | card | `Active employees` | `active-employees` | `users.active` ∧ `employee_profiles` | none | `/employees` | integration card-set + 12-surface test; component 12-surface test; E2E dashboard | `0`; never "unknown" |
| 2 | Employees by team | table section | `Employees by team` | `employees-by-team` | `employee_profiles.team` grouped | none | `/employees` | component 12-surface + region test; integration surface test | `No active employee is recorded yet.` |
| 3 | Current Published client-month schedules | card | `Current Published client-months` | `published-periods` | `schedule_periods` PUBLISHED ∧ current | current Dubai month | `/schedule` | integration surface test; E2E | `0` |
| 4 | Published assignments this month | card | `Published assignments this month` | `published-assignments` | current Published `schedule_assignments` | current Dubai month | `/reports/published-allocation` | integration count reconciliation; E2E drill-down | `0` |
| 5 | Employees with no Published assignment this month | card | `Employees with no Published assignment this month` | `unallocated` | active in-scope employees − Published set | current Dubai month | `/reports/unallocated-employees` | integration R2 reconciliation | `0` |
| 6 | Pending leave requests | card | `Pending leave requests` | `pending-leave` | `leave_requests` status PENDING | none | `/leave` | integration surface test | `0` |
| 7 | Approved leave days this month | card | `Approved leave days this month` | `approved-leave-days` | approved leave ∩ month, `workingDays` | current Dubai month | `/reports/approved-leave` | integration surface test | `0` |
| 8 | Pending replacement requests | card | `Pending replacement requests` | `pending-replacements` | `replacement_requests` PENDING anchored in scope | none | `/replacements` | integration surface test | `0` |
| 9 | Capability evidence awaiting review | card | `Evidence awaiting review` | `awaiting-review` | `employee_evidence` unreviewed ∧ not archived | none | `/reports/evidence-review-queue` | integration surface test; E2E | `0` |
| 10 | Expired certifications | card | `Expired certifications` | `expired-certifications` | certifications, not archived, `expiry_date <` Dubai today | Dubai today | `/reports/certification-status` | integration card set | `0` |
| 11 | **Schedule lifecycle — added** | table section | `Schedule lifecycle` | `schedule-lifecycle` | `schedule_periods` grouped per client-month, effective state | all in-scope client-months | `/reports/schedule-lifecycle` | integration: per-state counts sum to the report total; component region test; E2E heading + region | `No schedule period exists yet.` |
| 12 | **Recent recorded actions — added** | table section | `Recent recorded actions` | `recent-actions` | `audit_events` newest five through the Phase 10 allowlist | newest five | `/audit` | integration: newest-first label after an audited action; component region test; E2E heading + region | `No recorded action matches the current history.` |

Every surface is independently named, source-backed, ordered, accessible (each table renders a labelled `role="region"` with a caption, and the region still renders when the surface is empty), testable, and carries its own drill-down where one exists. The page prints one "as of" timestamp in Asia/Dubai. **The reconciliation required application changes**, because two approved metrics were absent rather than consolidated. No metric definition was changed and no new metric was invented: both additions reuse existing repository reads and the existing `schedule-lifecycle` report contract and Phase 10 audit allowlist.

## 4. Employee dashboard acceptance — five areas

The approved contract requires five distinct information areas. Before this reconciliation the dashboard delivered **four**: assignments, skills, evidence and notifications. **My leave and balance was genuinely missing.**

| # | Approved area | Delivered as | Visible heading | Source | Privacy boundary | Date logic | Test |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | My current Published assignments for the next seven days | table section | `My published assignments (next 7 days)` | current Published `schedule_assignments` for the actor | own rows only | Dubai today + 6 days, inclusive | integration Published-only test; component area test; E2E heading + region |
| 2 | **My leave and balance — added** | card + table section | `My leave and balance` / `My leave` | `leaveService.getMyLeave(actor)` | own rows only; the private reason and decision response are never projected | Dubai calendar year for the balance | integration: balance equals the leave-service value and the private marker is absent |
| 3 | My recorded skills | card | `Skills I have recorded` | `employee_skills` ∧ `archived_at IS NULL` | own rows only | none | integration read-only and area tests |
| 4 | My capability evidence counts by review and expiry state | card | `My capability evidence` | own `employee_evidence` not archived | own rows only; approved review and expiry vocabularies only | Dubai business date for expiry | integration area test; component area test |
| 5 | My unread notifications | card | `My unread notifications` | `notifications` unread and not archived for the actor | own rows only | none | integration area test; E2E |

The leave balance is deliberately read from `leaveService.getMyLeave`, so the dashboard cannot drift from the authoritative allowance-minus-approved-working-days computation. The Employee projection still exposes no organisation total, no peer information, no Draft or Proposed schedule, no management navigation, no `/reports` route and no export.

## 5. Scoped Admin regression check

Confirmed unchanged and still present: employees in current scope · current-scope clients, projects and locations (as authorized filter options) · Published assignments this month in scope · in-scope employees with no Published assignment · approved leave days in scope with no reasons or responses · replacement requests raised by the actor and anchored in current scope · certification summary in scope.

Confirmed still absent: the audit card, the leave balance, the evidence review queue, the schedule-lifecycle and recent-action tables, and any out-of-scope row, count, identifier or option. A new integration assertion proves the Super-Admin-only sections are absent from the scoped Admin payload and that an out-of-scope client name does not appear.

## 6. Code changes made

| File | Change |
| --- | --- |
| `src/modules/reporting/service.ts` | Added the `Schedule lifecycle` and `Recent recorded actions` Super Admin sections and the `My leave and balance` / `My leave` Employee surfaces; sections now carry a question, an explicit empty state and an optional drill-down; the Employee balance is read from `leaveService.getMyLeave` |
| `src/modules/reporting/forms.tsx` | Section headings now render with their question, drill-down link and per-surface empty state; the labelled table region now renders even when the surface is empty so an empty surface stays named and announced |
| `src/app/phase11.css` | Styling for the section header and its drill-down, including the mobile stack |

No metric definition, authorization rule, privacy rule, export rule, conflict-fact value, Published-only rule or R4/R10 boundary was altered. No new report, export format or metric was introduced.

## 7. Tests added or strengthened

- **Integration (3 new scenarios, 27 total):** all twelve Super Admin surfaces named and backed, with the per-state lifecycle counts summing to the report total and the recent-action surface reflecting the newest audited action through the allowlist; all five Employee areas with the balance equal to `leaveService.getMyLeave` and the private marker absent; the scoped Admin approved shape with the Super-Admin-only sections and out-of-scope content absent.
- **Component (4 new scenarios, 13 total):** the twelve Super Admin surfaces render as nine named cards plus three labelled regions with drill-downs; the five Employee areas render with no management surface; every section's empty state is explicit and distinct from a missing source; the prohibited-terminology scan passes on the reconciled surfaces.
- **E2E (strengthened, 6 total):** the Super Admin journey now asserts the two new tables by heading and by labelled region; the Employee journey asserts all five areas including the leave card and leave table; the scoped Admin journey asserts the Super-Admin-only tables are absent. Desktop 1440×900 and mobile 390×844 both pass with the existing horizontal-overflow assertions.

No existing test was weakened or deleted. One component assertion was tightened from a generic fallback to the report contract's own empty-state text, which is stricter.

## 8. Gate results (reconciliation commit)

| # | Gate | Result | Totals | Skips |
| --- | --- | --- | --- | --- |
| 1 | `npm run typecheck` | PASS (exit 0) | — | 0 |
| 2 | `npm run test:unit` | PASS | 75/75 in 16 files | 0 |
| 3 | `npm run test:component` | PASS | 45/45 in 13 files, database-free | 0 |
| 4 | `npm run test:integration` | PASS | 11/11 suites, 105/105 | 0 |
| 5 | `npm run test:phase11-service` | PASS | 27/27 | 0 |
| 6 | Phase 2–10 focused service runners | PASS (each exit 0) | 13, 7, 5, 3, 3, 5, 1, 11, 26 | 0 |
| 7 | `npm run test:migration` | PASS | 8/8 | 0 |
| 8 | `npm run test:e2e` | PASS | 11/11 suites, 72/72 | **0** |
| 9 | `npm run test:phase11-e2e` | PASS | 6/6 | 0 |
| 10 | `npm run test:route-certification` | PASS | 13/13 | 0 |
| 11 | `npm run test:seed-smoke` | PASS (idempotent) | 3 verifications | 0 |
| 12 | `npm run test:isolation` | PASS | 9/9 | 0 |
| 13 | `npm run lint` | PASS (exit 0) | — | 0 |
| 14 | `npm run build:safe` | PASS (exit 0) | all routes emitted | 0 |
| 15 | `git diff --check` / `--cached --check` | PASS (exit 0) | — | — |

No failures, no skips, no reruns and no environmental interruptions. Plain `npm run build` was not executed.

## 9. Custody

Work was performed on `main` only, starting from `e08f76f1aa76cb8c916ca12cba9a3daa63d53333`, and the Phase 11 commit was neither amended nor rewritten. `prototype/full-frontend-r1/` and `scripts/remediate-r2-persistent-test-incident.mjs` were preserved untouched and unstaged. Every `.env*` file was preserved untouched; no secret value was read or printed, and no production database, storage, authentication, hosting or deployment was contacted. The Phase 8 planning map was not modified. The Preview worktree (`preview` at `7c401c6add34db14c43b2139aebc9c8878618927` with its five pre-existing untracked duplicates) was not modified, merged, rebased, staged, cleaned or pushed. The commit and push result are recorded in the delivery message; **Phase 12 was not started.**

## 10. Remaining debt

Unchanged from Phase 11: no fleet-wide coverage-gap figure; no capacity denominator; no expiring-soon threshold; `working_pattern` unused; the Phase 8 map still carries its older `Approved unavailable` label as an explicitly out-of-scope inconsistency; the scoped-Admin certification report omits employee attribution by the locked Phase 9 field list. Deferred decisions also unchanged: XLSX/PDF, wider Admin exports, Employee self-export, and Phase 9 sub-phase 9.9.
