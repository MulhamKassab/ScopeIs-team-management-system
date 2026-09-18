# Implementation Roadmap

## Status and authority

**CURRENT AUTHORITATIVE IMPLEMENTATION ROADMAP — JOURNEY-FIRST**

This roadmap supersedes the former module-first phase order. It does not change the confirmed product requirements, roles, privacy constraints, architecture, non-goals, or Ticket System boundary; it changes the implementation sequence so that work is completed as verified vertical user journeys.

A phase is not complete merely because a schema, repository, service, route, UI shell, or isolated test exists. A completed phase requires, where applicable: approved user story and acceptance criteria; schema/migrations; repository/service behavior; validation; server-side role and scope authorization; route or Server Action; real data-connected UI; privacy protections; audit and required in-application notifications; transactions/rollback; concurrency handling; unit, disposable-PostgreSQL integration, route/API, negative role/scope/privacy, component, desktop E2E, mobile E2E tests; a manual journey walkthrough; and updated documentation.

Backend-only work must be labelled backend-only. UI shells must be labelled shells. Neither is a complete business phase.

## Phase 0 — Discovery and technical pilot

**Status:** `COMPLETED`

**Sub-phases:**

- 0.1 Business and operational discovery
- 0.2 User and role discovery
- 0.3 Workflow discovery
- 0.4 Product requirements and non-goals
- 0.5 System hierarchy and relationship design
- 0.6 Architecture and technology direction
- 0.7 Original implementation work
- 0.8 Current implementation and user-journey baseline audit
- 0.9 Journey-first roadmap decision

**Result:** `PASS_DISCOVERY_AND_TECHNICAL_DIRECTION`

## Phase 1 — Secure application foundation

**Status:** `COMPLETED_IN_NARROW_FOUNDATION_SCOPE`

> Credential-login remediation (2026-09-18): the fictional Persona selection screen was replaced with
> username/email-and-password authentication under `SCOPEIS_EXISTING_USER_CREDENTIAL_AUTHENTICATION_R1`.
> The five existing users, roles, scopes, and data relationships are preserved; mock authentication is
> now test-only and Production rejects it regardless of the flag. Authentication proves identity only
> and the established authorization system is unchanged. See
> `phase-reports/SCOPEIS_EXISTING_USER_CREDENTIAL_AUTHENTICATION_R1.md`. Phase 12 has not started.

**Sub-phases:**

- 1.1 Application structure and protected shell
- 1.2 Mock personas and server sessions
- 1.3 Roles, capabilities, and route protection
- 1.4 Initial scope enforcement
- 1.5 PostgreSQL and migration foundation
- 1.6 Audit and generic notification persistence foundations
- 1.7 Disposable PostgreSQL and automated QA foundation

This phase proves the secure foundation journey: fictional persona sign-in, server session, role-aware navigation, protected routes, foundation scope enforcement, and sign-out. It is not a complete workforce-management application. The mock-account prototype, database foundation, and the reusable employee backend certified during the former Phase 2 remain evidence, not a complete business journey.

## Phase 2 — Employee management journey

**Status:** `COMPLETED`

**Main journey:** Super Admin manages employees → employee signs in → employee views real profile → employee updates only permitted fields.

**Sub-phases:**

- 2.1 Preserve and reconcile existing employee backend
- 2.2 Real employee directory
- 2.3 Employee search and filters
- 2.4 Create employee
- 2.5 View employee details
- 2.6 Edit, activate, and deactivate employee
- 2.7 Assign role, designation, manager, team, status, and working pattern
- 2.8 Employee self-service profile
- 2.9 Employee privacy and Admin scope
- 2.10 Audit, transactions, concurrency, and notifications where required
- 2.11 Complete desktop/mobile user-journey QA

Reuse the verified employee profile, catalogue, and employee-skill backend services rather than rebuilding them. Certification, portfolio, CV, file, and employee-management-note work is excluded except for safely preserving existing incomplete structures.

## Phase 3 — Clients, projects, and locations

**Status:** `COMPLETED`

**Main journey:** Authorized manager creates client → creates project → creates/reuses location → structure becomes available for scheduling.

**Sub-phases:**

- 3.1 Client management
- 3.2 Account Manager relationships
- 3.3 Project management
- 3.4 Responsible Admin and employee relationships
- 3.5 Location management
- 3.6 Coordinates, site hours, contacts, and access instructions
- 3.7 Basic staffing requirements
- 3.8 Shared operational notes required by these records
- 3.9 Scoped Admin access
- 3.10 Relationship, concurrency, authorization, and E2E QA

Client, Project, Location, Employee, Account Manager, responsible Admin, and staffing requirements remain distinct relationships.

## Phase 4 — Scheduling, review, and publication

**Status:** `COMPLETED`

**Main journey:** Admin creates Draft → Admin submits Proposed schedule → Super Admin reviews and publishes → employee views Published schedule.

**Sub-phases:**

- 4.1 Schedule and assignment data foundation
- 4.2 Basic one-time assignment
- 4.3 Monthly employee-by-day planning interface
- 4.4 Basic overlap and scope validation
- 4.5 Additional full-day, timed, multi-day, recurring, permanent, temporary, one-time, and on-call assignment types
- 4.6 Draft state
- 4.7 Proposed-for-review state
- 4.8 Super Admin review and publication
- 4.9 Employee Published schedule
- 4.10 Post-publication changes
- 4.11 Audit, notifications, transactions, overrides, and concurrency
- 4.12 Complete scheduling/publication E2E QA

Scheduling is not complete until the employee can view the Published result. Skill-based warnings follow once operational capabilities are connected.

## Phase 5 — Leave and availability

**Status:** `COMPLETED`

**Main journey:** Employee submits leave → Super Admin reviews schedule impact → Super Admin decides → availability updates → employee is notified.

**Sub-phases:**

- 5.1 Leave request data foundation
- 5.2 Employee request submission
- 5.3 Pending, Approved, and Rejected states
- 5.4 Private-reason protection
- 5.5 Admin unavailability visibility without private reason
- 5.6 Existing assignment and schedule-impact review
- 5.7 Super Admin approval/rejection
- 5.8 Availability calculation
- 5.9 Audit, notification, transaction, and concurrency behavior
- 5.10 Complete leave E2E QA

Leave balances, half-days, holidays, weekends, payroll, and attendance rules remain unimplemented until confirmed.

## Phase 6 — Skills and operational capabilities

**Status:** `COMPLETED`

**Main journey:** Management records employee skills and work requirements → planner finds qualified employees → scheduler warns about missing skills.

**Sub-phases:**

- 6.1 Reuse and connect the existing verified skills backend
- 6.2 Skill catalogue UI and routes
- 6.3 Employee-skill management
- 6.4 Proficiency and operational experience where confirmed
- 6.5 Skill requirements for clients, projects, locations, and assignments
- 6.6 Planner skill filters
- 6.7 Missing-skill schedule warnings
- 6.8 Scope, authorization, concurrency, and complete E2E QA

This phase precedes coverage and replacement.

## Phase 7 — Coverage and replacement

**Status:** `COMPLETED`

**Main journey:** System detects staffing gap → Admin reviews TEAM-visible unranked candidates and requests replacement → Super Admin decides → a Draft-safe schedule effect awaits normal publication.

**Sub-phases:**

- 7.1 Coverage-rule foundation
- 7.2 Requirements by skill, count, client, project, location, date, and time
- 7.3 Explainable coverage engine
- 7.4 Leave and schedule coverage integration
- 7.5 Scarce-skill and zero-coverage warnings
- 7.6 Replacement candidate search and explanation
- 7.7 Admin replacement request
- 7.8 Super Admin approval/change/rejection
- 7.9 Schedule update
- 7.10 Audit, notification, transaction, override, and concurrency behavior
- 7.11 Complete coverage/replacement E2E QA

Candidate ranking is explicitly out of scope; candidate facts are unranked and never make the final decision automatically.

## Phase 8 — Static planning map

**Status:** `COMPLETED`

**Main journey:** Authorized management views stored locations and Published workforce assignments for a selected date without live tracking.

**Sub-phases:**

- 8.1 Address precision and privacy decision
- 8.2 Provider-neutral map adapter
- 8.3 Stored employee planning locations
- 8.4 Client/project/location coordinates
- 8.5 Published schedule map data
- 8.6 Selected-date and period filtering
- 8.7 Employee, skill, client, project, location, availability, leave, and coverage filters
- 8.8 Admin scope and Employee exclusion
- 8.9 Explicit non-live-tracking wording
- 8.10 Privacy, scope, responsive, and E2E QA

No GPS ingestion, movement history, live employee position, or route surveillance may be introduced.

## Post-Phase-8 checkpoint — verification-harness remediation

**Status:** `COMPLETED` (Sub-phase A remediation and Sub-phase B independent closure)

Phase 8 closed with the application itself valid, but with defects in the aggregate verification system and in the documentation that reported it. This checkpoint was bounded to repairing the shared component tests, isolating aggregate integration-test databases, settling the test-runner and Playwright contract, defining the lint boundary around the historical prototype, and reconciling the status documentation. It is not a product phase. Sub-phase A delivered the remediation in commit `decb377decb32b3d064b14024c3079879dd932c0`; Sub-phase B independently re-verified every mandatory gate and formally closed the checkpoint on 2026-09-15.

- It does not begin Phase 9, does not convert known product limitations into features, and does not change business behavior, permissions, privacy projections, workflows, schemas, or Phase 8 map behavior.
- Checkpoint Sub-phase A authored the remediation and its scoped commit; Checkpoint Sub-phase B independently re-verified the Phase 0–8 record and closed the checkpoint. See the [Sub-phase A remediation report](../phase-reports/SCOPEIS_POST_PHASE_8_CHECKPOINT_SUBPHASE_A_REMEDIATION_R1.md) and the [Sub-phase B closure report](../phase-reports/SCOPEIS_POST_PHASE_8_CHECKPOINT_SUBPHASE_B_CLOSURE_R1.md).
- The historical root prototype (`prototype/full-frontend-r1/`) is preserved reference work: it is outside the authoritative application lint boundary and is not deleted, edited, formatted, migrated, or relabelled.

## Phase 9 — Certifications, CVs, portfolios, and files

**Status:** `COMPLETED`

**Main journey:** Employee submits capability evidence → evidence saves immediately → Super Admin is notified → Super Admin reviews or verifies it.

**Sub-phases:**

- 9.1 Certification records
- 9.2 Portfolio links and project examples
- 9.3 CV and supporting documents
- 9.4 Provider-neutral private storage adapter
- 9.5 Authorized upload, preview, and download
- 9.6 New/updated evidence state
- 9.7 Super Admin review and verification
- 9.8 Expiry handling
- 9.9 Optional configurable connection to coverage
- 9.10 Audit, notification, storage rollback, privacy, and E2E QA

Existing incomplete schema and code are preserved until this phase; they must not be expanded prematurely.

The incomplete certification/portfolio schema preserved from Phase 2 was extended additively in Phase 9 rather than rebuilt; it was evidence, not a completed journey, until the Phase 9 workflow existed end to end.

Phase 9 delivered the bounded capability-evidence journey: employees maintain certifications, portfolio links and files, project examples, one active CV, and supporting documents from `/profile`; submissions save immediately without an approval gate, flag new/updated state, and transactionally notify active Super Admins; Super Admin reviews and optionally verifies from the employee detail context; private files stay behind a provider-neutral storage boundary with per-request authorization. Sub-phase 9.9 (whether verification affects coverage or replacement eligibility) remains `DEFERRED` as an unapproved product decision, and Phase 10 remains the next journey.

## Phase 10 — Notes, discussions, notification centre, and audit interface

**Status:** `COMPLETED`

**Sub-phases:**

- 10.1 Shared Client, Project, and Location notes — `COMPLETED`
- 10.2 Employee-management notes — `COMPLETED`
- 10.3 Private-to-author and shared-upward visibility — `COMPLETED`
- 10.4 Subject-employee exclusion — `COMPLETED`
- 10.5 Participant-only replacement-request discussions — `COMPLETED`
- 10.6 Complete in-application notification centre — `COMPLETED`
- 10.7 Read, unread, related record, direct navigation, archive, and restore behavior — `COMPLETED`
- 10.8 Super Admin audit-history interface — `COMPLETED`
- 10.9 Phase 9 evidence-integrity prerequisite, visibility, privacy, authorization, audit, notification, rollback, concurrency, and E2E QA — `COMPLETED`

Phase 10 delivered the bounded collaboration-and-governance journey. Shared Client, Project, and Location notes preserve the previous content as a transactional revision on every edit, keep editing author-only, and keep archive Super Admin-only with a retained reason; the product owner confirmed that "shared" means shared with everyone already authorized on the parent record, so Employees hold no shared-note access. Employee-management notes enforce the private-to-author and shared-upward visibility matrix with immutable content, archive-only corrections, and non-enumerating refusals for the subject, peers, and out-of-scope Admins. The only supported discussion parent is `replacement_request`, with participants derived live from the request and notifications written transactionally to every other participant. The notification centre completes read, unread, archive, restore, mark-all-read, stable `(created_at, id)` pagination, and server-reauthorized related-record navigation for all roles. The audit-history interface is read-only, Super Admin-only, newest-first, filterable, and renders only a per-action safe metadata allowlist. The approved Phase 9 evidence-integrity correction resets review and verification provenance when an owner materially changes verified or reviewed evidence.

An assignment or Ticket discussion, notification retention automation, audit mutation or export, and any Phase 11 report surface remain out of scope.

## Phase 11 — Dashboards, reports, and exports

**Status:** `COMPLETED`

**Sub-phases:**

- 11.1 Super Admin dashboard — `COMPLETED`
- 11.2 Scoped Admin dashboard — `COMPLETED`
- 11.3 Employee dashboard — `COMPLETED`
- 11.4 Employee allocation reports, including the separate unpublished planning report — `COMPLETED`
- 11.5 Leave, conflict-fact and replacement-status reports — `COMPLETED`
- 11.6 Skill and certification reports — `COMPLETED`
- 11.7 Schedule-lifecycle and sanitized audit reports — `COMPLETED`
- 11.8 Authorized CSV exports — `COMPLETED`
- 11.9 Accuracy, scope, privacy, responsive, and E2E QA — `COMPLETED`

Phase 11 delivered the bounded reporting journey. `/dashboard` is now a real, role-branched operational summary instead of a shell, and `/reports` is a scope-enforced report index with thirteen registered metric contracts, each declaring its source of truth, grain, inclusion and exclusion rules, date interpretation, role policy, privacy class, ordering and empty-state behaviour.

Authoritative staffing reporting reads only the **current Published** schedule. The unpublished planning view is a separate report key (`planning-unpublished`), labelled `PLANNING (unpublished)` in the page, heading, filename and on every exported row, and is reachable by a scoped Admin only for records inside their current effective scope while remaining permanently invisible to Employees. Employee-facing data never receives Draft or Proposed scheduling.

Availability terminology was replaced with a single derived **conflict fact** whose permitted values are `No known schedule or approved-leave conflict`, `Approved leave on the selected date`, `Published assignment overlaps the selected time window`, and `Approved leave and published assignment overlap`. It is computed only from active status, approved leave, and current Published assignment overlap, never from `working_pattern`, and never presented as a general staffing verdict.

Exports are streamed CSV, bounded at 5,000 rows with refusal rather than truncation, re-authorized on the export request, protected against spreadsheet formula injection, and audited with safe metadata only. A scoped Admin may export exactly the Published allocation and the certification-summary projection; the planning report is view-only for Admin, audit history has no export, and Employees have no export.

No schema change was required: every metric reads existing columns, so the database remains at 32 tables and 12 migration-ledger rows.

## Pre-Phase-12 hardening checkpoint

**Status:** `COMPLETED`

Before Phase 12, the Phase 0-11 baseline was hardened and locked. `npm run test:system-lock` is the
fail-closed aggregate gate, `npm run test:system-smoke` proves a fresh install boots and signs in every
fictional persona, and `npm run test:system-concurrency` repeats the concurrency- and
rollback-sensitive suites three times. The machine-readable scenario registry is
`test/system-lock/scenario-manifest.json` and the human-readable catalogue is
`SYSTEM_WIDE_TEST_SCENARIO_CATALOG.md`. This is not a roadmap phase and does not implement any Phase 12
functionality; see the [Pre-Phase-12 hardening report](../phase-reports/SCOPEIS_PRE_PHASE_12_SYSTEM_WIDE_HARDENING_AND_REGRESSION_LOCK_R1.md).

## Phase 12 — Ticket System integration

**Status:** `NEXT`

**Sub-phases:**

- 12.1 Existing Ticket System reuse assessment
- 12.2 Ticket domain model
- 12.3 Client/project/location relationships
- 12.4 Required skills and due dates
- 12.5 Ticket-to-assignment-request relationship
- 12.6 Approved schedule-assignment relationship
- 12.7 Work logs and attachments
- 12.8 Workforce role, scope, audit, notification, and storage enforcement
- 12.9 Migration and combined-system QA

Ticket, Assignment, Schedule, Project, Client, and Work Log remain distinct. Ticket System integration is late and never becomes this product's architectural foundation.

## Phase 13 — Production readiness and internal rollout

**Status:** `NOT_STARTED`

This is the real application rollout pilot; it is distinct from the completed discovery/technical pilot.

**Sub-phases:**

- 13.1 Production identity-provider selection and integration
- 13.2 Hosting, database, storage, environment, and HTTPS
- 13.3 Backup and restore testing
- 13.4 Security and privacy review
- 13.5 Monitoring and operational logging
- 13.6 Performance and realistic concurrency testing
- 13.7 Controlled internal user-acceptance pilot
- 13.8 Pilot feedback and blocker resolution
- 13.9 Production migration and deployment
- 13.10 Training, monitoring, rollback, and launch closure

## Cross-cutting delivery rules

- Authorization is implemented with every protected operation.
- Validation is implemented at every boundary.
- Audit events are implemented with every sensitive workflow.
- In-application notifications are implemented when their source events are built.
- Transactions cover every multi-record operation.
- Concurrency is handled wherever multiple managers can edit.
- Responsive behavior is verified with every screen.
- Desktop and mobile E2E QA are required for every completed journey.
- Basic notes may be introduced when their owning employee/client/project workflow requires them.
- Dashboard cards may be added incrementally only when their source data is trustworthy.
