# Decisions and Constraints

Technical implementation direction is recorded separately in [`SYSTEM_ARCHITECTURE_DECISIONS.md`](SYSTEM_ARCHITECTURE_DECISIONS.md). This file remains authoritative for product decisions, constraints, and unresolved policies.

## Confirmed decisions

- All employees are internal; outsourcing is an assignment arrangement.
- Arrangement labels are manager-configured descriptions and do not determine availability, coverage, leave, work hours, conflicts, or permissions.
- System roles and job designations are separate.
- Only Super Admin publishes schedules, approves/rejects leave, and gives final approval for requested replacements.
- Admin can create scoped drafts/proposals and replacement requests but cannot publish or advise on leave outcomes.
- Employees see published schedules only.
- The planning map is static, selected-date based, and available only to Super Admin and scoped Admin.
- Employee-management notes are private-to-author or shared-upward; subjects cannot view them. Reading a note requires both its visibility permission and the reader's current authorization for the subject, so authorship never overrides a later demotion, deactivation, or scope loss.
- Shared Client, Project, and Location notes are readable and creatable by every authenticated user already authorized on the parent record: Super Admin globally, and Admin only within their Client, Project, or Location scope. The product owner confirmed this interpretation of the earlier "all authenticated users" wording during Phase 10; Employees hold no shared-note access. Editing is author-only, archive is Super Admin-only with a retained reason, and every edit preserves the superseded content as a revision.
- Replacement-request discussions are private to the participants derived live from the request: the requester and the named employee(s). Role never confers participation, and only a `replacement_request` parent is supported. Assignee or Ticket discussions remain unimplemented.
- Certification/portfolio updates save immediately and notify Super Admin; review/verification is optional, not a required approval gate.
- Version 1 uses mock test accounts with no real passwords documented.
- The Ticket System is a Phase 12 feature, not the workforce-system foundation.
- Phase 6 qualification is an active management-recorded skill association only. It is not a proficiency score, certification gate, coverage result, or replacement/candidate-ranking judgment; missing recorded skills are transparent, non-blocking schedule warnings only.
- Phase 10 confirmed that the employee-management note subject, an Employee actor, a peer Admin, and an out-of-scope Admin all receive the same non-enumerating refusal as a nonexistent note; note content is immutable and corrections archive-and-supersede.
- Post-Phase-10 remediation corrected the management-note authorization rule: authorship alone never grants or preserves access, and current role, active status, and current scope grants are re-read on every read, list, count, direct-id lookup, archive attempt, and employee-detail panel render. Historical authorship and author role at creation remain stored as history.
- Phase 10 notification ownership is per recipient: only the recipient may read, mark, archive, or restore a notification, and a notification row stores no private display content.
- Phase 10 audit rendering uses a per-action safe metadata allowlist; unknown actions render a generic label with no metadata and raw JSON is never displayed.
- Phase 9 evidence integrity: when an owner materially changes verified or reviewed evidence, the item resets to `unreviewed` and its review and verification provenance is cleared in the same transaction. Review actions themselves never reset state and never change `last_submitted_at`.
- Phase 11 reporting reads only the current Published schedule for authoritative staffing metrics. Draft and Proposed scheduling is a separate, explicitly labelled `PLANNING (unpublished)` report that is view-only for a scoped Admin, never visible to an Employee, and never blended into a Published figure.
- Phase 11 removed general availability terminology. The only permitted employee-related derived fact is the conflict fact: `No known schedule or approved-leave conflict`, `Approved leave on the selected date`, `Published assignment overlaps the selected time window`, or `Approved leave and published assignment overlap`. It never uses `working_pattern` and never implies contractual or working-hours status.
- Phase 11 exports are streamed CSV, re-authorized per request, capped at 5,000 rows with refusal rather than truncation, formula-neutralised, and audited with `report.export.generated` or `report.export.refused` carrying safe metadata only. No export is stored and no public or permanent export URL exists.
- Phase 11 reports never present `capacity`, `utilization`, `contracted hours`, `worked hours`, `attendance`, `performance`, `productive`, `qualified`, `compliant` or `eligible`, and introduce no target or threshold.

## Explicit constraints

- Documentation only in the current phase; no app scaffolding, database, API, package installation, repository integration, deployment, or production access.
- Permission checks must eventually be enforced server-side, not only hidden in the interface.
- Significant Super Admin warning overrides must capture actor, timestamp, item overridden, and reason.
- Historical use of arrangement labels should be preserved through safe archival rather than destructive deletion.
- Leave reasons and employee home-location data require privacy protection.
- Providers for mapping, authentication, geocoding, and notifications must not be locked in now.
- The initial responsive web application must serve desktop and mobile browsers and support the current 15-20-person team with reasonable growth.

## Non-goals

Live GPS or movement history; payroll/salary/accounting; biometric attendance or automatic timesheets; performance scoring; public registration; billing/subscriptions; multi-company tenancy; native mobile; WhatsApp; automatic route optimization; automatic final staffing; full HR; recruitment; disciplinary workflows; AI final management decisions.

## Assumptions that must not become requirements

- A certification is manager-approved before it can be displayed or counted.
- A particular skill proficiency scale exists.
- Every employee has one fixed shift, exact home address, or only one location per day.
- Admin scope is necessarily team-based, client-based, or any single model.
- Every schedule proposal requires a formal submit action.
- Any authenticated user may edit another author's project/client note.
- Email, push, WhatsApp, Microsoft, Google, or company-email authentication is part of version 1.
- Distance or travel time makes the replacement decision automatically.
- Ticket status and assignment status are equivalent.

## Open decisions

Every item below is **not finalized**. The safe documentation default prevents accidental capability expansion; it is not a product decision.

| Decision | Why it matters / affected features | Safe documentation default |
|---|---|---|
| Exact home address vs approximate area | Employee privacy; map; replacement ranking | Treat as protected; display approximate area unless separately authorized |
| Extra permission for precise addresses | Role/scope and audit | Do not expose precise address outside Super Admin without confirmation |
| Fixed shifts vs flexible hours | Conflicts, availability, on-call work | Model work pattern conceptually; do not enforce an unconfirmed rule |
| Multiple locations in one day | Timed assignments, travel conflicts | Allow conceptually only when times do not overlap; travel feasibility remains unresolved |
| Leave year and balance rules | Entitlement and balance display | Track requests; defer balances/calculation |
| Half-day leave | Scheduling and balance units | Do not promise in initial leave flow |
| Public holidays | Availability and coverage calendars | No hard-coded holiday calendar |
| Weekend rules | Working/non-working conflicts | Use employee working pattern once defined |
| Skill proficiency scale | Search, qualification, coverage | Store a future-configurable concept without selecting a scale |
| Certification verification before coverage | Safety and candidate eligibility | Still deferred (Phase 9 sub-phase 9.9). Phase 9 surfaces verification state and Phase 10 preserves the review lifecycle, but verification deliberately does not change Phase 7 coverage or replacement eligibility. |
| Exact Admin scope model | Authorization across all management modules | Enforce abstract assigned scope; choose dimensions later |
| Admin employee creation | Account lifecycle and authority | Super Admin only until explicitly delegated |
| Formal proposal submit action | Schedule workflow and audit | Retain Draft/Proposed/Published states; exact interaction later |
| Project/client note edit rights | Collaboration integrity and moderation | **Resolved in Phase 10:** authors edit their own notes, Super Admin archives with a retained reason, and every edit preserves the superseded content as a revision. Hard deletion is not available. |
| Whether an Employee may read shared Client/Project/Location notes | Role boundary and privacy | **Resolved in Phase 10:** no. Shared notes are limited to authenticated users already authorized on the parent record: Super Admin globally, Admin only within scope. |
| Scoped Admin evidence visibility | Employee privacy beyond the certification summary | **Resolved in Phase 9:** scoped Admin receives certification summary facts only; CVs, supporting documents, portfolio links and files, project-example detail, previews, and downloads are withheld. |
| Profile/client/project attachments | Storage, security, retention | Certifications/portfolio uploads confirmed; other attachments deferred |
| Map provider | Cost, licensing, implementation | Provider-neutral map requirements |
| Geocoding approach | Privacy, quality, external service use | Store coordinates when available; no provider selected |
| Route vs straight-line distance | Replacement ranking accuracy | Treat geography as optional ranking information only |
| Travel-time estimates | Schedule feasibility | Not required until confirmed |
| External notification channels | Identity, delivery, cost | In-application notification centre only |
| Final authentication provider | Enterprise identity and migration | Mock accounts only in version 1 |
| Ticket migration strategy | Reuse, data migration, risk | Inspect and select candidates in Phase 12 |
| Repository strategy | Ownership and long-term architecture | Keep new workforce project independent; later decision may absorb selected code |
| Warning severity by conflict | Whether users may proceed | Identify confirmed conflicts; final blocker/warning/info policies later |
| Leave cancellation rules | Schedule/coverage reversals | Pending cancellation when permitted; exact cutoff unresolved |
| Reports/exports by Admin | Data scope and privacy | **Resolved in Phase 11:** a scoped Admin may open an approved report set limited to their current effective scope, including the separate `PLANNING (unpublished)` Draft/Proposed report as view-only, and may export only the Published allocation report and the certification-summary projection. Leave balance, the evidence review queue and audit history stay Super Admin only, and audit history has no export. |

## Deferred provider and policy decisions

Authentication, map/geocoding, external notifications, storage/retention, holiday calendars, travel-time services, and ticket migration are deliberately deferred. Future confirmation must update this file, product requirements, role matrix, workflows, and relevant diagrams before implementation.
