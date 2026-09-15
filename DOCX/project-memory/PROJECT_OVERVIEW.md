# Project Overview

## Product purpose

ScopeIs Team Management System is a workforce planning and operational management system for a 15-20-person internal engineering team. It supports employee profiles and capabilities, clients, projects, locations, scheduling, availability, leave, coverage, replacements, work communication, notifications, a static planning map, and later ticket integration.

## Business problem

Managers currently lack one dependable view of where employees are assigned, what skills they have, when they are available, how future work is staffed, and whether leave or assignment changes create coverage gaps. Scarce specialties make substitution and leave decisions especially sensitive.

## Target users

- **Super Admin/team manager:** global workforce planning, schedule publication, leave decisions, coverage authority, account administration, audit and reporting.
- **Admin:** scoped account manager, senior, or coordinator who manages assigned clients/projects/locations/teams, prepares schedule drafts, and requests replacements.
- **Employee:** internal employee who views published work, maintains permitted profile/capability evidence, submits leave, and participates in relevant work communication.

System access roles are independent of job designations. An Account Manager or Senior Engineer may be an Admin; a Team Manager may be Super Admin.

## Main product boundaries

The product manages planned work and availability. It is not initially a full HR, payroll, attendance, accounting, GPS, recruitment, or performance system. The map uses stored home/location data and published schedule data for a selected date; it never represents live movement.

The existing Ticket System remains separate until Phase 12. A ticket describes work needed; an assignment identifies who, where, and when; a schedule represents planned time; a work log records work performed.

## Key confirmed decisions

1. Every employee is internally employed; "outsourced" is only an assignment arrangement.
2. Assignment-arrangement labels are configurable descriptions and do not drive logic.
3. Only Super Admin publishes schedules and decides leave.
4. Admins work only within assigned scope and do not recommend leave decisions.
5. Employees see published schedules only and cannot access the management planning map.
6. Project/client notes are work-related and visible to all authenticated users.
7. Employee-management notes follow private-to-author or shared-upward hierarchy.
8. Assignment/request discussions are private to requester and assignee(s).
9. Version 1 uses mock accounts without real passwords in documentation.
10. Ticket integration is the twelfth major roadmap phase and remains late.

## Non-goals

Live GPS, movement history, payroll, salary, accounting, biometric attendance, automatic timesheets, performance scoring, public registration, billing, multi-company SaaS tenancy, native mobile applications, WhatsApp integration, route optimization, fully automatic staffing decisions, full HR, recruitment, disciplinary workflows, and AI-driven final management decisions.

## Current project stage

The former module-first roadmap is superseded by the journey-first roadmap. Phase 0 discovery and technical direction are `COMPLETED`. Phase 1 is `COMPLETED_IN_NARROW_FOUNDATION_SCOPE`: mock authentication, server sessions, protected shell/navigation, role and initial scope enforcement, PostgreSQL/migration foundation, audit persistence, and disposable PostgreSQL QA are complete. Phase 2 — Employee management journey is `COMPLETED` (11/11). Phases 3–8 are `COMPLETED` as bounded, GitHub-pushed vertical journeys: Clients/Projects/Locations (`COMPLETED`), scheduling Draft → Proposed → Published V1 (`COMPLETED`), annual leave and availability (`COMPLETED`), controlled skills with transparent non-blocking warnings (`COMPLETED`), coverage and replacement (`COMPLETED`), and the management-only static planning map (`COMPLETED`).

The repository is currently at the Post-Phase-8 Checkpoint Sub-phase A: a bounded remediation of the aggregate verification harness and of the documentation that reports status. It does not start Phase 9 and changes no business behavior, permission, privacy projection, workflow, schema, or Phase 8 map behavior. Formal checkpoint closure is owned by Checkpoint Sub-phase B, performed by a separate agent.

Phase 9 — Certifications, CVs, portfolios, and files is the next journey and is `NOT_STARTED`; preserved incomplete certification/portfolio schema does not mean that journey has begun. Notes, discussions, the complete notification centre, and the audit interface remain Phase 10; dashboards, reports, and exports remain Phase 11; Ticket System integration remains Phase 12; production identity, deployment, and rollout remain Phase 13. Those later journey phases remain unimplemented or shell-only.
