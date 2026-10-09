# System Hierarchy and Relationships

## Module hierarchy

The product has a workforce core (employees, roles, designations, skills, certifications, portfolio, assignment arrangements), an operational structure (clients, projects, locations), a planning layer (assignments, schedules, leave, availability, coverage, replacements, map), and collaboration/governance services (notes, discussions, notifications, audit, reporting). Ticket functionality attaches only after these foundations are stable.

![System module hierarchy](../diagrams/01_system_module_hierarchy.png)

## Core entity relationships

### Client, project, location, and work

- A **Client** can have many Projects, Locations, contacts, service requirements, scheduled visits, assignments, coverage rules, and shared notes.
- A **Project** belongs to or relates to a Client, can span one or more Locations, and has dates, status, required skills, responsible Admin, employees, schedule entries, and shared notes.
- A **Location** may relate directly to a Client and to one or more Projects. It stores the physical planning point, working/access information, required skills, staffing needs, contacts, and work notes.
- An **Account Manager** coordinates a Client; the relationship does not imply fieldwork.
- A **Schedule Assignment** links an Employee to a date/time and one or more operational references: Client, Project, Location, request, and arrangement label as applicable.
- A **Skill Requirement** identifies qualifications independently from the job designation or Account Manager relationship.

![Client, project, location, employee relationships](../diagrams/03_client_project_location_employee_relationships.png)

### Employee capabilities

- An Employee has one system Role and one job Designation at a time as presently modeled; multiple designations are not confirmed.
- An Employee can have many Skills, with optional proficiency, experience, notes, coverage eligibility, and future verification.
- An Employee can have many Certifications and portfolio/CV/supporting items.
- A certification or portfolio submission is immediately saved, not held for approval; it creates a Super Admin notification and may later be marked reviewed or verified.
- An Employee may have an assigned Manager, team/department, normal work pattern, home address/area and coordinates, and default location.

### Schedule and availability

- A Schedule contains entries and has a state: Draft, Proposed for review, or Published.
- An Assignment may be full-day, timed, multi-day, recurring, permanent placement, temporary, one-time visit, on-call, client/project/location-linked, or otherwise confirmed.
- Employees see Published entries only. Admins read Draft, Proposed and Published plans within current scope; Super Admin alone creates/changes plans, prepares proposals/revisions and publishes. The confirmed 2026-10-09 amendment supersedes earlier Admin Draft editing.
- Availability is derived from working patterns, schedule entries, approved leave, and confirmed rules. An arrangement label is descriptive only.

![Schedule workflow](../diagrams/04_schedule_draft_review_publish_workflow.png)

The discovery diagram retains its historical baseline; current Super Admin-only writing and Admin read-only rules above supersede its earlier Admin planning arrows.

### Leave, coverage, and replacement

- A Leave Request belongs to an Employee and contains dates, optional reason, status, response, and audit information.
- Leave approval evaluates assignments, required skills, minimum coverage, replacement availability, locations/projects, and existing approved leave.
- A Coverage Rule can apply globally or to a client, project, location, skill, date/time, required count, skill level, or certification.
- Replacement matching reads capability, availability, workload, work hours, restrictions, leave, and optional geography. It produces candidates, not an automatic final choice.
- An Admin Replacement Request links the gap, candidates considered, requester, proposed replacement, Super Admin decision, schedule update, and notifications.

![Leave, coverage, and replacement workflow](../diagrams/05_leave_coverage_and_replacement_workflow.png)

### Notes and discussions

- An Employee-Management Note links subject employee, author, author role at creation, visibility, audit timestamps/history, and archived/deleted state. Visibility is private to author or shared upward.
- A shared Client, Project, or Location Note links its parent, author, timestamps, content, and preserved edit history. It is readable and creatable only by an authenticated user already authorized on the parent record: any authorized parent for Super Admin, and a parent inside their operational scope for Admin. Phase 10 added an additive `operational_note_revisions` table so every edit preserves the superseded content; nothing is hard-deleted.
- A replacement-request Discussion belongs to the request and includes only the requester and the currently named employee(s). Phase 10 supports no other discussion parent.

![Notes and communication visibility](../diagrams/06_notes_and_communication_visibility.png)

### Notifications and audit

Each Notification has a recipient, event, related record, timestamp, read/unread state, direct-navigation target, and optional archive state. Audit history records significant changes including publication, post-publication edits, leave decisions, replacements, note edits/deletion, role/scope changes, and overrides with reasons.

### Static planning map

The map combines stored employee home location/area, stored client/project location coordinates, the published schedule, a selected date/period, and scope-aware filters. It is a static planning visualization with a publication timestamp and explicit non-live status. No GPS feed or movement history exists.

![Static planning map data flow](../diagrams/08_static_planning_map_data_flow.png)

## Future Ticket System boundary

A future Ticket can relate to Client, Project, Location, requester, assignee(s), required skills, due date, schedule assignment, work logs, and attachments. Ticket status, assignment status, schedule state, and work-log completion remain distinct. Selected ticket capabilities may be migrated in Phase 12 only after the workforce domain and permissions are stable.

![Future Ticket System boundary](../diagrams/09_ticket_system_later_integration.png)

## Approved Company core — 2026-10-08

The later [9 October collaboration amendment](../phase-reports/SCOPEIS_COMPANY_TICKET_COLLABORATION_AMENDMENT_2026_10_09.md) names the hierarchy **Workspace → Dashboards → Tickets**, reusing the existing board entity with no migration. All active authenticated accounts use Published routing/create without enrollment and select multiple active company assignees or notified read-only included observers. Ticket-only creator/participant access is independent of workspace membership or Admin workforce scope; container supervision remains separately scoped. The earlier relationship description below remains the foundation. Amendment implementation/verification and bounded source/production delivery are complete; authenticated live role/private-file journeys remain unverified without ordinary credentials.

The product owner authorized the [Company core implementation](PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md). The future relationships above remain a broader roadmap, rather than effects applied by the core.

- A ticket Workspace is an independent container with optional existing Client/Project links. It has separately granted active members and Boards. Neither membership nor links grant new workforce roles or Employee management-record access.
- A Board belongs to one workspace and has Draft, Published or Archived state. Its publication is ticket-specific and never publishes a workforce schedule.
- A Ticket belongs to one board, retains its creator and optional current assignee/observer grants, and has its own status, priority, date, optional due date, content, version and archive history. Creator/assignee/observer are participation facts rather than system roles.
- Work Logs belong to a ticket and attribute an authenticated author, description, instant and optional minutes. They do not constitute attendance or schedule assignments.
- Private File metadata belongs to a ticket, retains uploader and archive provenance, and references private bytes behind the existing storage boundary. Returned DTOs contain no storage key or public URL.
- Successful changes create the existing audit and per-recipient notification records transactionally. Current role/scope, membership, board lifecycle and participation determine the facts returned to the reader.

The approved core is implemented and locally verified; see [the delivery report](../phase-reports/SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md). Ticket-to-request/assignment handoffs, direct Location relations and required-skill semantics are outside this first delivery.
