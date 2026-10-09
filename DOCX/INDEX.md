## Company ticket production release — authorized 2026-10-09

- [Production release target, preservation and verification status](phase-reports/SCOPEIS_COMPANY_TICKETS_PRODUCTION_2026_10_09.md)
- The product owner explicitly requested deployment after local delivery. Release work is `IN_PROGRESS` for the existing [canonical ScopeIs application](https://scopeis-team-management-system.vercel.app/); backup/restore proof, additive production migration, deployment and live checks are pending. This supersedes the prior local-only boundary without completing the broader Phase 12 roadmap or certifying Phase 13 readiness.

## Company ticket implementation — authorized 2026-10-08

- [Confirmed Company core workflow, Employee workspace and permission decisions](project-memory/PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md)
- The approved core is implemented and locally verified at `/tickets`; see [the local delivery evidence](phase-reports/SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md). The [live tracker](project-memory/IMPLEMENTATION_STATUS_TRACKER.md) records Phase 12 as `PARTIAL`; future workforce handoffs and the user-deferred daily work/flowchart/cost-PDF tools remain outside the delivery. The later production authorization is recorded above; the local report preserves its original delivery boundary.

## Company Ticket System design review — 2026-10-07

- [Company source assessment, proposed experience and unresolved integration decisions](project-memory/PHASE_12_COMPANY_TICKET_DESIGN_REVIEW.md)
- The historical fictional-data design remains at `/previews/company-tickets.html`. Its design-only implementation restriction and unresolved core questions are superseded by the confirmed decisions above.

## Coverage conflict integrity — 2026-10-06

- [Confirmed coverage and support rules](project-memory/PHASE_7_COVERAGE_REPLACEMENT_DECISIONS.md)
- [Implementation and verification](phase-reports/SCOPEIS_COVERAGE_CONFLICT_INTEGRITY_2026_10_06.md)

## Clear user journeys — 2026-10-06

- [Canonical stories for all 20 tabs](project-memory/USER_JOURNEYS.md)
- [Fresh screenshots, findings and implementation review](phase-reports/SCOPEIS_CLEAR_USER_JOURNEYS_2026_10_06.html)

- [Production profile and page-access repair — 2026-10-06](phase-reports/SCOPEIS_PRODUCTION_PROFILE_PAGE_REPAIR_2026_10_06.md)
- [Production sign-in cutover — 2026-10-06](phase-reports/SCOPEIS_PRODUCTION_SIGN_IN_CUTOVER_2026_10_06.md)
- [Super Admin account and credential management report](phase-reports/SCOPEIS_SUPER_ADMIN_ACCOUNT_AND_CREDENTIAL_MANAGEMENT_R1.md)

## Latest expressive motion — 2026-10-05

See the [motion implementation and evidence](phase-reports/SCOPEIS_EXPRESSIVE_MOTION_2026_10_05.md) for directional content and route transitions, press feedback, native popup/sheet entrances and exits, and fresh desktop/phone visuals. The [motion foundation](project-memory/UI_UX_FOUNDATION.md) preserves responsive layout, roles, RTL, native controls and reduced-motion behavior. The final system lock passed 14/14 gates with all 12 responsive checks, 523 unique automated cases and 369 matching frozen inputs. Implementation commit `ae062dbf` is pushed and verified on `origin/main`; see the [delivery receipt](phase-reports/evidence/motion-refinement-2026-10-05/delivery.json). Earlier receipts remain historical evidence, and production deployment is unverified.

## Latest task discovery and planning-map experience — 2026-10-05

See the [experience review](phase-reports/SCOPEIS_UI_EXPERIENCE_AND_PLANNING_MAP_2026_10_05.md) for the dashboard-to-task journey, role-aware feature discovery, usable planning map, authorized schedule/coverage handoffs and fresh desktop/mobile screenshots. The approved requirements extend the [UI foundation](project-memory/UI_UX_FOUNDATION.md) and [map decisions](project-memory/PHASE_8_STATIC_PLANNING_MAP_DECISIONS.md). The clean 14/14 system lock includes all 11 responsive checks. Implementation commit `22d2b4d` is pushed and verified on `origin/main`; see the [delivery receipt](phase-reports/evidence/ui-experience-2026-10-05/delivery.json). Evidence is separate from earlier receipts, and production deployment remains unverified.

## Latest visual refinement — 2026-10-05

The [visual foundation](project-memory/UI_UX_FOUNDATION.md) records the user-approved texture, surface, control and motion direction. See the [verification receipt](phase-reports/evidence/visual-refinement-2026-10-05/verification.json), [light desktop](phase-reports/evidence/visual-refinement-2026-10-05/1280-light-dashboard.png), [phone dashboard](phase-reports/evidence/visual-refinement-2026-10-05/390-light-dashboard.png), [dark desktop](phase-reports/evidence/visual-refinement-2026-10-05/1280-dark-dashboard.png) and [focused phone dialog](phase-reports/evidence/visual-refinement-2026-10-05/390-dark-focused-dialog.png). Rerun presentation, contrast/focus and motion checks with `npm run test:responsive`.

## Latest responsive implementation — 2026-10-05

The [responsive foundation](project-memory/UI_UX_FOUNDATION.md) records the application-wide mobile, tablet, text, control and dialog requirements. See the [verification receipt](phase-reports/evidence/mobile-responsive-2026-10-05/verification.json), [phone dashboard](phase-reports/evidence/mobile-responsive-2026-10-05/390-dashboard.png), [narrow schedule](phase-reports/evidence/mobile-responsive-2026-10-05/320-schedule.png) and [mobile account card](phase-reports/evidence/mobile-responsive-2026-10-05/390-account-card.png). The dedicated presentation gate is `npm run test:responsive`.

## Latest UI/UX implementation — 2026-09-30

See the [workflow clarity implementation and screenshots](phase-reports/SCOPEIS_UI_UX_WORKFLOW_CLARITY_2026_09_30.html) for the approved design pass: task-based navigation, role-prioritized dashboards, record-first pages, focused dialogs, connected planning and responsive controls. This is local implementation over the existing product and does not close the audit’s retained-history assignment-removal finding or certify Ticket integration.

## Latest audit — 2026-09-30

See the [website audit and repair review](phase-reports/SCOPEIS_WEBSITE_AUDIT_2026_09_30.html) for the 13-step screenshot walkthrough, verified local fixes, test evidence and prioritized improvements. The [live tracker](project-memory/IMPLEMENTATION_STATUS_TRACKER.md) reopens the retained-history assignment-removal path; historical completion reports remain unchanged. This audit does not certify Production or the separate nearly completed Ticket System integration.
- [Super Admin account management decisions](project-memory/SUPER_ADMIN_ACCOUNT_MANAGEMENT_DECISIONS.md)
- [Credential authentication remediation report](phase-reports/SCOPEIS_EXISTING_USER_CREDENTIAL_AUTHENTICATION_R1.md)
- [Credential authentication decisions](project-memory/CREDENTIAL_AUTHENTICATION_DECISIONS.md)
- [Pre-Phase-12 system-wide hardening and regression lock report](phase-reports/SCOPEIS_PRE_PHASE_12_SYSTEM_WIDE_HARDENING_AND_REGRESSION_LOCK_R1.md)
- [System-wide test scenario catalogue](project-memory/SYSTEM_WIDE_TEST_SCENARIO_CATALOG.md)
- [Phase 11 dashboard acceptance and manifest reconciliation report](phase-reports/SCOPEIS_PHASE_11_DASHBOARD_ACCEPTANCE_AND_MANIFEST_RECONCILIATION_R1.md)
- [Phase 11 dashboards, reports and exports report](phase-reports/SCOPEIS_PHASE_11_DASHBOARDS_REPORTS_AND_AUTHORIZED_EXPORTS_R1.md)
- [Phase 11 reporting decisions](project-memory/PHASE_11_REPORTING_DECISIONS.md)
- [Phase 10 management-note authorization remediation report](phase-reports/SCOPEIS_PHASE_10_MANAGEMENT_NOTE_AUTHORIZATION_REMEDIATION_R1.md)
- [Phase 10 notes, discussions, notification centre, and audit interface report](phase-reports/SCOPEIS_PHASE_10_NOTES_DISCUSSIONS_NOTIFICATION_CENTRE_AND_AUDIT_INTERFACE_R1.md)
- [Phase 10 collaboration and governance decisions](project-memory/PHASE_10_COLLABORATION_AND_GOVERNANCE_DECISIONS.md)
- [Post-Phase-8 Checkpoint Sub-phase B closure report](phase-reports/SCOPEIS_POST_PHASE_8_CHECKPOINT_SUBPHASE_B_CLOSURE_R1.md)
- [Post-Phase-8 Checkpoint Sub-phase A remediation report](phase-reports/SCOPEIS_POST_PHASE_8_CHECKPOINT_SUBPHASE_A_REMEDIATION_R1.md)
- [Phase 9 capability evidence journey report](phase-reports/SCOPEIS_PHASE_9_CERTIFICATIONS_CVS_PORTFOLIOS_AND_PRIVATE_FILES_JOURNEY_R1.md)
- [Phase 7 coverage and replacement decisions](project-memory/PHASE_7_COVERAGE_REPLACEMENT_DECISIONS.md)
- [Phase 7 implementation report](phase-reports/SCOPEIS_PHASE_7_COVERAGE_AND_REPLACEMENT_JOURNEY_R1.md)
- [Phase 8 static planning map decisions](project-memory/PHASE_8_STATIC_PLANNING_MAP_DECISIONS.md)
- [Phase 8 implementation report](phase-reports/SCOPEIS_PHASE_8_STATIC_PLANNING_MAP_JOURNEY_R1.md)

## Purpose and status

This directory is the canonical documentation foundation for ScopeIs Team Management System. [`project-memory/IMPLEMENTATION_ROADMAP.md`](project-memory/IMPLEMENTATION_ROADMAP.md) is the sole authoritative phase-definition sequence and [`project-memory/IMPLEMENTATION_STATUS_TRACKER.md`](project-memory/IMPLEMENTATION_STATUS_TRACKER.md) is the sole authoritative live-status record. Phase 0 discovery is `COMPLETED`; Phase 1 is complete only in its narrow foundation scope; Phase 2 — Employee management journey is `COMPLETED` (11/11). Phases 3 and 5–11 retain their bounded completed journeys. Phase 4 is `PARTIAL`: the September 30 audit reopened retained-history assignment omission/removal and complete-path QA; the original V1 completion report is historical evidence. The Post-Phase-8 checkpoint is `COMPLETED` at remediation commit `decb377decb32b3d064b14024c3079879dd932c0` (Sub-phase A remediation, Sub-phase B independent closure). Phase 10's employee-management-note remediation requires current subject authorization in addition to note visibility, so authorship does not override demotion, deactivation or scope loss. Phase 12 — Ticket System integration — is `PARTIAL`, with the approved Company core locally implemented and verified and future workforce handoffs outside that delivery; production identity and rollout remain Phase 13. Phase 9.9 (coverage linkage for verified evidence) is `DEFERRED` pending a product decision.

## Reader path

1. Read [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) for active orientation.
2. Read [`project-memory/IMPLEMENTATION_ROADMAP.md`](project-memory/IMPLEMENTATION_ROADMAP.md) for authoritative phase definitions and order.
3. Read [`project-memory/IMPLEMENTATION_STATUS_TRACKER.md`](project-memory/IMPLEMENTATION_STATUS_TRACKER.md) for live status, evidence, blockers, and the current sub-phase.
4. Read the relevant requirements and workflow documents, including [`project-memory/PRODUCT_REQUIREMENTS.md`](project-memory/PRODUCT_REQUIREMENTS.md), [`project-memory/ROLE_AND_PERMISSION_MODEL.md`](project-memory/ROLE_AND_PERMISSION_MODEL.md), [`project-memory/SYSTEM_HIERARCHY_AND_RELATIONSHIPS.md`](project-memory/SYSTEM_HIERARCHY_AND_RELATIONSHIPS.md), and [`project-memory/WORKFLOWS.md`](project-memory/WORKFLOWS.md).
5. Before technical implementation, read [`project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md`](project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md) and the relevant historical phase reports as evidence only. Ticket System integration remains Phase 12.

## Word documents

- [`requirements/ScopeIs_Team_Management_System_Product_Requirements.docx`](requirements/ScopeIs_Team_Management_System_Product_Requirements.docx) - formal product requirements, role/privacy expectations, roadmap, open decisions, and glossary.
- [`requirements/ScopeIs_Team_Management_System_Roles_Workflows_and_Hierarchy.docx`](requirements/ScopeIs_Team_Management_System_Roles_Workflows_and_Hierarchy.docx) - system hierarchy, permission matrix, operational workflows, scenarios, and embedded diagrams.

## Artifact validation record

| Artifact | Validation result |
|---|---|
| Product Requirements DOCX | Valid Microsoft OOXML; 14 rendered pages; all pages visually inspected |
| Roles, Workflows, and Hierarchy DOCX | Valid Microsoft OOXML; 14 rendered pages; all pages visually inspected; nine diagrams embedded |
| Diagram set | Nine valid RGB PNGs; 2400 x 1400 pixels each; all visually inspected |
| Markdown project memory | Relative links resolved; requirement, role, workflow, and roadmap terminology cross-checked |

## Markdown project memory

- [`project-memory/PROJECT_OVERVIEW.md`](project-memory/PROJECT_OVERVIEW.md) - purpose, users, boundaries, decisions, non-goals, stage.
- [`project-memory/PRODUCT_REQUIREMENTS.md`](project-memory/PRODUCT_REQUIREMENTS.md) - identified, test-oriented functional and non-functional requirements.
- [`project-memory/ROLE_AND_PERMISSION_MODEL.md`](project-memory/ROLE_AND_PERMISSION_MODEL.md) - roles, scopes, prohibitions, complete permission matrix.
- [`project-memory/SYSTEM_HIERARCHY_AND_RELATIONSHIPS.md`](project-memory/SYSTEM_HIERARCHY_AND_RELATIONSHIPS.md) - modules, entities, and cross-domain relationships.
- [`project-memory/WORKFLOWS.md`](project-memory/WORKFLOWS.md) - principal workflows and practical scenarios.
- [`project-memory/DECISIONS_AND_CONSTRAINTS.md`](project-memory/DECISIONS_AND_CONSTRAINTS.md) - confirmed decisions, constraints, non-goals, unsafe assumptions, open/deferred decisions.
- [`project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md`](project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md) - current recommended Phase 1 architecture; translates product rules into modular, server-side, database, transaction, adapter, testing, and deployment boundaries without finalizing providers.
- [`project-memory/SYSTEM_WIDE_TEST_SCENARIO_CATALOG.md`](project-memory/SYSTEM_WIDE_TEST_SCENARIO_CATALOG.md) - pre-Phase-12 scenario catalogue and traceability matrix; the machine-readable registry is `test/system-lock/scenario-manifest.json`.
- [`project-memory/IMPLEMENTATION_ROADMAP.md`](project-memory/IMPLEMENTATION_ROADMAP.md) - sole authoritative journey-first phases 0-13, completion standard, and cross-cutting delivery rules; it supersedes the former module-first order.
- [`project-memory/IMPLEMENTATION_STATUS_TRACKER.md`](project-memory/IMPLEMENTATION_STATUS_TRACKER.md) - sole authoritative live tracker for phase/sub-phase status, dates, evidence, blockers, QA state, and update protocol; it does not redefine roadmap scope.
- [`project-memory/UI_UX_FOUNDATION.md`](project-memory/UI_UX_FOUNDATION.md) - approved Phase 1 visual, responsive, accessibility, theme, and RTL foundation.
- [`project-memory/PHASE_2_EMPLOYEE_DOMAIN_DECISIONS.md`](project-memory/PHASE_2_EMPLOYEE_DOMAIN_DECISIONS.md) - approved Phase 2 employee, capability, evidence, privacy, and production-operational boundaries.
- [`project-memory/PHASE_3_OPERATIONAL_DOMAIN_DECISIONS.md`](project-memory/PHASE_3_OPERATIONAL_DOMAIN_DECISIONS.md) - implemented Phase 3 normalized operational model, explicit scope inheritance, lifecycle, privacy, audit, and no-scheduling boundary.
- [`project-memory/PHASE_4_SCHEDULING_DOMAIN_DECISIONS.md`](project-memory/PHASE_4_SCHEDULING_DOMAIN_DECISIONS.md) - implemented V1 Client-month schedule lifecycle, assignment/time model, scope/privacy boundary, overlap/concurrency rules, and explicit non-goals.
- [`project-memory/PHASE_5_LEAVE_DOMAIN_DECISIONS.md`](project-memory/PHASE_5_LEAVE_DOMAIN_DECISIONS.md) - Phase 5 annual leave, privacy, balance, and schedule-integrity decisions.
- [`project-memory/PHASE_6_SKILLS_CAPABILITIES_DECISIONS.md`](project-memory/PHASE_6_SKILLS_CAPABILITIES_DECISIONS.md) - Phase 6 controlled-skill, requirement-union, privacy, and non-blocking warning decisions.
- [`project-memory/PHASE_7_COVERAGE_REPLACEMENT_DECISIONS.md`](project-memory/PHASE_7_COVERAGE_REPLACEMENT_DECISIONS.md) - Phase 7 coverage-gap, replacement-request, decision-authority, and Draft-only effect decisions.
- [`project-memory/PHASE_8_STATIC_PLANNING_MAP_DECISIONS.md`](project-memory/PHASE_8_STATIC_PLANNING_MAP_DECISIONS.md) - Phase 8 static planning map, privacy, and explicit no-surveillance decisions.
- [`project-memory/PHASE_10_COLLABORATION_AND_GOVERNANCE_DECISIONS.md`](project-memory/PHASE_10_COLLABORATION_AND_GOVERNANCE_DECISIONS.md) - Phase 10 shared-note, management-note, discussion, notification, audit, and Phase 9 integrity decisions.
- [`project-memory/DEFINITION_OF_DONE.md`](project-memory/DEFINITION_OF_DONE.md) - phase delivery gate requirements.
- [`project-memory/IMPLEMENTATION_STATUS_LOG.md`](project-memory/IMPLEMENTATION_STATUS_LOG.md) - append-only implementation status history.

## Implementation status

Historical reports remain immutable evidence and are not current roadmaps or tracker replacements. Phase 2.1–2.11 are completed as the bounded employee-management journey. Phase 3's pushed implementation and scoped QA are recorded in [`phase-reports/SCOPEIS_PHASE_3_CLIENT_PROJECT_LOCATION_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_3_CLIENT_PROJECT_LOCATION_JOURNEY_R1.md); the previously preserved repository-wide QA interference was closed on 2026-09-15 by [`phase-reports/SCOPEIS_POST_PHASE_8_CHECKPOINT_SUBPHASE_A_REMEDIATION_R1.md`](phase-reports/SCOPEIS_POST_PHASE_8_CHECKPOINT_SUBPHASE_A_REMEDIATION_R1.md). Phase 4's V1, Phase 5 leave, Phase 6 controlled skills/non-blocking warning, Phase 7 coverage/replacement, Phase 8 static planning map, and Phase 9 capability evidence are recorded in [`phase-reports/SCOPEIS_PHASE_4_SCHEDULING_DRAFT_PROPOSED_PUBLISHED_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_4_SCHEDULING_DRAFT_PROPOSED_PUBLISHED_JOURNEY_R1.md), [`phase-reports/SCOPEIS_PHASE_5_LEAVE_AND_AVAILABILITY_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_5_LEAVE_AND_AVAILABILITY_JOURNEY_R1.md), [`phase-reports/SCOPEIS_PHASE_6_SKILLS_AND_OPERATIONAL_CAPABILITIES_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_6_SKILLS_AND_OPERATIONAL_CAPABILITIES_JOURNEY_R1.md), [`phase-reports/SCOPEIS_PHASE_7_COVERAGE_AND_REPLACEMENT_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_7_COVERAGE_AND_REPLACEMENT_JOURNEY_R1.md), [`phase-reports/SCOPEIS_PHASE_8_STATIC_PLANNING_MAP_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_8_STATIC_PLANNING_MAP_JOURNEY_R1.md), and [`phase-reports/SCOPEIS_PHASE_9_CERTIFICATIONS_CVS_PORTFOLIOS_AND_PRIVATE_FILES_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_9_CERTIFICATIONS_CVS_PORTFOLIOS_AND_PRIVATE_FILES_JOURNEY_R1.md). Phase 10 collaboration and governance evidence is recorded in [`phase-reports/SCOPEIS_PHASE_10_NOTES_DISCUSSIONS_NOTIFICATION_CENTRE_AND_AUDIT_INTERFACE_R1.md`](phase-reports/SCOPEIS_PHASE_10_NOTES_DISCUSSIONS_NOTIFICATION_CENTRE_AND_AUDIT_INTERFACE_R1.md), including the Phase 9 evidence-integrity correction. Phase 11 dashboards, reports and authorized exports evidence is recorded in [`phase-reports/SCOPEIS_PHASE_11_DASHBOARDS_REPORTS_AND_AUTHORIZED_EXPORTS_R1.md`](phase-reports/SCOPEIS_PHASE_11_DASHBOARDS_REPORTS_AND_AUTHORIZED_EXPORTS_R1.md). Its post-delivery management-note authorization remediation is recorded in [`phase-reports/SCOPEIS_PHASE_10_MANAGEMENT_NOTE_AUTHORIZATION_REMEDIATION_R1.md`](phase-reports/SCOPEIS_PHASE_10_MANAGEMENT_NOTE_AUTHORIZATION_REMEDIATION_R1.md). No production authentication, database state, migration, or deployment is certified.

## Verification commands

The maintained application has one documented verification contract; see the [Post-Phase-8 Checkpoint Sub-phase A remediation report](phase-reports/SCOPEIS_POST_PHASE_8_CHECKPOINT_SUBPHASE_A_REMEDIATION_R1.md) and `README.md`. An ordinary `npm run build` is **not** sanctioned while a local `.env.production` can be auto-loaded; the authoritative build gate is `npm run build:safe`.

## Diagram catalog

All files below are high-resolution PNG images generated by a deterministic drawing process. No Mermaid source or block is used.

1. [`diagrams/01_system_module_hierarchy.png`](diagrams/01_system_module_hierarchy.png)
2. [`diagrams/02_role_and_permission_hierarchy.png`](diagrams/02_role_and_permission_hierarchy.png)
3. [`diagrams/03_client_project_location_employee_relationships.png`](diagrams/03_client_project_location_employee_relationships.png)
4. [`diagrams/04_schedule_draft_review_publish_workflow.png`](diagrams/04_schedule_draft_review_publish_workflow.png)
5. [`diagrams/05_leave_coverage_and_replacement_workflow.png`](diagrams/05_leave_coverage_and_replacement_workflow.png)
6. [`diagrams/06_notes_and_communication_visibility.png`](diagrams/06_notes_and_communication_visibility.png)
7. [`diagrams/07_certification_and_portfolio_notification_workflow.png`](diagrams/07_certification_and_portfolio_notification_workflow.png)
8. [`diagrams/08_static_planning_map_data_flow.png`](diagrams/08_static_planning_map_data_flow.png)
9. [`diagrams/09_ticket_system_later_integration.png`](diagrams/09_ticket_system_later_integration.png)

## Major-requirement traceability

| Requirement area | Canonical requirements | Role/workflow reference | Diagram(s) | Word document coverage |
|---|---|---|---|---|
| Three-role model and scope | ROL-001-006 | Role Model; Workflows 1-12 | 02 | Both |
| Internal employee / arrangement boundary | EMP-002; ARR-001-004 | Overview; Relationships | 01, 03 | Product Requirements; Hierarchy |
| Profiles, skills, certifications, portfolio | EMP-001-004; SKL-001-003; CER-001-004 | Workflows 1-2 | 03, 07 | Both |
| Clients/projects/locations | CLI-001-002; PRJ-001; LOC-001; REL-001 | Workflow 3 | 03 | Both |
| Draft/proposal/publication | SCH-001-011 | Workflows 4-5 | 04 | Both |
| Leave privacy and decision | LEV-001-008 | Workflow 6 | 05 | Both |
| Coverage and replacement | COV-001-004; REP-001-005 | Workflows 6-7 | 05 | Both |
| Static non-live map | MAP-001-007 | Workflow 8 | 08 | Both |
| Note/discussion visibility | NTE-001-006; COM-001-002 | Workflows 9-11 | 06 | Both |
| Notifications | NOT-001-003 | Workflows 2, 4, 6, 7, 11 | 07 plus workflow diagrams | Both |
| Mock authentication | AUT-001-002 | Overview; Roadmap Phase 1 | 01 | Product Requirements |
| Non-functional/privacy/audit | AUD-001-002; NFR-001-005 | Decisions and Constraints | 01, 02, 08 | Product Requirements |
| Ticket boundary and Phase 12 | TKT-001-005 | Workflow 12; Roadmap Phase 12 | 09 | Both |
| Open decisions remain unresolved | MAP-007; LEV-008; CER-004 plus decision table | Decisions and Constraints | Relevant diagrams label boundaries | Both |

## Consistency controls

- Employees are always internal; "outsourced" means assigned to a client.
- Admin cannot publish schedules, approve/reject leave, or recommend leave outcomes.
- Employee cannot access the management planning map.
- Shared Client, Project, and Location notes are limited to authenticated users already authorized on the parent record; replacement-request discussions are limited to the participants derived from the request.
- Employee-management notes stay private-to-author or shared-upward; the subject never sees them.
- The notification centre belongs to one recipient, and audit history is Super Admin-only, read-only and not exportable.
- Reporting reads the current Published schedule; the separate `PLANNING (unpublished)` report carries Draft and Proposed rows to management and is never visible to an Employee.
- Phase 11 never classifies a person as generally available: the only permitted derived fact is the four-value conflict fact.
- The map is static planning, never GPS/live tracking.
- Ticket integration is Phase 12 and is not the foundation.
- Open decisions are labeled and are not implementation assumptions.
- [`project-memory/PHASE_11_REPORTING_DECISIONS.md`](project-memory/PHASE_11_REPORTING_DECISIONS.md) - Phase 11 role/scope/export matrix, the conflict fact, privacy exclusions and the deferred reporting decisions.

- [Persistent company demo decisions](project-memory/COMPANY_DEMO_WORKSPACE_DECISIONS.md)
- [Company demo delivery and operator runbook — 2026-10-06](phase-reports/SCOPEIS_COMPANY_DEMO_WORKSPACE_2026_10_06.md)
- [Company example at the primary URL — 2026-10-06](phase-reports/SCOPEIS_PRIMARY_COMPANY_CUTOVER_2026_10_06.md)
- [Confirmed seven-person company roster — 2026-10-06](phase-reports/SCOPEIS_COMPANY_ROSTER_2026_10_06.md)

## Monthly timetable and people management — 2026-10-06

The user confirmed monthly timetable views, clearer coverage and replacements, managed Teams and Designations with membership controls, and role-appropriate Super Admin coverage wording. See [requirements and verification](phase-reports/SCOPEIS_TIMETABLE_PEOPLE_2026_10_06.md).
