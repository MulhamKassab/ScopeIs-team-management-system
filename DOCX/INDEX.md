# Documentation Index

## Purpose and status

This directory is the canonical documentation foundation for ScopeIs Team Management System. [`project-memory/IMPLEMENTATION_ROADMAP.md`](project-memory/IMPLEMENTATION_ROADMAP.md) is the sole authoritative phase-definition sequence and [`project-memory/IMPLEMENTATION_STATUS_TRACKER.md`](project-memory/IMPLEMENTATION_STATUS_TRACKER.md) is the sole authoritative live-status record. Phase 0 discovery is `COMPLETED`; Phase 1 is `COMPLETED` only in its narrow foundation scope; Phase 2 — Employee management journey is `COMPLETED` (11/11). Phase 3's scoped implementation remains `BLOCKED` only by preserved repository-wide QA interference. Phase 4 scheduling V1, Phase 5 leave, and Phase 6 controlled skills/non-blocking warning journey are `COMPLETED`; coverage and later phases remain deferred/unstarted.

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
- [`project-memory/IMPLEMENTATION_ROADMAP.md`](project-memory/IMPLEMENTATION_ROADMAP.md) - sole authoritative journey-first phases 0-13, completion standard, and cross-cutting delivery rules; it supersedes the former module-first order.
- [`project-memory/IMPLEMENTATION_STATUS_TRACKER.md`](project-memory/IMPLEMENTATION_STATUS_TRACKER.md) - sole authoritative live tracker for phase/sub-phase status, dates, evidence, blockers, QA state, and update protocol; it does not redefine roadmap scope.
- [`project-memory/UI_UX_FOUNDATION.md`](project-memory/UI_UX_FOUNDATION.md) - approved Phase 1 visual, responsive, accessibility, theme, and RTL foundation.
- [`project-memory/PHASE_2_EMPLOYEE_DOMAIN_DECISIONS.md`](project-memory/PHASE_2_EMPLOYEE_DOMAIN_DECISIONS.md) - approved Phase 2 employee, capability, evidence, privacy, and production-operational boundaries.
- [`project-memory/PHASE_3_OPERATIONAL_DOMAIN_DECISIONS.md`](project-memory/PHASE_3_OPERATIONAL_DOMAIN_DECISIONS.md) - implemented Phase 3 normalized operational model, explicit scope inheritance, lifecycle, privacy, audit, and no-scheduling boundary.
- [`project-memory/PHASE_4_SCHEDULING_DOMAIN_DECISIONS.md`](project-memory/PHASE_4_SCHEDULING_DOMAIN_DECISIONS.md) - implemented V1 Client-month schedule lifecycle, assignment/time model, scope/privacy boundary, overlap/concurrency rules, and explicit non-goals.
- [`project-memory/PHASE_5_LEAVE_DOMAIN_DECISIONS.md`](project-memory/PHASE_5_LEAVE_DOMAIN_DECISIONS.md) - Phase 5 annual leave, privacy, balance, and schedule-integrity decisions.
- [`project-memory/PHASE_6_SKILLS_CAPABILITIES_DECISIONS.md`](project-memory/PHASE_6_SKILLS_CAPABILITIES_DECISIONS.md) - Phase 6 controlled-skill, requirement-union, privacy, and non-blocking warning decisions.
- [`project-memory/DEFINITION_OF_DONE.md`](project-memory/DEFINITION_OF_DONE.md) - phase delivery gate requirements.
- [`project-memory/IMPLEMENTATION_STATUS_LOG.md`](project-memory/IMPLEMENTATION_STATUS_LOG.md) - append-only implementation status history.

## Implementation status

Historical reports remain immutable evidence and are not current roadmaps or tracker replacements. Phase 2.1–2.11 are completed as the bounded employee-management journey. Phase 3's pushed implementation and scoped QA are recorded in [`phase-reports/SCOPEIS_PHASE_3_CLIENT_PROJECT_LOCATION_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_3_CLIENT_PROJECT_LOCATION_JOURNEY_R1.md); its final classification remains `BLOCKED` only because preserved repository-wide QA interference is unresolved. Phase 4's V1, Phase 5 leave, and Phase 6 controlled skills/non-blocking warning evidence are recorded in [`phase-reports/SCOPEIS_PHASE_4_SCHEDULING_DRAFT_PROPOSED_PUBLISHED_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_4_SCHEDULING_DRAFT_PROPOSED_PUBLISHED_JOURNEY_R1.md), [`phase-reports/SCOPEIS_PHASE_5_LEAVE_AND_AVAILABILITY_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_5_LEAVE_AND_AVAILABILITY_JOURNEY_R1.md), and [`phase-reports/SCOPEIS_PHASE_6_SKILLS_AND_OPERATIONAL_CAPABILITIES_JOURNEY_R1.md`](phase-reports/SCOPEIS_PHASE_6_SKILLS_AND_OPERATIONAL_CAPABILITIES_JOURNEY_R1.md). No production authentication, database state, migration, or deployment is certified.

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
- Project/client notes are shared; requester-assignee discussions are private.
- The map is static planning, never GPS/live tracking.
- Ticket integration is Phase 12 and is not the foundation.
- Open decisions are labeled and are not implementation assumptions.
