# Phase 4 Scheduling Domain Decisions

## Status

These decisions record the implemented V1 boundary for `SCOPEIS_PHASE_4_SCHEDULING_DRAFT_PROPOSED_PUBLISHED_JOURNEY_R1`. They supplement, and do not replace, the Phase 3 operational-domain decisions.

## Schedule container

- A schedule period is one active Client, one calendar month, one revision lineage, and one stored lifecycle state: `DRAFT`, `PROPOSED`, or `PUBLISHED`.
- The database prevents more than one active Draft/Proposed period for a Client-month and prevents more than one current Published version for that Client-month.
- Published historical versions remain immutable. A later change is a copied Draft revision linked to its Published predecessor.

## Assignment V1

- An assignment is a distinct work-planning record. It is not a Client relationship, Project relationship, Location relationship, operational employee association, staffing requirement, designation, manager hierarchy, team membership, or arrangement label.
- V1 permits only an active Employee, active same-Client Project, active same-Client Location linked to that Project, a date within the planning month, and required local start/end times on the same day.
- End time is strictly after start time. All-day, multi-day, recurring, permanent, temporary, on-call, timesheet, attendance, payroll, travel, and route behavior are outside this phase.
- An optional short shared instruction is curated assignment text. It is not a copy of stored Location access instructions or other sensitive operational text.

## Authorization and privacy

- Scheduling reuses the Phase 3 operational-scope semantics: Client scope inherits downward; Project/Location scope remains narrow; relationship fields do not grant authority.
- A Client-level Admin may create/manage Draft work and propose it. A Project/Location Admin may edit only assignments inside an existing authorized Client Draft and cannot create the Client-month container or propose the whole Client schedule.
- Employee selection and Employee self-service use the existing explicit TEAM-based employee-visibility gate. Operational scope does not silently grant employee browsing.
- Only Super Admin can return Proposed work to Draft, publish, or create a Published revision.
- Employee self-service returns only the current Published assignments belonging to the current Employee, projecting date/time, identity fields, timezone, and permitted shared instruction. Draft, Proposed, superseded, other-employee, address, coordinate, contact, access-instruction, scope, staffing, private-note, and audit data are excluded.

## Time and integrity

- The planning timezone is `Asia/Dubai`. Dates and local wall-clock times are persisted as a calendar date and `time(0)` fields; employee and manager UI labels the timezone explicitly.
- Same-Employee, same-date overlaps are blocked across active Draft, Proposed, and Published periods. PostgreSQL transaction advisory locks serialize overlap validation for each Employee/date key.
- Revision copies exempt only their unchanged copied predecessor during overlap validation; other Client-month work remains conflict-visible.
- Period and assignment mutations use optimistic versions. Lifecycle publication, current-version replacement, notifications, and audit writes are transactional.
- The 2026-10-06 conflict-integrity refinement makes ordinary assignment edits and coverage effects acquire employee/date overlap locks before leave locks, matching proposal/publication. Coverage reuses an unchanged existing Draft revision; conflicting or obsolete requests are refused. See [the coverage integrity decisions](PHASE_7_COVERAGE_REPLACEMENT_DECISIONS.md).

## Explicit non-goals

No leave conflict checks, working-pattern enforcement, staffing fulfilment, skills/certification checks, replacement suggestions, severity/override workflow, map behavior, Ticket System integration, production authentication, production migration, deployment, notification-centre UI, external notification delivery, or Phase 5+ work is included.

## Confirmed monthly timetable and people catalogues — 2026-10-06

The user requested a monthly timetable showing who is where and what they are doing. Month is the default view, with People (person by day) and Agenda alternatives. Day details include employee, times, client, project, location and shared work instruction. Published work and unpublished planning have separate views; historical Published revisions are excluded from the current timetable. Employees receive only their own current Published assignments. Admin timetable reads require both current TEAM membership scope and a matching Client, Project or Location scope; Super Admin is global. No new recurrence, shift, attendance or automatic publication rules are introduced.

Teams are managed records with stable `team:` references and editable display names. The additive `0014_team_catalogue` migration backfills existing profile and scope references without moving people or changing grants. Super Admin can create and rename teams and add, move or remove members. Each profile retains its existing single team and single designation. Dedicated Designations management reuses the existing job catalogue and permits the same membership operations. Roles, job designations, membership and explicit Admin access grants remain separate. Removing membership clears only the selected assignment field and preserves the person and their history.

Employee assignments use Team and Designation dropdowns linked to their management pages. Coverage starts with visible monthly assignments, explains staffing versus qualification gaps, and separates replacing a person from adding someone alongside them. Super Admin requests say “Choose during review” and link to their own decision surface; approval still prepares a Draft and never publishes automatically. Development phase labels are removed from product copy. Native dialogs, touch targets, internal calendar/table scrolling, RTL, both themes and reduced motion remain required.
