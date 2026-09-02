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
- Employee-management notes are private-to-author or shared-upward; subjects cannot view them.
- Project/client notes are shared with all authenticated users.
- Assignment/request discussions are private to requester and assignee(s).
- Certification/portfolio updates save immediately and notify Super Admin; review/verification is optional, not a required approval gate.
- Version 1 uses mock test accounts with no real passwords documented.
- The Ticket System is a Phase 12 feature, not the workforce-system foundation.
- Phase 6 qualification is an active management-recorded skill association only. It is not a proficiency score, certification gate, coverage result, or replacement/candidate-ranking judgment; missing recorded skills are transparent, non-blocking schedule warnings only.

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
| Certification verification before coverage | Safety and candidate eligibility | Surface verification separately; do not require or ignore it until decided |
| Exact Admin scope model | Authorization across all management modules | Enforce abstract assigned scope; choose dimensions later |
| Admin employee creation | Account lifecycle and authority | Super Admin only until explicitly delegated |
| Formal proposal submit action | Schedule workflow and audit | Retain Draft/Proposed/Published states; exact interaction later |
| Project/client note edit rights | Collaboration integrity and moderation | Authors edit own; Super Admin moderation is a candidate, not confirmed |
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
| Reports/exports by Admin | Data scope and privacy | Super Admin confirmed; scoped Admin access later-defined |

## Deferred provider and policy decisions

Authentication, map/geocoding, external notifications, storage/retention, holiday calendars, travel-time services, and ticket migration are deliberately deferred. Future confirmation must update this file, product requirements, role matrix, workflows, and relevant diagrams before implementation.
