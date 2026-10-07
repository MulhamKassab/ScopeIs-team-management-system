# Product Requirements

## Requirement interpretation

"Must" identifies confirmed behavior. "May" identifies an allowed option without committing the implementation. Open decisions are referenced but never treated as acceptance criteria. The system is a responsive web application for an internal team of approximately 15-20 people with reasonable growth.

## Roles, access, and audit

- **ROL-001:** The system must support exactly three initial system roles: Super Admin, Admin, and Employee.
- **ROL-002:** The system must store system role separately from job designation, skill, team, employment status, and assignment arrangement.
- **ROL-003:** Super Admin must be able to assign roles and manage mock accounts in version 1.
- **ROL-004:** Admin access to employees, clients, projects, locations, schedules, maps, notes, replacements, and reports must be limited to assigned scope.
- **ROL-005:** Employee access must be limited to their own private records, their published assignments, generally shared project/client content, and discussions in which they participate.
- **ROL-006:** Authorization must eventually be enforced server-side for every protected operation, not only through interface visibility.
- **AUD-001:** The system must record auditable history for role/scope changes, significant record changes, schedule publication and post-publication edits, leave decisions, replacement decisions, note changes, and significant overrides.
- **AUD-002:** A significant override must record actor, time, item overridden, and reason.

## Employee profiles and capabilities

- **EMP-001:** An employee profile must support name, employee identifier, contact details, job designation, system role, team/department, assigned manager, working pattern when defined, active status, protected home location/area and coordinates when available, and default work location.
- **EMP-002:** All employee records must represent internal employees; an outsourced/client placement must be represented only as an assignment arrangement or assignment.
- **EMP-003:** Employees must be able to update only explicitly permitted profile fields.
- **EMP-004:** Super Admin must be able to create, edit, deactivate, and manage employee accounts; whether Admin may create employees is open.
- **SKL-001:** An employee must support multiple skills.
- **SKL-002:** A skill association may store proficiency, experience, notes, certifications, coverage eligibility, and verification state without selecting an unconfirmed proficiency scale.
- **SKL-003:** Skill and availability filters must be usable by authorized planners when finding candidates.
- **CER-001:** Employees must be able to add certifications with issuer, issue date, expiry date, and supporting file, and maintain portfolio links/files, CV, project examples, and supporting documents.
- **CER-002:** Certification or portfolio additions/updates must be saved immediately, marked new/updated, and notify Super Admin in-system.
- **CER-003:** Super Admin must be able to mark an item reviewed or verified without turning submission into a mandatory approval workflow.
- **CER-004:** Coverage use of unverified certifications must remain configurable or deferred until the verification rule is confirmed.

## Assignment arrangements

- **ARR-001:** Super Admin must be able to add, rename, reorder, color, activate/deactivate, and archive assignment-arrangement labels.
- **ARR-002:** Labels such as Internal Office, Outsourced to Client, Permanent Client Assignment, Scheduled Visit, Temporary Project, One-Time Visit, On Call, or Available must be descriptive only.
- **ARR-003:** Availability, coverage, leave eligibility, replacement eligibility, work hours, permissions, and conflicts must not be derived solely from an arrangement label.
- **ARR-004:** A used label must be safely archived or retained in history rather than silently destroying historical meaning.

## Clients, projects, and locations

- **CLI-001:** A client must support company name, Account Manager, contacts, service/contract period, services, specialty requirements, related projects/locations, assigned employees, visits, coverage requirements, and shared notes as applicable.
- **CLI-002:** The model must distinguish the Account Manager who coordinates a client from employees who perform fieldwork.
- **PRJ-001:** A project must support name, client, responsible Admin/manager, dates, status, locations, required skills, employees, shared notes, schedule entries, and later ticket links.
- **LOC-001:** A location must support name, address, coordinates, client/projects, site hours, required skills and employee count, permanent assignments, visit requirements, contacts, access instructions, and work notes as applicable.
- **REL-001:** Client, Project, Location, Employee, Skill Requirement, Assignment, and Account Manager relationships must remain distinct and independently queryable.

## Scheduling

- **SCH-001:** Authorized planners must be able to plan multiple weeks or months using a monthly employee-by-day board with search and filters.
- **SCH-002:** Schedules must support permanent, temporary, one-time, recurring, full-day, timed, multi-day, on-call, client, project, and location assignments.
- **SCH-003:** Every schedule version or planning set must have a clear state: Draft, Proposed for review, or Published.
- **SCH-004:** Admin must be able to create/edit drafts and assignments only within scope and submit proposals for Super Admin review.
- **SCH-005:** Admin must not be able to publish a schedule or make the final schedule approval.
- **SCH-006:** Only Super Admin must be able to publish and modify published schedules.
- **SCH-007:** Employees must see their relevant Published schedule and must not see Draft or Proposed content.
- **SCH-008:** Publication must notify affected employees; a post-publication change must be audited and notify affected employees.
- **SCH-009:** The system must detect an employee assigned to overlapping locations/times and assignment during approved leave.
- **SCH-010:** The system must surface assignment outside normal working days, missing required skill, insufficient specialty coverage, overlapping recurrence, and out-of-scope Admin assignment as conflicts; final severity/override policy remains open where not confirmed.
- **SCH-011:** Confirmed conflict messages must identify the affected employee/requirement and period and provide enough context for an authorized manager to act.

## Leave and availability

- **LEV-001:** An Employee must be able to request annual leave for one or multiple dates with an optional note/reason and view Pending, Approved, or Rejected status.
- **LEV-002:** An Employee may cancel a Pending request only when the eventual cancellation rule permits.
- **LEV-003:** Leave submission must notify Super Admin.
- **LEV-004:** Only Super Admin must be able to view complete leave details as required and approve or reject leave with a response.
- **LEV-005:** Admin must not approve, reject, or recommend leave outcomes and must not see private reasons by default; Admin may see that an employee is unavailable.
- **LEV-006:** Before approval, the system must evaluate approved leave, assignments, required skills, minimum coverage, replacements, and affected clients/projects/locations.
- **LEV-007:** A decision must notify the requesting Employee and create an audit event.
- **LEV-008:** Leave balances, leave year, half-day handling, holidays, and weekends must not be calculated until rules are confirmed.

## Coverage and replacement

- **COV-001:** Authorized management must be able to define coverage requirements by skill, count, level/certification where confirmed, client/project/location, and date/time.
- **COV-002:** Coverage evaluation must use actual skills, availability, assignments, approved leave, and applicable requirements rather than fixed employee pairs or arrangement labels.
- **COV-003:** If overlapping leave would leave zero available employees for a required scarce skill, the system must display a clear coverage-conflict message with dates.
- **COV-004:** Only Super Admin may make the leave decision and use an authorized override with a recorded reason.
- **REP-001:** Replacement suggestions must consider matching skill, proficiency, certification, designation, availability, workload, assignments, location, working hours, restrictions, leave, and optional geography where data/rules exist.
- **REP-002:** Geographic distance may rank candidates but must not make the final decision.
- **REP-003:** Admin must be able to submit a scoped replacement request after reviewing candidates.
- **REP-004:** Only Super Admin must approve, change, or reject an Admin replacement request.
- **REP-005:** An approved replacement must update the applicable schedule state and notify affected users at the appropriate publication stage.

## Static planning map

- **MAP-001:** Super Admin and scoped Admin must have a management planning map; Employee must have no access.
- **MAP-002:** The map must use stored employee home location/area, stored client/project locations, Published schedule entries, and a selected date or period.
- **MAP-003:** The map must state: "Planning status for [selected date] - based on the published schedule, not live tracking," or equivalent explicit wording.
- **MAP-004:** The map must display selected period, active filters, marker legend, and last schedule publication time.
- **MAP-005:** The map may show planned connections, assignments, availability, leave, and coverage problems, but must not display or imply GPS, live position, route history, or movement surveillance.
- **MAP-006:** Admin map results must be filtered to assigned scope; Super Admin may view all authorized planning data.
- **MAP-007:** Provider, geocoding, address precision, distance method, route/travel time, and extra precise-address permission remain open.

## Notes and communication

- **NTE-001:** Super Admin may create employee-management notes about Admins or Employees; Admin may create them only about Employees within scope; Employee may not create them.
- **NTE-002:** The author must choose Private to author or Shared upward; the subject Employee must never see the note.
- **NTE-003:** Shared upward must mean the author and higher authorized roles only, subject to scope.
- **NTE-004:** Each employee-management note must record subject, author, author role at creation, visibility, created/updated time, history/audit reference, and archive/delete state.
- **NTE-005:** Every authenticated user must be able to read and add work-related project and client notes.
- **NTE-006:** Project/client notes must remain a simple shared model and record parent, author, timestamps, content, and edit/deletion history; edit rights are open.
- **COM-001:** Assignment/request discussions must be separate from general notes and visible only to requester and assigned employee(s).
- **COM-002:** A new private discussion message must notify the other participant(s).

## Notifications, screens, and reporting

- **NOT-001:** Version 1 must provide an in-application notification centre with read/unread, related record, timestamp, direct navigation, and optional archive state.
- **NOT-002:** Confirmed events must include certification/portfolio changes, leave submission/decision, replacement request/decision, schedule publication/change, and private discussion messages.
- **NOT-003:** External email, Microsoft, Google, mobile push, WhatsApp, and other channels must remain future decisions.
- **UI-001:** Management navigation must cover dashboard, employees/capabilities, clients, projects, locations, schedule, planning map, leave, coverage, replacements, notifications, reports/settings, and a clearly later Ticket System entry.
- **UI-002:** Employee navigation must remain focused on dashboard, schedule, leave, profile/capabilities, clients/projects, notifications, requests/assignments, and later tickets.
- **UI-003:** Dashboards must respect role, scope, publication state, and privacy rules in every card/count/list.

## Authentication and non-functional requirements

- **AUT-001:** Version 1 must use mock test accounts/personas without real passwords in documentation.
- **AUT-002:** Microsoft, Google, or company-email authentication must remain replaceable future options.
- **NFR-001:** The future application must be responsive and usable on desktop and mobile browsers.
- **NFR-002:** It must provide clear errors, search/filtering, accessible color usage, schedule consistency, concurrent-user safety, auditability, and maintainable modular design.
- **NFR-003:** It must protect leave reasons and home-location data using least-privilege access and auditable sensitive operations.
- **NFR-004:** Backup and recovery expectations must be defined before production operation.
- **NFR-005:** The architecture must support at least the current 15-20-person team with reasonable growth and allow provider replacement.

## Future Ticket System

- **TKT-001:** Ticket integration must occur only in Phase 12 after the workforce modules are stable.
- **TKT-002:** The existing Ticket System must not be cloned, modified, or used as the new system foundation during the documentation phase.
- **TKT-003:** A future ticket may link to Client, Project, Location, requester, assignee(s), required skills, due date, schedule assignment, work logs, and attachments.
- **TKT-004:** Ticket status, assignment status, schedule state, and work-log completion must remain distinct.
- **TKT-005:** Phase 12 must inspect reusable candidates and preserve the workforce system's roles, scopes, privacy, storage choices, and domain boundaries.

## Dependencies and acceptance focus

Roles/audit enable every later module. Employee capabilities precede client staffing and coverage. Clients/projects/locations precede schedule assignment. Published schedules precede the static map. Scheduling and leave precede robust coverage/replacement. Notification and communication events depend on stable source workflows. Ticket integration depends on all workforce phases.

Acceptance testing must include the seven operational scenarios in `WORKFLOWS.md`, negative permission tests, out-of-scope access tests, draft/publication visibility tests, privacy tests, audit/notification checks, and proof that no map path consumes live location data.
