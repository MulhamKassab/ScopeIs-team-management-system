# Implementation Roadmap

The phases below are ordered dependencies. Completion of this documentation foundation does not authorize implementation.

## Phase 1 - Foundation and mock accounts

**Objective:** Establish application structure, identity simulation, access boundaries, navigation, and audit foundation.

**Entry:** Documentation approved; unresolved architectural choices needed for Phase 1 resolved.  
**Deliverables:** Project structure, mock accounts/personas, three roles, permission scopes, navigation, audit foundation.  
**Dependencies:** Canonical role and permission model.  
**Exit:** Test personas can access only authorized empty-shell modules; audit foundation records selected actions.  
**Excluded:** Real identity provider, employee feature depth, tickets.

## Phase 2 - Employees and capabilities

**Objective:** Represent the internal workforce and its skills/evidence.

**Entry:** Phase 1 access enforcement works.  
**Deliverables:** Profiles, designations, skills/proficiency, certifications, portfolio/CV/uploads, manager notifications, arrangement labels, employee-management notes.  
**Dependencies:** Roles, audit, notification foundation.  
**Exit:** Authorized profile/capability management and hierarchical note visibility pass tests.  
**Excluded:** Clients/projects, scheduling, mandatory certification approval unless confirmed.

## Phase 3 - Clients, projects, and locations

**Objective:** Build the operational work hierarchy.

**Entry:** Employees/capabilities stable; Admin scope decision sufficient for enforcement.  
**Deliverables:** Client accounts, Account Managers, projects, locations, skills/staffing requirements, shared notes, employee relationships.  
**Dependencies:** Phase 2 employee/skill records.  
**Exit:** Relationships remain distinct and scope/shared-note rules are verified.  
**Excluded:** Calendar planning, live maps, tickets.

## Phase 4 - Scheduling

**Objective:** Plan and publish workforce assignments across months.

**Entry:** Employee, client, project, location, skill, and scope records usable.  
**Deliverables:** Monthly board; permanent, temporary, recurring, one-time, timed, multi-day and on-call assignments; Draft/Proposed/Published states; conflict checks; employee published view.  
**Dependencies:** Phases 1-3.  
**Exit:** Admin proposals cannot publish; Super Admin publication and employee visibility/notifications are verified.  
**Excluded:** Leave-balance calculation, planning map, automatic staffing.

## Phase 5 - Static planning map

**Objective:** Visualize stored locations and published planned assignments for selected dates.

**Entry:** Published schedule and coordinates available; privacy and minimum map decisions resolved.  
**Deliverables:** Stored home-area/location data, site pins, assignment connections, filters, scoped Admin access, non-live label, selected date and publication timestamp.  
**Dependencies:** Phase 4 published schedules.  
**Exit:** No Employee access or live-location implication; scope and privacy tests pass.  
**Excluded:** GPS, route history, automatic routing.

## Phase 6 - Leave and availability

**Objective:** Manage requests and availability with Super Admin decision authority.

**Entry:** Schedule conflicts available; minimum leave/calendar policy decisions resolved.  
**Deliverables:** Requests, optional reason, statuses, Super Admin approval/rejection, availability, overlapping checks, privacy, schedule conflicts; balances only if rules confirmed.  
**Dependencies:** Scheduling and employee records.  
**Exit:** Admin cannot decide or see reasons by default; employee and coverage effects are correct.  
**Excluded:** Payroll, full HR, unconfirmed balance/half-day rules.

## Phase 7 - Coverage and replacement

**Objective:** Detect capability gaps and support manager-controlled substitution.

**Entry:** Skills, certification policy, schedule, leave, and coverage-rule definitions sufficient.  
**Deliverables:** Minimum coverage, candidate matching, optional geographic ranking, Admin requests, Super Admin decisions, warnings, reasoned overrides.  
**Dependencies:** Phases 2, 4, 5 where used, and 6.  
**Exit:** Candidate suggestions are explainable; no automatic final choice; schedule/notification effects tested.  
**Excluded:** AI final decisions and route optimization.

## Phase 8 - Notifications, communication, dashboards, and reporting

**Objective:** Complete operational awareness, communication, and governance views.

**Entry:** Source events and access rules from prior modules stable.  
**Deliverables:** Notification centre, private requester-assignee discussions, shared project/client notes, dashboards, reports, exports, audit views.  
**Dependencies:** All workforce modules.  
**Exit:** Visibility and event matrix pass end-to-end tests; reports respect scope/privacy.  
**Excluded:** External messaging channels unless later approved.

## Phase 9 - Ticket System integration

**Objective:** Add selected ticket capabilities without changing workforce-domain authority.

**Entry:** Main workforce features stable; existing repository inspected; migration/repository strategy approved.  
**Deliverables:** Reuse assessment, selected ticket migration, ticket-domain connections, preserved workforce roles/scopes, combined-system validation.  
**Dependencies:** Phases 1-8 complete.  
**Exit:** Ticket, assignment, schedule, work log, project, and client remain distinct; permission and migration tests pass.  
**Excluded:** Using ticket architecture as the product foundation or importing unreviewed restrictions wholesale.

