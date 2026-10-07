# Phase 11 — Reporting Decisions

Phase ID: `SCOPEIS_PHASE_11_DASHBOARDS_REPORTS_AND_AUTHORIZED_EXPORTS_R1`

This file records the decisions applied while implementing the Phase 11 dashboards, reports and authorized-exports journey. It supplements, and does not replace, [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md), [`ROLE_AND_PERMISSION_MODEL.md`](ROLE_AND_PERMISSION_MODEL.md) and [`DECISIONS_AND_CONSTRAINTS.md`](DECISIONS_AND_CONSTRAINTS.md).

## Confirmed by the product owner

1. **Scoped Admin report access.** Scoped Admins may open an approved set of reports — Published allocation, unallocated employees, scheduled hours, the unpublished planning view, approved leave, replacement status, recorded skills, required-versus-recorded skill gaps, the certification summary and schedule lifecycle — always clipped to their current effective scope. `module:reports:view` was therefore granted to `ADMIN` in `capabilities.ts` and in the route-certification module contract.
2. **Scoped Admin planning access.** A scoped Admin may open the separate `planning-unpublished` report for records inside their current effective scope, consistent with their existing scoped scheduling authority. It stays separate from Published allocation reporting, is labelled `PLANNING (unpublished)` on the page, heading, export filename and every exported row, never blends into a Published metric, re-reads role, active status and scope per request, and remains permanently closed to Employees.
3. **No general availability claim.** The system stores no authoritative working-hours or capacity data, so Phase 11 never classifies a person as generally available. The only permitted employee-related derived fact is the conflict fact.
4. **Leave balance.** Leave balance remains Super Admin-only as a management report and self-only through the Employee dashboard. A scoped Admin sees approved-leave dates and day counts only, never reasons or decision responses.
5. **Scoped Admin exports.** A scoped Admin may export exactly the Published allocation report and the `certification-status` summary projection. The planning report is **view-only** for Admin in V1; an Admin export request for `planning-unpublished` returns the same neutral refusal as an unknown key, produces no CSV, and is audited as `report.export.refused` with `reason: forbidden`.
6. **Employee exports.** No Employee self-export.
7. **Format.** CSV only. No runtime dependency was added; the writer is a small pure module.
8. **Audit export.** Audit history has no export, preserving the Phase 10 read-only property.
9. **Capacity.** No capacity or utilization metric exists in V1 because no capacity denominator is stored.
10. **Windows.** Default window is the current Dubai month for allocation, leave, lifecycle and planning, and the next seven days for the Employee assignment card. Maximum is 12 months for allocation, scheduled hours, planning and lifecycle, and 90 days for approved leave and replacement status. Over-cap requests are refused with an actionable message and never silently truncated.
11. **Active employee.** `users.active = true` with a corresponding `employee_profiles` row.
12. **Certification vocabulary.** Review states are exactly `unreviewed`, `reviewed`, `verified`; expiry states are exactly `no_expiry`, `valid`, `expired`, derived against the Dubai business date. No `rejected` state, no expiring-soon threshold, no proficiency scale.
13. **Certification and staffing.** Certification status never affects coverage gaps, candidate selection, staffing eligibility, `employee_skills.verified` or `coverage_eligible`. Phase 9 sub-phase 9.9 stays deferred.
14. **Query model.** Live request-time queries only; no persisted aggregate or snapshot table.
15. **Export storage.** Exports are streamed and never stored. There is no export file, export table, public URL or permanent URL.
16. **Export cap.** 5,000 data rows. Over-cap results are refused with `Narrow the date range or filters (limit 5,000 rows)`, never truncated, and the refusal is audited.
17. **Presentation.** Tables and counts are the V1 baseline. Any chart must ship with an adjacent equivalent table and colour is never the only signal.
18. **Judgement.** No targets, thresholds or red/amber judgement; only factual states such as `expired`.
19. **Drill-downs.** Drill-downs route through the existing authorized page or service and are reauthorized on arrival.

## The conflict fact

There is no availability concept. The only permitted employee-related derived fact is named exactly:

> `No known schedule or approved-leave conflict`

The computation may establish only that the employee is active, that no approved leave covers the selected Dubai business date, and that no current Published assignment overlaps the selected time window. Permitted values, exactly:

1. `No known schedule or approved-leave conflict`
2. `Approved leave on the selected date`
3. `Published assignment overlaps the selected time window`
4. `Approved leave and published assignment overlap`

Column header: `Schedule and approved-leave conflict`. The fact never uses `employee_profiles.working_pattern`, never implies contractual or working-hours status, never claims the employee can accept work, and never acts as a general verdict about a person.

## Terminology boundaries

The terms `available`, `availability` and `unavailable` are prohibited when describing an employee or a staffing conclusion. The literal data-state label `Unavailable` is permitted only when a required reporting source is genuinely missing, and must never describe an employee. The following remain prohibited on every Phase 11 surface: `capacity`, `utilization`, `contracted hours`, `worked hours`, `attendance`, `performance`, `productive`, `qualified`, `compliant`, `eligible`.

`employee_profiles.working_pattern` is documentation-only free text and is never read as operational data. Scheduled hours are the arithmetic sum of a Published assignment's start and end time and are never called worked hours, actual hours, attendance, or a capacity measure.

## Deliberately deferred

20. **XLSX and PDF.** Not implemented; CSV covers the approved need without a new dependency, a heavier test burden, or a generation/streaming story.
21. **Wider scoped-Admin exports.** Only Published allocation and the certification summary are exportable by Admin. Any expansion needs a fresh decision.
22. **Employee self-export.** Deferred.
23. **Phase 9 sub-phase 9.9.** Whether verification affects coverage or replacement eligibility remains unapproved, and Phase 11 does not change Phase 7 behaviour.

## Known limitations recorded with this phase

- A fleet-wide "open coverage gaps" figure is **not** offered: coverage gaps are computed per anchor assignment and no authoritative scope-wide query exists. The coverage report presents pending replacement requests instead.
- No capacity denominator exists, so no utilization metric is offered.
- No expiring-soon threshold exists, so the certification report shows factual expiry state only.
- The Phase 8 planning map still carries its older `Approved unavailable` filter label. That surface was explicitly out of scope for Phase 11 and remains an unreconciled terminology inconsistency for a later, deliberately scoped change.
- The scoped-Admin certification report intentionally carries the approved summary fields and therefore no employee attribution; that is the locked Phase 9 projection rather than an oversight.
