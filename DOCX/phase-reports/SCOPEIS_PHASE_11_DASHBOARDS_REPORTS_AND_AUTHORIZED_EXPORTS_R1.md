# Phase 11 — Dashboards, reports, and authorized exports R1

**Classification:** `SCOPEIS_PHASE_11_COMPLETED_AND_PUSHED`

**Phase ID:** `SCOPEIS_PHASE_11_DASHBOARDS_REPORTS_AND_AUTHORIZED_EXPORTS_R1`

**Starting point:** `52b01f9bfd078fa15ead12dbdd32b907f8630e60` (`fix: enforce current authorization for management notes`) on `main`, `main...origin/main` at `0/0`.

## 1. Journey delivered

`A Super Admin or scoped Admin opens the dashboard for a role- and scope-correct summary → opens an authorized report → sees correctly-scoped rows with an as-of time → drills into the underlying authorized record → streams a bounded CSV export of the reports their role may export. An Employee receives self-only dashboard information and no reporting access at all.`

`/dashboard` replaced its Phase 1 shell with a role-branched operational summary. `/reports` became a scope-enforced index over thirteen registered metric contracts. Authoritative staffing metrics read only the current **Published** schedule; the Draft and Proposed planning view is a separate, explicitly labelled report. Availability terminology was removed in favour of a bounded conflict fact. Exports stream bounded CSV with per-request reauthorization.

## 2. Final metric definitions

Every registered metric declares its source of truth, grain, inclusion rule, exclusion rule, date interpretation, role policy, privacy class, deterministic ordering, empty-state behaviour and scope predicate in `src/modules/reporting/definitions.ts`. Nothing is rendered or exported that is not registered there.

| Key | Grain | Source | Window maximum |
| --- | --- | --- | --- |
| `published-allocation` | one row per Published assignment | `schedule_assignments` ⋈ current `schedule_periods` ⋈ projects/locations/clients/users | 12 months |
| `unallocated-employees` | one row per active in-scope employee | active users with a profile, minus the distinct employee set of the Published allocation | 12 months |
| `scheduled-hours` | one row per employee | Published allocation grouped by employee | 12 months |
| `planning-unpublished` | one row per Draft/Proposed assignment | `schedule_assignments` ⋈ `schedule_periods` where status ∈ {DRAFT, PROPOSED} | 12 months |
| `approved-leave` | one row per approved leave request | `leave_requests` status APPROVED intersecting the window | 90 days |
| `leave-balance` | one row per active in-scope employee | `leave_allowance_settings` minus approved intersecting working days | 12 months |
| `coverage-replacement` | one row per replacement request | `replacement_requests` joined to the anchor assignment | 90 days |
| `skills-coverage` | one row per active skill | `skills` with the in-scope non-archived `employee_skills` count | 12 months |
| `skill-gaps` | one row per requirement | non-archived `staffing_requirements` and `assignment_skill_requirements` compared with `employee_skills` | 12 months |
| `certification-status` | one row per non-archived certification | `employee_evidence` where `kind='certification'` | 12 months |
| `evidence-review-queue` | one row per unreviewed evidence item | `employee_evidence` where `review_state='unreviewed'` and not archived | 12 months |
| `schedule-lifecycle` | one row per client-month | `schedule_periods` grouped by client and planning month | 12 months |
| `audit-history` | one row per audit event | `audit_events` through the Phase 10 allowlist | 12 months |

**Scheduled hours** are the arithmetic sum of each Published assignment's start and end time, displayed to two decimals, with the calculation stated in the report footer. They are never described as worked hours, actual hours, attendance, or a capacity measure.

**Active employee** is `users.active = true` with a corresponding `employee_profiles` row.

## 3. The conflict fact

The system stores no authoritative working-hours or capacity data, so Phase 11 never classifies a person as generally available. The only permitted employee-related derived fact is named exactly:

> `No known schedule or approved-leave conflict`

It may establish only that the employee is active, that no approved leave covers the selected Dubai business date, and that no current Published assignment overlaps the selected half-open time window. Permitted values, exactly:

1. `No known schedule or approved-leave conflict`
2. `Approved leave on the selected date`
3. `Published assignment overlaps the selected time window`
4. `Approved leave and published assignment overlap`

Column header: `Schedule and approved-leave conflict`. Defaults are today's Dubai date and the full business day. A custom window uses half-open overlap: assignment start `<` selected end and assignment end `>` selected start. For the approved-leave report the selected date must fall inside the requested window. `employee_profiles.working_pattern` is never read.

## 4. Role, scope, privacy and export matrix

| Capability | Super Admin | Scoped Admin | Employee |
| --- | --- | --- | --- |
| `/dashboard` | Global cards | Current-scope cards | Self-only cards |
| `/reports` | Yes | Yes | `404` |
| R1, R2, R3 | Global | Current scope | No report route |
| `planning-unpublished` | Global | Current scope, **view-only** | `404` |
| `approved-leave` | Global | Current scope, no reasons or responses | No report route |
| `leave-balance` | Yes | No | Own balance via dashboard |
| `coverage-replacement` | Global | Requests anchored in current scope | No |
| `skills-coverage`, `skill-gaps` | Global | Current scope | Own skills via dashboard |
| `certification-status` | Full projection | Locked summary projection only | Own status via dashboard |
| `evidence-review-queue` | Yes | No | No |
| `schedule-lifecycle` | Global | Current-scope clients | No |
| `audit-history` | Yes | `404` | `404` |
| CSV export | Every exportable report including planning; never audit | `published-allocation` and `certification-status` only | None |
| Planning export | Yes | Neutral refusal, audited | No |

**Admin R4 boundary (recording the reconciliation explicitly):** a scoped Admin may **open** the planning report for records inside their current effective scope, consistent with their existing scoped scheduling authority, but may **not export** it in V1. An Admin export request for `planning-unpublished` returns the same neutral refusal as an unknown key, produces no CSV, and writes one `report.export.refused` event with `reason: forbidden`.

**R10 canonical key:** `certification-status`. A scoped Admin receives the approved summary fields only — title, issuer, issue date, expiry date, expiry state, review state, related skill name — both on the page and in the export; the summary projection is role-specific rather than a separate route key. On-screen the Admin projection therefore carries no employee attribution, which is the locked Phase 9 field list rather than an oversight.

**Excluded from every report, export, count, filter option list and empty state:** leave reasons and private decision responses; private management-note content; operational-note content; discussion message bodies; notification internals; CV and portfolio contents; evidence files, storage keys and private download URLs; evidence details and external URLs withheld from scoped Admins; precise home addresses and coordinates; credentials, tokens, sessions, environment values, connection strings and internal paths; raw audit metadata; the `sessions` table entirely.

Counts apply the same authorization predicate as their rows, and filter option lists are scope-filtered, so neither a total nor the number of options can reveal a hidden entity.

## 5. Export contract

Streamed CSV, UTF-8 with BOM, `text/csv; charset=utf-8`. Never stored: no export file, no export table, no public or permanent URL. Authorization is re-resolved on the export request from the database, so a demotion, deactivation or revoked grant between the page render and the export click cannot produce a file. The projection is the same one the page renders. Column and row order are deterministic. Filenames are server-generated ASCII (`scopeis-<report-key>-<from>-<to>.csv`, and `scopeis-planning-unpublished-<from>-<to>.csv` for R4) with an RFC 5987 fallback. Headers include `Cache-Control: private, no-store, max-age=0` and `X-Content-Type-Options: nosniff`. Every cell whose first character is `=`, `+`, `-`, `@`, tab or carriage return is neutralised with a leading single quote and quoted. The cap is 5,000 data rows; over-cap results are refused with `Narrow the date range or filters (limit 5,000 rows)` and no partial file is emitted. Each successful export writes exactly one `report.export.generated` event (report key, format, from, to, row count, outcome) and each refusal one `report.export.refused` event (normalised report key or the literal `unknown`, plus reason `too_large` / `out_of_scope` / `forbidden`). Row contents, employee names and file bytes are never audited or logged. The audit write happens before the response is built, so a forced audit failure prevents the export. No database transaction is held open across the stream.

## 6. Migration

**No migration was needed.** Every metric reads columns that already exist, and exports are streamed rather than stored, so no table, journal entry or adoption-fingerprint state was added. Verified unchanged state: **32 tables** and **12 migration-ledger rows**, with `npm run test:migration` green (8/8), which is the evidence that no accidental schema drift occurred.

## 7. Gate results (final committed state)

| # | Gate | Command | Result | Totals | Skips |
| --- | --- | --- | --- | --- | --- |
| 1 | Typecheck | `npm run typecheck` | PASS (exit 0) | — | 0 |
| 2 | Unit | `npm run test:unit` | PASS | 75/75 in 16 files | 0 |
| 3 | Component | `npm run test:component` | PASS | 41/41 in 13 files, database-free | 0 |
| 4 | Aggregate integration | `npm run test:integration` | PASS | 11/11 suites, 102/102 | 0 |
| 5 | Phase 11 focused service | `npm run test:phase11-service` | PASS | 24/24 | 0 |
| 6 | Phase 2–10 focused service | `npm run test:phase2-core` … `test:phase10-service` | PASS (each exit 0) | 13, 7, 5, 3, 3, 5, 1, 11, 26 | 0 |
| 7 | Migration | `npm run test:migration` | PASS | 8/8 | 0 |
| 8 | Aggregate E2E | `npm run test:e2e` | PASS | 11/11 suites, 72/72 | **0** |
| 9 | Phase 11 focused E2E | `npm run test:phase11-e2e` | PASS | 6/6 (3 journeys × desktop + mobile) | 0 |
| 10 | Route certification | `npm run test:route-certification` | PASS | 13/13 | 0 |
| 11 | Seed smoke | `npm run test:seed-smoke` | PASS (idempotent) | 3 verifications | 0 |
| 12 | Isolation | `npm run test:isolation` | PASS | 9/9 checks | 0 |
| 13 | Lint | `npm run lint` | PASS (exit 0) | — | 0 |
| 14 | Safe build | `npm run build:safe` | PASS (exit 0) | all routes emitted | 0 |
| 15 | Whitespace | `git diff --check`, `git diff --cached --check` | PASS (exit 0) | — | — |

Per-suite aggregate integration counts: Phase 1 = 5, Phase 2 = 13, Phase 3 = 7, Phase 4 = 5, Phase 5 = 3, Phase 6 = 3, Phase 7 = 4, Phase 8 = 1, Phase 9 = 11, Phase 10 = 26, Phase 11 = 24.

Per-suite aggregate E2E counts (desktop + mobile): Phase 1 = 14, Phase 2 = 20, Phase 3 = 14, Phase 4 = 2, Phase 5 = 2, Phase 6 = 2, Phase 7 = 2, Phase 8 = 4, Phase 9 = 4, Phase 10 = 2, Phase 11 = 6.

### Environmental incidents

One environmental interruption occurred and was resolved without touching any manifest: Playwright's Chromium headless-shell binary was absent from the local cache, so `npx playwright install chromium` was run through the repository's local CLI. `package.json` and the lockfile were unchanged by that command. No test was skipped at any point.

## 8. Accuracy and scope results

- R1 returns one row per assignment with unique ids and no fan-out duplication; the Published and planning reports share no rows in either direction.
- R2 equals the active in-scope employee count minus the distinct Published employee set for the same window.
- R3 equals the arithmetic sum of the returned assignment intervals (Cora Bell `4.00`, Dan Unscoped `2.50` in the fixture window).
- R5 excludes PENDING, REJECTED and CANCELLED from approved-day totals and refuses a conflict date outside the requested window.
- The conflict fact returns one of exactly four values and is unaffected by a contradictory `working_pattern`.
- R8 excludes archived employee skills; R9 emits only `recorded` and `not recorded`.
- R12 counts each client-month once with its effective state and lists revisions without double counting.
- Reporting is read-only: skill, evidence and assignment row counts are identical before and after every report executes.
- A scope revocation removes rows on the next request without a re-login; a demotion to Employee and a deactivation both produce the non-enumerating refusal.

## 9. Privacy results

A distinctive fictional private marker was seeded into the approved-leave `private_reason` and `decision_response` columns. It was searched across every rendered projection, the authorized CSV bytes, error output, filter options and audit metadata, and appears in none of them. The scoped-Admin certification projection carries no employee attribution, no details, no external URL and no file metadata. Audit history renders only allowlisted metadata and the audit report has no export.

## 10. Known limitations

- A fleet-wide "open coverage gaps" figure is not offered: coverage gaps are computed per anchor assignment and no authoritative scope-wide query exists. The coverage report presents pending replacement requests and states the limitation.
- No capacity denominator exists, so no utilization metric is offered.
- No expiring-soon threshold exists, so the certification report shows factual expiry state only.
- `employee_profiles.working_pattern` is unused because it is documentation-only free text.
- The Phase 8 planning map still carries its older `Approved unavailable` filter label. That surface was explicitly out of scope and remains an unreconciled terminology inconsistency for a later, deliberately scoped change.
- The scoped-Admin certification report omits employee attribution because the locked Phase 9 summary field list defines the projection.

## 11. Deferred decisions

XLSX and PDF export formats · wider scoped-Admin exports · Employee self-export · Phase 9 sub-phase 9.9 (whether verification affects coverage or replacement eligibility).

## 12. Custody and preservation

Work was performed on `main` only, starting from `52b01f9bfd078fa15ead12dbdd32b907f8630e60`. `prototype/full-frontend-r1/` and `scripts/remediate-r2-persistent-test-incident.mjs` were preserved untouched and unstaged. Every `.env*` file was preserved untouched; no secret value was read or printed, and no production database, storage, authentication, hosting or deployment was contacted. Plain `npm run build` was not executed; `npm run build:safe` remains the only sanctioned build. The Phase 8 planning map was not modified. The Preview worktree (`preview` at `7c401c6add34db14c43b2139aebc9c8878618927` with its five pre-existing untracked duplicates) was not modified, merged, rebased, staged, cleaned or pushed. The commit and push result are recorded in the delivery message; Phase 12 was not started.
