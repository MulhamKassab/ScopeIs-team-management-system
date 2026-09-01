# Implementation Status Tracker

## Authority and use

This is the sole live implementation-status authority for ScopeIs. [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) defines phase and sub-phase scope and order; this tracker records live status, dates, evidence, blockers, and QA. Historical phase reports are immutable evidence, not current roadmaps.

The tracker uses only: `NOT_STARTED`, `READY`, `IN_PROGRESS`, `PARTIAL`, `BLOCKED`, `VERIFICATION_PENDING`, `COMPLETED`, `DEFERRED`, `NOT_APPLICABLE`, and `SUPERSEDED`. `PARTIAL` means some layers exist but the full exit condition is not met. `BLOCKED` requires a specific blocker, required action, blocking date, and whether other work may continue. `NOT_APPLICABLE` requires a reason. `SUPERSEDED` requires its approved replacement.

**Completion rule:** backend-only work and UI shells are not completed user journeys. A phase is complete only after all applicable delivery gates and its end-to-end journey are verified.

Evidence shorthand: [roadmap], [context], [P1 certification], [Phase 2 database], [Phase 2 core R3], [Phase 2.1 reconciliation], [Phase 2.1 closure], [Phase 2.2 directory], [Phase 2.3 search], [Phase 2.4 blocked], [Phase 2.4 closure], [Phase 2 journey completion], [Phase 2 manual QA readiness], [Phase 2 controls/code remediation], [employee services], [schema], [navigation], [notification service], [audit service], [storage helper], and [note policy].

[roadmap]: IMPLEMENTATION_ROADMAP.md
[context]: ../../PROJECT_CONTEXT.md
[P1 certification]: ../phase-reports/SCOPEIS_PHASE_1_ROUTE_AND_PLAYWRIGHT_CERTIFICATION_R1.md
[Phase 2 database]: ../phase-reports/SCOPEIS_PHASE_2_DATABASE_FOUNDATION_RECONCILIATION_R1.md
[Phase 2 core R3]: ../phase-reports/SCOPEIS_PHASE_2_CORE_SERVICE_INCIDENT_REMEDIATION_AND_VERIFICATION_CLOSURE_R3.md
[Phase 2.1 reconciliation]: ../phase-reports/SCOPEIS_PHASE_2_1_PRESERVE_AND_RECONCILE_EXISTING_EMPLOYEE_BACKEND_R1.md
[Phase 2.1 closure]: ../phase-reports/SCOPEIS_PHASE_2_1_CUSTODY_RESOLUTION_VERIFIED_MAIN_CLOSURE_R1.md
[Phase 2.2 directory]: ../phase-reports/SCOPEIS_PHASE_2_2_REAL_EMPLOYEE_DIRECTORY_R1.md
[Phase 2.3 search]: ../phase-reports/SCOPEIS_PHASE_2_3_EMPLOYEE_SEARCH_AND_FILTERS_R1.md
[Phase 2.4 blocked]: ../phase-reports/SCOPEIS_PHASE_2_4_CREATE_EMPLOYEE_R1.md
[Phase 2.4 closure]: ../phase-reports/SCOPEIS_PHASE_2_4_CREATE_EMPLOYEE_R1.md
[Phase 2 journey completion]: ../phase-reports/SCOPEIS_PHASE_2_EMPLOYEE_MANAGEMENT_JOURNEY_COMPLETION_R1.md
[Phase 2 manual QA readiness]: ../phase-reports/SCOPEIS_PHASE_2_MANUAL_QA_RUNTIME_READINESS_AND_DEFECT_REMEDIATION_R1.md
[Phase 2 controls/code remediation]: ../phase-reports/SCOPEIS_PHASE_2_MANUAL_QA_EMPLOYEE_CONTROLS_AND_CODE_REMEDIATION_R2.md
[employee services]: ../../src/modules/employees/employee-services.ts
[schema]: ../../src/db/schema/index.ts
[navigation]: ../../src/modules/navigation/navigation.ts
[notification service]: ../../src/modules/notifications/notification-service.ts
[audit service]: ../../src/modules/audit/audit-service.ts
[storage helper]: ../../src/server/providers/vercel-blob-provider.ts
[note policy]: ../../src/modules/employees/employee-policy.ts

## Current focus

- **Current active phase:** None — Phase 2 is complete after the verified controls/code remediation; Phase 3 remains not started
- **Current active/next sub-phase:** Phase 2 journey complete; Phase 3 remains `NOT_STARTED`
- **Current phase status:** `COMPLETED`
- **Last status date:** `2026-09-01`
- **Most recent trustworthy evidence:** [Phase 2 controls/code remediation]
- **Immediate objective:** Preserve the completed employee-management journey, use its disposable manual-QA launcher for local verification, and do not begin Phase 3 without authorization.
- **Known blockers:** None for the documented Phase 2 journey. Phase 3 remains unstarted and separately authorized.
- **Explicit exclusions:** Do not expand certifications, CVs, portfolios, files, or management notes; do not begin clients/projects/locations until Phase 2 exit criteria pass.
- **Required phase-exit journey:** Super Admin manages employees → employee signs in → employee views real profile → employee updates only permitted fields.

## Master phase status

Progress measures completed roadmap sub-phases only. It is **not** engineering effort, feature depth, or production-readiness percentage.

| Phase | Phase name | Current status | Completed sub-phases | Total sub-phases | Progress indicator | Current/next sub-phase | Last status date | Started date | Completed date | Dependencies | Active blockers | Latest evidence |
| ----- | ---------- | -------------- | -------------------: | ---------------: | -----------------: | ---------------------- | ---------------- | ------------ | -------------- | ------------ | --------------- | --------------- |
| 0 | Discovery and technical pilot | `COMPLETED` | 9 | 9 | 100% | — | 2026-09-01 | — | 2026-09-01 | — | None | [roadmap] |
| 1 | Secure application foundation | `COMPLETED` | 7 | 7 | 100% | Completed only for the narrowly defined secure foundation journey | 2026-08-29 | — | 2026-08-29 | Phase 0 | None | [P1 certification] |
| 2 | Employee management journey | `COMPLETED` | 11 | 11 | 100% | Completed employee-management journey; visible Super Admin controls, server-only employee codes, and supported disposable manual QA launcher | 2026-09-01 | 2026-09-01 | 2026-09-01 | Phase 1 | None | [Phase 2 controls/code remediation] |
| 3 | Clients, projects, and locations | `NOT_STARTED` | 0 | 10 | 0% | 3.1 Client management | 2026-09-01 | — | — | Phase 2 journey | Phase 2 exit not met | None located |
| 4 | Scheduling, review, and publication | `NOT_STARTED` | 0 | 12 | 0% | 4.1 Schedule and assignment data foundation | 2026-09-01 | — | — | Phases 2–3 | Phase 3 exit not met | None located |
| 5 | Leave and availability | `NOT_STARTED` | 0 | 10 | 0% | 5.1 Leave request data foundation | 2026-09-01 | — | — | Phase 4 | Published schedule unavailable | None located |
| 6 | Skills and operational capabilities | `PARTIAL` | 0 | 8 | 0% | 6.1 Reuse and connect the existing verified skills backend | 2026-09-01 | — | — | Phases 2–4 | Dependent operational records unavailable | [Phase 2 core R3] |
| 7 | Coverage and replacement | `NOT_STARTED` | 0 | 11 | 0% | 7.1 Coverage-rule foundation | 2026-09-01 | — | — | Phases 4–6 | Schedule, leave, and connected skills unavailable | None located |
| 8 | Static planning map | `NOT_STARTED` | 0 | 10 | 0% | 8.1 Address precision and privacy decision | 2026-09-01 | — | — | Phases 4–7 | Published schedule and privacy decision unavailable | None located |
| 9 | Certifications, CVs, portfolios, and files | `PARTIAL` | 0 | 10 | 0% | 9.1 Certification records | 2026-09-01 | — | — | Phase 2 profile journey | Intentionally deferred; existing structures must only be preserved | [Phase 2 database] |
| 10 | Notes, discussions, notification centre, and audit interface | `PARTIAL` | 0 | 9 | 0% | 10.1 Shared client and project notes | 2026-09-01 | — | — | Source workflows | Source records/workflows unavailable | [schema] |
| 11 | Dashboards, reports, and exports | `NOT_STARTED` | 0 | 9 | 0% | 11.1 Super Admin dashboard | 2026-09-01 | — | — | Trustworthy source journeys | Source data unavailable | None located |
| 12 | Ticket System integration | `NOT_STARTED` | 0 | 9 | 0% | 12.1 Existing Ticket System reuse assessment | 2026-09-01 | — | — | Phases 1–11 | Workforce journeys incomplete | None located |
| 13 | Production readiness and internal rollout | `NOT_STARTED` | 0 | 10 | 0% | 13.1 Production identity-provider selection and integration | 2026-09-01 | — | — | Product journeys and Phase 12 | Product not ready; production choices unresolved | None located |

## Phase 0 — Discovery and technical pilot

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 0.1 | Business and operational discovery | `COMPLETED` | 2026-09-01 | — | — | — | Documentation | Document review | Approved business context | [context] | Completion date not separately recorded. |
| 0.2 | User and role discovery | `COMPLETED` | 2026-09-01 | — | — | 0.1 | Documentation | Document review | Confirmed roles/users | [role model](ROLE_AND_PERMISSION_MODEL.md) | — |
| 0.3 | Workflow discovery | `COMPLETED` | 2026-09-01 | — | — | 0.1–0.2 | Documentation | Document review | Confirmed workflows | [workflows](WORKFLOWS.md) | — |
| 0.4 | Product requirements and non-goals | `COMPLETED` | 2026-09-01 | — | — | 0.1–0.3 | Documentation | Document review | Canonical requirements/non-goals | [requirements](PRODUCT_REQUIREMENTS.md) | — |
| 0.5 | System hierarchy and relationship design | `COMPLETED` | 2026-09-01 | — | — | 0.2–0.4 | Documentation | Document review | Canonical relationship design | [hierarchy](SYSTEM_HIERARCHY_AND_RELATIONSHIPS.md) | — |
| 0.6 | Architecture and technology direction | `COMPLETED` | 2026-09-01 | — | — | 0.4–0.5 | Documentation | Document review | Approved architecture direction | [architecture](SYSTEM_ARCHITECTURE_DECISIONS.md) | — |
| 0.7 | Original implementation work | `COMPLETED` | 2026-09-01 | — | — | 0.1–0.6 | Foundation/backend evidence | Certification reports | Preserved historical implementation evidence | [P1 certification] | Historical evidence; not a completion claim for later journeys. |
| 0.8 | Current implementation and user-journey baseline audit | `COMPLETED` | — | — | — | 0.7 | Documentation audit | Audit review | Evidence-based current-state audit | [roadmap] | Audit outcome is recorded in the approved roadmap; no separate repository audit report was located. |
| 0.9 | Journey-first roadmap decision | `COMPLETED` | 2026-09-01 | — | 2026-09-01 | 0.8 | Documentation | Commit/document review | Approved superseding roadmap | [roadmap] | Recorded in commit `2ae484d`. |

## Phase 1 — Secure application foundation

Scope note: `COMPLETED` only for the narrowly defined secure foundation journey; it is not a usable workforce-management product.

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 1.1 | Application structure and protected shell | `COMPLETED` | 2026-08-29 | — | 2026-08-29 | Phase 0 | Documentation; real protected shell; authorization | Route/API; desktop/mobile E2E | Protected role-aware shell | [P1 certification] | Shells are not business modules. |
| 1.2 | Mock personas and server sessions | `COMPLETED` | 2026-08-29 | — | 2026-08-29 | 1.1 | Schema; service; validation; routes; audit | Unit; integration; route/API; desktop/mobile E2E | Secure mock session journey | [P1 certification] | Mock only; production identity remains future work. |
| 1.3 | Roles, capabilities, and route protection | `COMPLETED` | 2026-08-29 | — | 2026-08-29 | 1.2 | Authorization; routes; shell | Unit; route/API; negative authorization; E2E | Server-enforced role protection | [P1 certification] | — |
| 1.4 | Initial scope enforcement | `COMPLETED` | 2026-08-29 | — | 2026-08-29 | 1.3 | Schema; repository; authorization; scope seam | Unit; integration; route/API; scope-negative; E2E | Server-enforced foundation scope | [P1 certification] | Business scope remains phase-specific. |
| 1.5 | PostgreSQL and migration foundation | `COMPLETED` | 2026-08-29 | — | 2026-08-29 | 1.1 | Schema/migrations; validation | Disposable PostgreSQL; migration/drift tests | Reconciled authoritative migration foundation | [Phase 2 database] | This certifies foundation/migration behavior, not production state. |
| 1.6 | Audit and generic notification persistence foundations | `COMPLETED` | 2026-08-29 | — | 2026-08-29 | 1.2, 1.5 | Schema; services; transaction example | Unit; integration; route/API | Atomic foundation persistence | [P1 certification] | Central notification/audit UI is Phase 10. |
| 1.7 | Disposable PostgreSQL and automated QA foundation | `COMPLETED` | 2026-08-29 | — | 2026-08-29 | 1.5 | Disposable harness; test runners | Integration; route/API; desktop/mobile E2E | Safe isolated QA harness | [P1 certification] | Later R3 evidence confirms continued disposable-harness use, but does not certify later journeys. |

## Phase 2 — Employee management journey

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 2.1 | Preserve and reconcile existing employee backend | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | Phase 1 | Verified backend-only schema/migration, services, validation, authorization, scoped projection, audit, transaction, and concurrency baseline adopted to main | Focused unit and disposable PostgreSQL integration passed | Reused backend reconciled and committed with scoped Admin privacy correction | [Phase 2.1 closure] | Backend-only completion. It does not complete the Phase 2 journey or authorize 2.2+ work. |
| 2.2 | Real employee directory | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.1 | Server-rendered `/employees` uses the employee service's management-only list and scoped projection | Focused policy/component, disposable PostgreSQL, migration/schema, desktop/mobile Playwright, typecheck, lint, and diff validation passed | Authorized real-data directory | [Phase 2.2 directory] | Basic read-only directory only: no search, filters, sorting controls, pagination controls, create, detail, edit, self-service, APIs, or Server Actions. |
| 2.3 | Employee search and filters | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.2 | Validated GET parameters compose name/code search with designation, TEAM, and active-status filters through the employee service/repository | Unit/component, disposable PostgreSQL, migration/schema, desktop/mobile Playwright, typecheck, lint, and diff validation passed | Connected filters with scope/privacy tests | [Phase 2.3 search] | No pagination, sorting controls, API, Server Action, saved view, export, bulk action, or later employee journey. |
| 2.4 | Create employee | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.1–2.3 | Super Admin-only Server Action now assigns a transaction-safe, server-only four-digit code; protected directory form and no-`.env*` isolated safe-build runner | Unit/component; disposable PostgreSQL core/migration; desktop/mobile browser; isolated build; lint; diff checks passed | Authorized workforce-record creation is committed with safe-build and controls/code-remediation evidence | [Phase 2 controls/code remediation] | Existing codes remain unchanged; no deactivated code is reused. No later employee journey is authorized. |
| 2.5 | View employee details | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.2 | Protected `/employees/[userId]`; non-enumerating 404; separate Super Admin/Admin projections | Component, disposable integration, desktop/mobile browser regression | Real scoped management detail | [Phase 2 journey completion] | Admin contacts/default location remain withheld. |
| 2.6 | Edit, activate, and deactivate employee | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.4–2.5 | Super Admin basic edit/lifecycle actions; session revocation; final-Super-Admin/self safeguards | Disposable service rollback/concurrency; browser regression | Authorized lifecycle mutations | [Phase 2 journey completion] | No deletion. |
| 2.7 | Assign role, designation, manager, team, status, and working pattern | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.4 | Separate governed assignment actions; additive descriptive working-pattern field | Disposable integration, migration clean/upgrade/drift, browser regression | Distinct role/assignment controls | [Phase 2 journey completion] | Working pattern is informational only; no schedule/availability behavior. |
| 2.8 | Employee self-service profile | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.5 | Real PostgreSQL `/profile`; session-derived target; exact three-field allowlist | Disposable integration; desktop/mobile browser | Own safe profile journey | [Phase 2 journey completion] | No credentials, invitation, or evidence workflow. |
| 2.9 | Employee privacy and Admin scope | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.5–2.8 | TEAM scope grants only; read-only Admin paths; privacy-safe projections | Service and browser negative scope/privacy checks | Browser-facing privacy boundary | [Phase 2 journey completion] | No implicit scope from role/team/designation/manager/pattern. |
| 2.10 | Audit, transactions, concurrency, and notifications where required | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.4–2.9 | Sensitive mutations transactionally audit; stale writes/session effects verified | Disposable integration rollback/concurrency; migration/browser regression | Governed mutations | [Phase 2 journey completion] | Employee-event notifications are `NOT_APPLICABLE`: NOT-002 names no such event. |
| 2.11 | Complete desktop/mobile user-journey QA | `COMPLETED` | 2026-09-01 | 2026-09-01 | 2026-09-01 | 2.1–2.10 | Full fictional management/Admin/Employee journey | Component, disposable PostgreSQL, isolated safe build, desktop/mobile Playwright, lint/diff | Complete Phase 2 journey QA | [Phase 2 journey completion] | Manual scripted walkthrough is recorded in the report. |

## Phase 3 — Clients, projects, and locations

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 3.1 | Client management | `NOT_STARTED` | 2026-09-01 | — | — | Phase 2 | Documentation; navigation shell only | Shell route E2E only | Authorized client journey | None located | Shell is not implementation. |
| 3.2 | Account Manager relationships | `NOT_STARTED` | 2026-09-01 | — | — | 3.1 | Documentation only | None located | Distinct persisted relationship | None located | — |
| 3.3 | Project management | `NOT_STARTED` | 2026-09-01 | — | — | 3.1 | Documentation; navigation shell only | Shell route E2E only | Authorized project journey | None located | — |
| 3.4 | Responsible Admin and employee relationships | `NOT_STARTED` | 2026-09-01 | — | — | 3.2–3.3 | Documentation only | None located | Distinct relationship/scope behavior | None located | — |
| 3.5 | Location management | `NOT_STARTED` | 2026-09-01 | — | — | 3.1 | Documentation; navigation shell only | Shell route E2E only | Authorized location journey | None located | — |
| 3.6 | Coordinates, site hours, contacts, and access instructions | `NOT_STARTED` | 2026-09-01 | — | — | 3.5 | Documentation only | None located | Confirmed fields/privacy/UI | None located | — |
| 3.7 | Basic staffing requirements | `NOT_STARTED` | 2026-09-01 | — | — | 3.3–3.5 | Documentation only | None located | Distinct requirements model | None located | — |
| 3.8 | Shared operational notes required by these records | `NOT_STARTED` | 2026-09-01 | — | — | 3.1–3.3 | Documentation only | None located | Shared-note behavior | None located | Phase 10 completes central notes interface. |
| 3.9 | Scoped Admin access | `NOT_STARTED` | 2026-09-01 | — | — | 3.1–3.8 | Foundation scope seam only | Foundation scope tests | Domain scope filtering and negative tests | [P1 certification] | — |
| 3.10 | Relationship, concurrency, authorization, and E2E QA | `NOT_STARTED` | 2026-09-01 | — | — | 3.1–3.9 | Documentation only | None located | Full client/project/location journey QA | None located | — |

## Phase 4 — Scheduling, review, and publication

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 4.1 | Schedule and assignment data foundation | `NOT_STARTED` | 2026-09-01 | — | — | Phases 2–3 | Documentation only | None located | Migrated schedule model | None located | — |
| 4.2 | Basic one-time assignment | `NOT_STARTED` | 2026-09-01 | — | — | 4.1 | Documentation only | None located | Authorized assignment outcome | None located | — |
| 4.3 | Monthly employee-by-day planning interface | `NOT_STARTED` | 2026-09-01 | — | — | 4.2 | Schedule shell only | Shell route E2E only | Real planning UI | [navigation] | — |
| 4.4 | Basic overlap and scope validation | `NOT_STARTED` | 2026-09-01 | — | — | 4.2 | Documentation only | None located | Authoritative conflict/scope checks | None located | — |
| 4.5 | Additional full-day, timed, multi-day, recurring, permanent, temporary, one-time, and on-call assignment types | `NOT_STARTED` | 2026-09-01 | — | — | 4.2–4.4 | Documentation only | None located | Confirmed assignment types | None located | — |
| 4.6 | Draft state | `NOT_STARTED` | 2026-09-01 | — | — | 4.1 | Documentation only | None located | Persisted Draft workflow | None located | — |
| 4.7 | Proposed-for-review state | `NOT_STARTED` | 2026-09-01 | — | — | 4.6 | Documentation only | None located | Admin proposal workflow | None located | — |
| 4.8 | Super Admin review and publication | `NOT_STARTED` | 2026-09-01 | — | — | 4.7 | Documentation only | None located | Super Admin-only publication | None located | — |
| 4.9 | Employee Published schedule | `NOT_STARTED` | 2026-09-01 | — | — | 4.8 | Schedule shell only | Shell route E2E only | Employee sees only Published result | [navigation] | Required for phase completion. |
| 4.10 | Post-publication changes | `NOT_STARTED` | 2026-09-01 | — | — | 4.8–4.9 | Documentation only | None located | Audited/notification-aware changes | None located | — |
| 4.11 | Audit, notifications, transactions, overrides, and concurrency | `NOT_STARTED` | 2026-09-01 | — | — | 4.6–4.10 | Foundation patterns only | Foundation integration only | Atomic publication/change behavior | [audit service] | — |
| 4.12 | Complete scheduling/publication E2E QA | `NOT_STARTED` | 2026-09-01 | — | — | 4.1–4.11 | Documentation only | None located | Admin-to-employee end-to-end journey | None located | — |

## Phase 5 — Leave and availability

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 5.1 | Leave request data foundation | `NOT_STARTED` | 2026-09-01 | — | — | Phase 4 | Documentation only | None located | Migrated leave model | None located | — |
| 5.2 | Employee request submission | `NOT_STARTED` | 2026-09-01 | — | — | 5.1 | Leave shell only | Shell route E2E only | Authorized employee submission | [navigation] | — |
| 5.3 | Pending, Approved, and Rejected states | `NOT_STARTED` | 2026-09-01 | — | — | 5.1–5.2 | Documentation only | None located | State workflow | None located | — |
| 5.4 | Private-reason protection | `NOT_STARTED` | 2026-09-01 | — | — | 5.1 | Documentation only | None located | Server privacy enforcement | None located | — |
| 5.5 | Admin unavailability visibility without private reason | `NOT_STARTED` | 2026-09-01 | — | — | 5.3–5.4 | Documentation only | None located | Scoped unavailability view | None located | — |
| 5.6 | Existing assignment and schedule-impact review | `NOT_STARTED` | 2026-09-01 | — | — | 4.12, 5.1 | Documentation only | None located | Current schedule impact calculation | None located | — |
| 5.7 | Super Admin approval/rejection | `NOT_STARTED` | 2026-09-01 | — | — | 5.3–5.6 | Documentation only | None located | Super Admin-only decision | None located | — |
| 5.8 | Availability calculation | `NOT_STARTED` | 2026-09-01 | — | — | 5.7 | Documentation only | None located | Derived availability behavior | None located | — |
| 5.9 | Audit, notification, transaction, and concurrency behavior | `NOT_STARTED` | 2026-09-01 | — | — | 5.2–5.8 | Foundation patterns only | Foundation integration only | Atomic leave decision | [audit service] | — |
| 5.10 | Complete leave E2E QA | `NOT_STARTED` | 2026-09-01 | — | — | 5.1–5.9 | Documentation only | None located | Employee-to-decision journey | None located | — |

## Phase 6 — Skills and operational capabilities

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 6.1 | Reuse and connect the existing verified skills backend | `PARTIAL` | 2026-09-01 | — | — | Phases 2–4 | Schema; repository/service; validation; authorization; audit; concurrency | Unit; disposable PostgreSQL integration | Connected skills backend in operational journey | [Phase 2 core R3] | Existing backend is reusable, not connected. |
| 6.2 | Skill catalogue UI and routes | `NOT_STARTED` | 2026-09-01 | — | — | 6.1 | Backend only | Integration only | Authorized real catalogue UI/routes | [employee services] | — |
| 6.3 | Employee-skill management | `NOT_STARTED` | 2026-09-01 | — | — | 6.1–6.2 | Backend association service only | Integration only | Management UI/routes and E2E | [Phase 2 core R3] | — |
| 6.4 | Proficiency and operational experience where confirmed | `NOT_STARTED` | 2026-09-01 | — | — | 6.3 | Optional backend text fields only | Integration only | Confirmed policy and connected behavior | [schema] | No fixed scale confirmed. |
| 6.5 | Skill requirements for clients, projects, locations, and assignments | `NOT_STARTED` | 2026-09-01 | — | — | Phases 3–4 | Documentation only | None located | Distinct requirements relationships | None located | — |
| 6.6 | Planner skill filters | `NOT_STARTED` | 2026-09-01 | — | — | 6.3, 6.5 | Backend list/search only | Integration only | Connected planner filters | [employee services] | — |
| 6.7 | Missing-skill schedule warnings | `NOT_STARTED` | 2026-09-01 | — | — | 4.12, 6.5–6.6 | Documentation only | None located | Explainable warnings | None located | — |
| 6.8 | Scope, authorization, concurrency, and complete E2E QA | `NOT_STARTED` | 2026-09-01 | — | — | 6.1–6.7 | Partial backend policy | Unit/integration only | Full operational-capability journey QA | [Phase 2 core R3] | — |

## Phase 7 — Coverage and replacement

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 7.1 | Coverage-rule foundation | `NOT_STARTED` | 2026-09-01 | — | — | Phases 4–6 | Coverage shell only | Shell route E2E only | Migrated rule model | [navigation] | — |
| 7.2 | Requirements by skill, count, client, project, location, date, and time | `NOT_STARTED` | 2026-09-01 | — | — | 7.1 | Documentation only | None located | Scoped requirement model | None located | — |
| 7.3 | Explainable coverage engine | `NOT_STARTED` | 2026-09-01 | — | — | 7.1–7.2 | Documentation only | None located | Independently tested findings | None located | — |
| 7.4 | Leave and schedule coverage integration | `NOT_STARTED` | 2026-09-01 | — | — | 5.10, 7.3 | Documentation only | None located | Current-data integration | None located | — |
| 7.5 | Scarce-skill and zero-coverage warnings | `NOT_STARTED` | 2026-09-01 | — | — | 7.3–7.4 | Documentation only | None located | Actionable warnings | None located | — |
| 7.6 | Replacement candidate search and explanation | `NOT_STARTED` | 2026-09-01 | — | — | 7.3–7.5 | Documentation only | None located | Advisory, explainable candidates | None located | — |
| 7.7 | Admin replacement request | `NOT_STARTED` | 2026-09-01 | — | — | 7.6 | Replacement shell only | Shell route E2E only | Scoped request workflow | [navigation] | — |
| 7.8 | Super Admin approval/change/rejection | `NOT_STARTED` | 2026-09-01 | — | — | 7.7 | Documentation only | None located | Super Admin final decision | None located | — |
| 7.9 | Schedule update | `NOT_STARTED` | 2026-09-01 | — | — | 7.8 | Documentation only | None located | Correct Draft/Published update | None located | — |
| 7.10 | Audit, notification, transaction, override, and concurrency behavior | `NOT_STARTED` | 2026-09-01 | — | — | 7.7–7.9 | Foundation patterns only | Foundation integration only | Atomic governed workflow | [audit service] | — |
| 7.11 | Complete coverage/replacement E2E QA | `NOT_STARTED` | 2026-09-01 | — | — | 7.1–7.10 | Documentation only | None located | Gap-to-decision journey | None located | — |

## Phase 8 — Static planning map

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 8.1 | Address precision and privacy decision | `BLOCKED` | 2026-09-01 | — | — | Product decision | Documentation only | None located | Confirmed privacy decision | [decisions](DECISIONS_AND_CONSTRAINTS.md) | Blocker: exact address precision/permission unresolved; decision required; other phases may continue. |
| 8.2 | Provider-neutral map adapter | `NOT_STARTED` | 2026-09-01 | — | — | 8.1 | Unconfigured placeholder only | None located | Configured provider-neutral adapter | None located | Placeholder does not count as implementation. |
| 8.3 | Stored employee planning locations | `NOT_STARTED` | 2026-09-01 | — | — | 8.1, Phase 2 | Documentation only | None located | Protected location model | None located | — |
| 8.4 | Client/project/location coordinates | `NOT_STARTED` | 2026-09-01 | — | — | 8.1, Phase 3 | Documentation only | None located | Operational coordinates | None located | — |
| 8.5 | Published schedule map data | `NOT_STARTED` | 2026-09-01 | — | — | Phase 4 | Documentation only | None located | Published-only map query | None located | — |
| 8.6 | Selected-date and period filtering | `NOT_STARTED` | 2026-09-01 | — | — | 8.5 | Documentation only | None located | Filtered planning data | None located | — |
| 8.7 | Employee, skill, client, project, location, availability, leave, and coverage filters | `NOT_STARTED` | 2026-09-01 | — | — | 5–7, 8.6 | Documentation only | None located | Scoped filter behavior | None located | — |
| 8.8 | Admin scope and Employee exclusion | `NOT_STARTED` | 2026-09-01 | — | — | 8.5 | Foundation authorization only | Foundation negative E2E | Domain map authorization | [P1 certification] | — |
| 8.9 | Explicit non-live-tracking wording | `NOT_STARTED` | 2026-09-01 | — | — | 8.5 | Documentation only | None located | Visible non-live statement | None located | — |
| 8.10 | Privacy, scope, responsive, and E2E QA | `NOT_STARTED` | 2026-09-01 | — | — | 8.1–8.9 | Documentation only | None located | Full map journey QA | None located | — |

## Phase 9 — Certifications, CVs, portfolios, and files

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 9.1 | Certification records | `PARTIAL` | 2026-09-01 | — | — | Phase 2 | Evidence schema only | Disposable migration | Authorized certification workflow | [Phase 2 database] | Preserve; no repository/service/UI. |
| 9.2 | Portfolio links and project examples | `PARTIAL` | 2026-09-01 | — | — | Phase 2 | Evidence-kind schema only | Disposable migration | Authorized portfolio workflow | [Phase 2 database] | Preserve; no repository/service/UI. |
| 9.3 | CV and supporting documents | `PARTIAL` | 2026-09-01 | — | — | Phase 2 | Evidence/file schema only | Disposable migration | Authorized CV/document workflow | [Phase 2 database] | Preserve; no repository/service/UI. |
| 9.4 | Provider-neutral private storage adapter | `PARTIAL` | 2026-09-01 | — | — | 9.1–9.3 | Provider-specific Blob helper only | None located | Authorized provider-neutral adapter | [storage helper] | Helper is unconnected and not a complete adapter boundary. |
| 9.5 | Authorized upload, preview, and download | `NOT_STARTED` | 2026-09-01 | — | — | 9.4 | Validation helper only | None located | Full authorized storage journey | [storage helper] | — |
| 9.6 | New/updated evidence state | `PARTIAL` | 2026-09-01 | — | — | 9.1 | Review-state schema only | Disposable migration | Immediate saved-state behavior | [schema] | No application workflow. |
| 9.7 | Super Admin review and verification | `PARTIAL` | 2026-09-01 | — | — | 9.6 | Reviewer fields/state schema only | Disposable migration | Informational review workflow | [Phase 2 database] | No service/route/UI. |
| 9.8 | Expiry handling | `PARTIAL` | 2026-09-01 | — | — | 9.1 | Expiry fields/date constraint only | Disposable migration | Expiry behavior and notifications | [schema] | — |
| 9.9 | Optional configurable connection to coverage | `DEFERRED` | 2026-09-01 | — | — | Phase 7, confirmed policy | Documentation only | None located | Confirmed coverage policy | [decisions](DECISIONS_AND_CONSTRAINTS.md) | Certification eligibility remains an open decision. |
| 9.10 | Audit, notification, storage rollback, privacy, and E2E QA | `NOT_STARTED` | 2026-09-01 | — | — | 9.1–9.9 | Foundation patterns only | Foundation integration only | Full evidence journey QA | [P1 certification] | — |

## Phase 10 — Notes, discussions, notification centre, and audit interface

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 10.1 | Shared client and project notes | `NOT_STARTED` | 2026-09-01 | — | — | Phase 3 | Documentation only | None located | Shared note workflow | None located | — |
| 10.2 | Employee-management notes | `PARTIAL` | 2026-09-01 | — | — | Phase 2 | Note schema and policy only | Unit; disposable migration | Authorized note persistence/UI | [note policy] | Preserve; no repository/service/route/UI. |
| 10.3 | Private-to-author and shared-upward visibility | `PARTIAL` | 2026-09-01 | — | — | 10.2 | Pure policy only | Unit | Persisted visibility enforcement | [note policy] | — |
| 10.4 | Subject-employee exclusion | `PARTIAL` | 2026-09-01 | — | — | 10.2 | Pure policy only | Unit | Server-side persisted exclusion | [note policy] | — |
| 10.5 | Participant-only assignment/request discussions | `NOT_STARTED` | 2026-09-01 | — | — | Phase 4/7 | Documentation only | None located | Participant-only discussion | None located | — |
| 10.6 | Complete in-application notification centre | `PARTIAL` | 2026-09-01 | — | — | Source workflows | Notification schema/service only | Foundation integration | Readable notification centre | [notification service] | No event-specific workflows or UI. |
| 10.7 | Read, unread, related record, direct navigation, and archive behavior | `NOT_STARTED` | 2026-09-01 | — | — | 10.6 | Schema fields only | Disposable migration | Complete notification interaction | [schema] | — |
| 10.8 | Authorized audit-history interface | `PARTIAL` | 2026-09-01 | — | — | Source workflows | Audit schema/write service only | Unit; foundation integration | Authorized audit UI | [audit service] | `/audit` is a shell only. |
| 10.9 | Visibility, privacy, authorization, audit, notification, and E2E QA | `NOT_STARTED` | 2026-09-01 | — | — | 10.1–10.8 | Documentation only | None located | Full collaboration/governance QA | None located | — |

## Phase 11 — Dashboards, reports, and exports

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 11.1 | Super Admin dashboard | `NOT_STARTED` | 2026-09-01 | — | — | Source journeys | Dashboard shell only | Shell route E2E only | Trustworthy real dashboard | [navigation] | — |
| 11.2 | Scoped Admin dashboard | `NOT_STARTED` | 2026-09-01 | — | — | Source journeys | Dashboard shell only | Shell route E2E only | Scoped real dashboard | [navigation] | — |
| 11.3 | Employee dashboard | `NOT_STARTED` | 2026-09-01 | — | — | Source journeys | Dashboard shell only | Shell route E2E only | Published/personal dashboard | [navigation] | — |
| 11.4 | Employee allocation reports | `NOT_STARTED` | 2026-09-01 | — | — | Phase 4 | Documentation only | None located | Scoped accurate report | None located | — |
| 11.5 | Availability, leave, and coverage reports | `NOT_STARTED` | 2026-09-01 | — | — | Phases 5–7 | Documentation only | None located | Scoped accurate report | None located | — |
| 11.6 | Skill and certification reports | `NOT_STARTED` | 2026-09-01 | — | — | Phases 6, 9 | Documentation only | None located | Scoped accurate report | None located | — |
| 11.7 | Schedule and audit reports | `NOT_STARTED` | 2026-09-01 | — | — | Phases 4, 10 | Documentation only | None located | Scoped accurate report | None located | — |
| 11.8 | Authorized exports | `NOT_STARTED` | 2026-09-01 | — | — | 11.1–11.7 | Documentation only | None located | Export privacy/scope behavior | None located | — |
| 11.9 | Accuracy, scope, privacy, responsive, and E2E QA | `NOT_STARTED` | 2026-09-01 | — | — | 11.1–11.8 | Documentation only | None located | Complete reporting QA | None located | — |

## Phase 12 — Ticket System integration

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 12.1 | Existing Ticket System reuse assessment | `NOT_STARTED` | 2026-09-01 | — | — | Phases 1–11 | Documentation boundary only | None located | Approved reuse assessment | [roadmap] | Ticket inspection is deferred. |
| 12.2 | Ticket domain model | `NOT_STARTED` | 2026-09-01 | — | — | 12.1 | Documentation only | None located | Distinct ticket model | None located | — |
| 12.3 | Client/project/location relationships | `NOT_STARTED` | 2026-09-01 | — | — | 12.2, Phase 3 | Documentation only | None located | Distinct relationships | None located | — |
| 12.4 | Required skills and due dates | `NOT_STARTED` | 2026-09-01 | — | — | 12.2, Phase 6 | Documentation only | None located | Required-skill/due-date behavior | None located | — |
| 12.5 | Ticket-to-assignment-request relationship | `NOT_STARTED` | 2026-09-01 | — | — | 12.2, Phase 7 | Documentation only | None located | Separate request relationship | None located | — |
| 12.6 | Approved schedule-assignment relationship | `NOT_STARTED` | 2026-09-01 | — | — | 12.2, Phase 4 | Documentation only | None located | Separate approved relationship | None located | — |
| 12.7 | Work logs and attachments | `NOT_STARTED` | 2026-09-01 | — | — | 12.2, Phase 9 | Documentation only | None located | Distinct work logs/files | None located | — |
| 12.8 | Workforce role, scope, audit, notification, and storage enforcement | `NOT_STARTED` | 2026-09-01 | — | — | 12.2–12.7 | Foundation patterns only | Foundation QA only | Combined-system enforcement | [P1 certification] | — |
| 12.9 | Migration and combined-system QA | `NOT_STARTED` | 2026-09-01 | — | — | 12.1–12.8 | Documentation only | None located | Migration and combined journey QA | None located | — |

## Phase 13 — Production readiness and internal rollout

| ID | Sub-phase | Status | Last status date | Started date | Completed date | Dependencies | Implementation state | QA state | Exit evidence required | Current evidence | Blocker/notes |
| -- | --------- | ------ | ---------------- | ------------ | -------------- | ------------ | -------------------- | -------- | ---------------------- | ---------------- | ------------- |
| 13.1 | Production identity-provider selection and integration | `NOT_STARTED` | 2026-09-01 | — | — | Product journeys | Mock-only foundation | None located | Approved production identity | [architecture](SYSTEM_ARCHITECTURE_DECISIONS.md) | Provider unresolved. |
| 13.2 | Hosting, database, storage, environment, and HTTPS | `NOT_STARTED` | 2026-09-01 | — | — | 13.1 | Documentation direction only | None located | Approved deployed environment | [architecture](SYSTEM_ARCHITECTURE_DECISIONS.md) | Providers unresolved. |
| 13.3 | Backup and restore testing | `NOT_STARTED` | 2026-09-01 | — | — | 13.2 | Documentation only | None located | Restore-test evidence | None located | Required before real data. |
| 13.4 | Security and privacy review | `NOT_STARTED` | 2026-09-01 | — | — | 13.1–13.3 | Foundation evidence only | Foundation QA only | Product security/privacy review | [P1 certification] | — |
| 13.5 | Monitoring and operational logging | `NOT_STARTED` | 2026-09-01 | — | — | 13.2 | Documentation only | None located | Operational monitoring | None located | — |
| 13.6 | Performance and realistic concurrency testing | `NOT_STARTED` | 2026-09-01 | — | — | Product journeys, 13.2 | Foundation version tests only | Foundation integration only | Realistic performance/concurrency evidence | [Phase 2 core R3] | — |
| 13.7 | Controlled internal user-acceptance pilot | `NOT_STARTED` | 2026-09-01 | — | — | 13.1–13.6 | Documentation only | None located | Controlled pilot evidence | None located | — |
| 13.8 | Pilot feedback and blocker resolution | `NOT_STARTED` | 2026-09-01 | — | — | 13.7 | Documentation only | None located | Resolved pilot blockers | None located | — |
| 13.9 | Production migration and deployment | `NOT_STARTED` | 2026-09-01 | — | — | 13.1–13.8 | Runbook only | None located | Approved production migration/deployment | [runbook](../phase-reports/PHASE_2_PRODUCTION_MIGRATION_RUNBOOK.md) | No production access/certification. |
| 13.10 | Training, monitoring, rollback, and launch closure | `NOT_STARTED` | 2026-09-01 | — | — | 13.9 | Documentation only | None located | Launch closure evidence | None located | — |

## Reusable implementation outside the active phase

| Related future phase/sub-phase | Existing reusable work | Current classification | Why it is not complete | Evidence | Preservation instruction |
| ------------------------------ | ---------------------- | ---------------------- | ---------------------- | -------- | ------------------------ |
| 6.1–6.4 | Skills, catalogue, and employee-skill repositories/services | `PARTIAL` | Verified backend only; no operational routes/UI or scheduling use | [Phase 2 core R3] | Preserve and connect in Phase 6; do not rebuild. |
| 9.1–9.3, 9.6–9.8 | Evidence and file tables, review/expiry fields | `PARTIAL` | Schema only; no workflow | [Phase 2 database] | Preserve without expanding before Phase 9. |
| 9.4–9.5 | Vercel Blob validation/storage helper | `PARTIAL` | Unconnected provider-specific helper; no authorized transaction | [storage helper] | Preserve; replace/encapsulate only in approved Phase 9 work. |
| 10.2–10.4 | Employee-management-note table and visibility policy | `PARTIAL` | No repository/service/route/UI | [note policy] | Preserve without expanding before Phase 10. |
| 10.6–10.8 | Generic notification and audit persistence | `PARTIAL` | No central UI or source-workflow integration | [notification service] | Reuse in source workflows; complete central interfaces in Phase 10. |
| 3–12 | Role-aware navigation and empty module shells | `PARTIAL` | Shell visibility/protection only; no business behavior | [navigation] | Retain as clearly labelled shells until each owning journey is built. |

## Phase Definition of Done matrix

Use this template for every phase. `NOT_APPLICABLE` is allowed only with a reason; `COMPLETED` requires linked evidence.

| Gate | Required? | Status | Evidence | Notes |
| ---- | --------- | ------ | -------- | ----- |
| User story approved | Yes | `NOT_STARTED` | [roadmap] | Confirm the phase-specific story before work. |
| Acceptance criteria approved | Yes | `NOT_STARTED` | [requirements](PRODUCT_REQUIREMENTS.md) | Record phase-specific criteria. |
| Schema/migration | As applicable | `NOT_STARTED` | None located | — |
| Repository/service | As applicable | `NOT_STARTED` | None located | — |
| Validation | Yes | `NOT_STARTED` | None located | — |
| Server authorization | Yes | `NOT_STARTED` | None located | — |
| Scope/privacy | As applicable | `NOT_STARTED` | None located | — |
| Route/Server Action | As applicable | `NOT_STARTED` | None located | — |
| Real data-connected UI | Yes | `NOT_STARTED` | None located | Shells do not satisfy this gate. |
| Audit events | Sensitive workflow | `NOT_STARTED` | None located | — |
| Notifications | Required source event | `NOT_STARTED` | None located | State reason if not applicable. |
| Transactions/rollback | Multi-record operation | `NOT_STARTED` | None located | — |
| Concurrency | Concurrent edits possible | `NOT_STARTED` | None located | — |
| Unit tests | Yes | `NOT_STARTED` | None located | — |
| Disposable PostgreSQL tests | Persistence work | `NOT_STARTED` | None located | — |
| Route/API tests | Route/API exists | `NOT_STARTED` | None located | — |
| Negative authorization tests | Protected operation | `NOT_STARTED` | None located | — |
| Component tests | UI exists | `NOT_STARTED` | None located | — |
| Desktop E2E | User journey | `NOT_STARTED` | None located | — |
| Mobile E2E | User journey | `NOT_STARTED` | None located | — |
| Manual walkthrough | User journey | `NOT_STARTED` | None located | — |
| Documentation updated | Yes | `NOT_STARTED` | None located | — |

### Active Phase 2 gate matrix

| Gate | Required? | Status | Evidence | Notes |
| ---- | --------- | ------ | -------- | ----- |
| User story approved | Yes | `COMPLETED` | [roadmap] | Approved employee-management journey. |
| Acceptance criteria approved | Yes | `COMPLETED` | [roadmap]; [Phase 2 journey completion] | Journey requirements are implemented and verified within Phase 2 scope. |
| Schema/migration | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | Immutable 0000/0001/0002 preserved; additive 0003 employee-code sequence and runtime/export fingerprints verified. |
| Repository/service | Yes | `COMPLETED` | [Phase 2 journey completion] | Management, scope, lifecycle, self-service, and audit transaction services verified. |
| Validation | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | Bounded strict management/self-service contracts reject browser-supplied employee codes and protected fields. |
| Server authorization | Yes | `COMPLETED` | [Phase 2 journey completion] | Super Admin mutation, Admin read-only scope, and own-profile boundary enforced server-side. |
| Scope/privacy | Yes | `COMPLETED` | [Phase 2 journey completion] | TEAM intersection and Admin projection/privacy negative tests passed. |
| Route/Server Action | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | Protected management detail and self-service routes/actions passed; no public API added. |
| Real data-connected UI | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | Directory has labelled `Manage employee` action; detail visibly exposes real Super Admin controls; self profile uses PostgreSQL services. |
| Audit events | Yes | `COMPLETED` | [Phase 2 journey completion] | Safe identifiers/field names only; sensitive contents excluded. |
| Notifications | Where required | `NOT_APPLICABLE` | [requirements](PRODUCT_REQUIREMENTS.md) | NOT-002 does not confirm an employee-management event. |
| Transactions/rollback | Yes | `COMPLETED` | [Phase 2 journey completion] | Forced audit failure rolls back source mutation. |
| Concurrency | Yes | `COMPLETED` | [Phase 2 journey completion] | Versions reject stale profile/assignment/lifecycle/scope writes. |
| Unit tests | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | 29 focused validation/policy/component-adjacent unit tests passed. |
| Disposable PostgreSQL tests | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | 13 core-service and 8 migration tests passed with owned cleanup. |
| Route/API tests | Yes | `COMPLETED` | [Phase 2 journey completion] | Protected pages/actions are covered; no employee API was introduced. |
| Negative authorization tests | Yes | `COMPLETED` | [Phase 2 journey completion] | Cross-scope, vertical-role, malformed, and protected-field cases passed. |
| Component tests | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | 9 directory/detail/create component tests passed. |
| Desktop E2E | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | Super Admin visible controls and Employee self-service passed. |
| Mobile E2E | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | Same real controls/self-service journey passed at mobile viewport. |
| Manual walkthrough | Yes | `COMPLETED` | [Phase 2 controls/code remediation] | Disposable launcher smoke and equivalent desktop/mobile browser journey prove visible controls and Cora's real self-service form. |
| Documentation updated | Yes | `COMPLETED` | This tracker | Tracker created; update again with each status change. |

## Tracker maintenance protocol

1. Read [context], [roadmap], and this tracker before development.
2. Before implementation, change only the authorized sub-phase to `IN_PROGRESS`.
3. Do not mark a future dependent sub-phase `IN_PROGRESS`.
4. When implementation ends, use `VERIFICATION_PENDING` until all required QA finishes.
5. Mark `COMPLETED` only after every applicable gate passes.
6. Update the sub-phase row, master phase row, applicable Definition of Done matrix, status change log, and [context].
7. Add or link the relevant phase report.
8. Update `Last status date` whenever status changes.
9. Set `Completed date` only once completion is proven.
10. If a completed item later fails, reopen it to `IN_PROGRESS`, `BLOCKED`, or `VERIFICATION_PENDING` with evidence.
11. Never erase historical evidence.
12. Do not use Git activity, file existence, or estimated percentages as completion proof.
13. A phase is not complete until its entire end-to-end journey is verified.

## Status change log

Append new rows; correct an existing row only for a factual error. Every `COMPLETED` transition needs evidence; every `BLOCKED` transition needs a precise blocker; every reopening needs a reason and new evidence.

| Date | Item | Previous status | New status | Evidence | Reason/change summary | Updated by |
| ---- | ---- | --------------- | ---------- | -------- | --------------------- | ---------- |
| 2026-09-01 | Implementation status tracker | `NOT_STARTED` | `COMPLETED` | This tracker; [roadmap] | Created live tracker and reconciled baseline statuses without treating backend-only work or shells as completed journeys. | Codex |
| 2026-09-01 | 2.1 Preserve and reconcile existing employee backend | `PARTIAL` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Authorized Phase 2.1 custody and evidence reconciliation began. | Codex |
| 2026-09-01 | 2.1 Preserve and reconcile existing employee backend | `IN_PROGRESS` | `BLOCKED` | [Phase 2.1 reconciliation] | Focused backend verification passed and one Admin scoped-projection privacy defect was corrected; the pre-existing R1/R3 worktree assets lack reachable Git provenance, so no safe isolated commit/push is possible. | Codex |
| 2026-09-01 | 2.1 Preserve and reconcile existing employee backend | `BLOCKED` | `COMPLETED` | [Phase 2.1 closure] | Explicit controlled adoption authorized the fully inventoried, non-sensitive Phase 2.1 backend/harness/test/evidence set; focused disposable verification and isolated main commit/push completed. | Codex |
| 2026-09-01 | 2.2 Real employee directory | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Authorized Phase 2.2 server-rendered, scope-safe real directory work began. | Codex |
| 2026-09-01 | 2.2 Real employee directory | `IN_PROGRESS` | `COMPLETED` | [Phase 2.2 directory] | Basic server-rendered PostgreSQL directory, management-only service boundary, TEAM-scoped Admin projection, safe empty state, and desktop/mobile verification passed. | Codex |
| 2026-09-01 | 2.3 Employee search and filters | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Authorized Phase 2.3 server-side search and filtering work began. | Codex |
| 2026-09-01 | 2.3 Employee search and filters | `IN_PROGRESS` | `COMPLETED` | [Phase 2.3 search] | Bounded validated GET search/filters, TEAM-scope intersection, safe invalid/no-result states, and disposable desktop/mobile verification completed. | Codex |
| 2026-09-01 | 2.4 Create employee | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Authorized Super Admin-only workforce-record creation work began. | Codex |
| 2026-09-01 | 2.4 Create employee | `IN_PROGRESS` | `BLOCKED` | [Phase 2.4 blocked] | Code and disposable verification passed, but `npm run build` automatically loaded `.env.production`, contrary to the explicit no-sourcing restriction. No commit/push occurred; explicit user disposition is required. | Codex |
| 2026-09-01 | 2.4 Create employee | `BLOCKED` | `IN_PROGRESS` | [Phase 2.4 blocked]; authorized remediation Phase ID | User authorized an isolated no-`.env*` safe-build runner, full re-verification, and closure if every check passes. | Codex |
| 2026-09-01 | 2.4 Create employee | `IN_PROGRESS` | `COMPLETED` | [Phase 2.4 closure] | Isolated no-`.env*` typecheck/build, disposable verification, desktop/mobile browser tests, lint, and diff checks passed; the earlier automatic environment-load incident remains documented. | Codex |
| 2026-09-01 | 2.5 View employee details | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Authorized scoped employee-detail work began. | Codex |
| 2026-09-01 | 2.5 View employee details | `IN_PROGRESS` | `COMPLETED` | [Phase 2 core R3] | Protected detail route, non-enumerating scope behavior, and Super Admin/Admin projection tests passed. | Codex |
| 2026-09-01 | 2.6 Edit, activate, and deactivate employee | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Authorized lifecycle mutation work began. | Codex |
| 2026-09-01 | 2.6 Edit, activate, and deactivate employee | `IN_PROGRESS` | `COMPLETED` | [Phase 2 journey completion] | Super Admin edit/lifecycle actions, atomic audit, session revocation, and optimistic concurrency passed. | Codex |
| 2026-09-01 | 2.7 Assign role, designation, manager, team, status, and working pattern | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Dependent assignment work began after 2.6 evidence passed. | Codex |
| 2026-09-01 | 2.7 Assign role, designation, manager, team, status, and working pattern | `IN_PROGRESS` | `COMPLETED` | [Phase 2 journey completion] | Separate governed assignments, explicit TEAM scopes, manager-cycle safeguards, and additive descriptive working pattern passed. | Codex |
| 2026-09-01 | 2.8 Employee self-service profile | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Dependent own-profile work began after management assignment evidence passed. | Codex |
| 2026-09-01 | 2.8 Employee self-service profile | `IN_PROGRESS` | `COMPLETED` | [Phase 2 journey completion] | Real own-profile route/action, strict three-field boundary, and stale-update feedback passed. | Codex |
| 2026-09-01 | 2.9 Employee privacy and Admin scope | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Browser-facing privacy/scope regression began. | Codex |
| 2026-09-01 | 2.9 Employee privacy and Admin scope | `IN_PROGRESS` | `COMPLETED` | [Phase 2 journey completion] | TEAM-only scope, non-enumerating details, hidden Admin contacts/location, and mutation denial passed. | Codex |
| 2026-09-01 | 2.10 Audit, transactions, concurrency, and notifications where required | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Cross-cutting employee-mutation evidence reconciliation began. | Codex |
| 2026-09-01 | 2.10 Audit, transactions, concurrency, and notifications where required | `IN_PROGRESS` | `COMPLETED` | [Phase 2 journey completion] | Transaction/audit rollback, stale writes, session effects passed; notifications are not applicable to unconfirmed employee events. | Codex |
| 2026-09-01 | 2.11 Complete desktop/mobile user-journey QA | `NOT_STARTED` | `IN_PROGRESS` | [roadmap]; authorized Phase ID | Full fictional desktop/mobile journey verification began. | Codex |
| 2026-09-01 | 2.11 Complete desktop/mobile user-journey QA | `IN_PROGRESS` | `COMPLETED` | [Phase 2 journey completion] | Disposable desktop/mobile Playwright, safe build, service, migration, component, lint, and diff gates passed. | Codex |
| 2026-09-01 | Phase 2 manual QA runtime readiness | `COMPLETED` | `IN_PROGRESS` | authorized remediation Phase ID | Manual users reported safe-boundary errors; runtime readiness and fixture/launch evidence was reopened without changing the completed Phase 2 scope. | Codex |
| 2026-09-01 | Phase 2 manual QA runtime readiness | `IN_PROGRESS` | `COMPLETED` | [Phase 2 manual QA readiness] | Root cause was an unsupported/unseeded local manual environment, not a Phase 2 product regression; disposable seeded launcher smoke passed for `/employees` and `/profile`. | Codex |
| 2026-09-01 | Phase 2 manual QA employee controls/code remediation | `COMPLETED` | `IN_PROGRESS` | authorized R2 remediation Phase ID | Manual QA showed that Super Admin controls were technically implemented but not discoverable from an unlabelled directory link, and employee code was incorrectly caller-supplied. Phase 2 acceptance was reopened while the visible journey and server-only allocator were corrected. | Codex |
| 2026-09-01 | Phase 2 manual QA employee controls/code remediation | `IN_PROGRESS` | `COMPLETED` | [Phase 2 controls/code remediation] | Labelled management entry/control groups, strict server-only sequential code allocation, disposable migration/core/component/unit/browser/manual-QA verification, and isolated build all passed. | Codex |
