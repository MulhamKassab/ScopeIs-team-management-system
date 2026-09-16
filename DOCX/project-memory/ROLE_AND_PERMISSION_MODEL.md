# Role and Permission Model

## Governing rules

`Super Admin > Admin > Employee` is the system-access hierarchy. A system role is not a job designation, skill, department, employment type, or assignment arrangement. Authorization combines role, Admin scope where applicable, record participation, publication state, and data sensitivity.

## Role summaries

### Super Admin

Has global management authority: employee accounts and roles, designations, skills, clients, projects, locations, arrangement labels, schedules, publication, leave decisions, coverage rules, replacements, warnings and overrides, management map, authorized management notes, notifications, audit, reports, exports, mock accounts, and later integrated tickets.

### Admin

May be an account manager, team senior, coordinator, or other trusted employee. Can view necessary employee capabilities and availability; manage assigned clients/projects/locations; create schedule drafts and assignments within scope; propose schedules; review conflicts; find candidates; submit replacement requests; use the scoped planning map; create and edit their own shared Client, Project, and Location notes where their scope authorizes the parent; create permitted employee-management notes about Employees below their role; and participate in private requester-assignee discussions.

Admin cannot publish schedules, make final schedule approvals, approve or reject leave, recommend leave decisions, access private leave reasons by default, manage global permissions, change global coverage policies without permission, assign replacements without required Super Admin approval, or access data outside scope.

### Employee

Can use a mock account; view their own published daily/weekly/monthly schedule; view relevant client/project/location/time/instructions; submit and track annual leave; cancel a pending request when allowed; maintain permitted profile, skills evidence, certifications, portfolio, CV, and project experience; use the notification centre for their own notifications; and participate in private replacement-request discussions when they are the requester or a named employee on that request.

Employee cannot publish or finalize schedules, approve leave, manage roles, access the management planning map, view others' private leave details, view employee-management notes, read or add shared Client/Project/Location notes, or view discussions in which they are not a participant.

## Admin scope

An Admin's effective access is the intersection of role permission and assigned scope. Scope may later be modeled by clients, projects, locations, teams, or a combination; the exact model remains open. Scope must be enforced server-side and applied to list, search, map, schedule, note, replacement, and report access.

## Complete permission matrix

| Capability | Super Admin | Admin | Employee |
|---|---:|---:|---:|
| View own profile and published schedule | Yes | Yes | Yes |
| View workforce information | All authorized data | Within scope | Only generally shared/permitted data |
| Manage employee accounts and system roles | Yes | No (employee creation is open) | No |
| Manage skills/designations/arrangement labels globally | Yes | No | No |
| Maintain own certifications/portfolio | Yes | Yes | Yes |
| Review/verify submitted certifications | Yes | No | No |
| Manage clients/projects/locations | Yes | Within scope | No; may view shared work information |
| Create schedule draft | Yes | Within scope | No |
| Submit schedule proposal | Yes | Within scope | No |
| View unfinished drafts | All | Own/scoped | No |
| Publish or modify published schedule | Yes | No | No |
| View published schedule | All | Relevant scope | Own assignments |
| Submit own leave request | Yes | Yes | Yes |
| View another employee's leave reason | Yes when required | No by default | No |
| Approve/reject leave | Yes | No | No |
| Recommend leave outcome | Not a separate workflow | No | No |
| Define global coverage rules | Yes | No unless later delegated | No |
| View coverage conflicts | All | Within scope | No |
| Find replacement candidates | Yes | Within scope | No |
| Submit replacement request | Yes | Yes, within scope | No |
| Approve/change/reject replacement | Yes | No | No |
| Override significant warning with reason | Yes when authorized | No | No |
| Access static planning map | Global | Within scope | No |
| Create employee-management note | About Admin/Employee | About scoped Employee | No |
| See private-to-author management note | Author only, while that Super Admin still has current access | Author only, while that Admin still has current access | No |
| See shared-upward management note | Authorized higher role and author | Author, or an authorized Super Admin, only while current access remains | No |
| Keep reading a management note after demotion, deactivation, or scope loss | No | No | No |
| Read/add shared Client, Project, and Location notes | Yes | Only for a parent their scope authorizes | No |
| Read and post replacement-request discussion | Only if a named participant | Only if a named participant | Only if a named participant |
| Manage own notifications (read, unread, archive, restore) | Yes | Yes | Yes |
| Audit history | Yes | No — non-enumerating refusal | No — non-enumerating refusal |
| Open authorized reports | Yes, all registered reports | Yes: Published allocation, unallocated employees, scheduled hours, `PLANNING (unpublished)`, approved leave, replacement status, recorded skills, required-versus-recorded gaps, certification summary, schedule lifecycle — scoped | No |
| Open Super-Admin-only reports | Yes: leave balance, evidence review queue, audit history | No — non-enumerating refusal | No |
| Export CSV | Yes, every exportable report including `PLANNING (unpublished)`; never audit history | Yes, Published allocation and the certification-summary projection only | No |
| Integrated tickets | Later, global | Later, scoped | Later, assigned/owned |

## Explicit safeguards

- Admin cannot publish schedules.
- Admin cannot approve or reject leave.
- Admin does not recommend leave decisions.
- Employee cannot access the management planning map.
- Only requester and assigned employee(s) can see an assignment/request discussion.
- Shared Client, Project, and Location notes are not private notes, but "shared" means shared with everyone already authorized on the parent record, not with every authenticated user. Super Admin holds global access; Admin access follows their Client, Project, or Location scope; Employees hold no Client, Project, Location, or shared-note access in Phase 10. This interpretation was confirmed by the product owner during Phase 10 and replaces the earlier ambiguous "every authenticated user" reading.
- The subject of an employee-management note cannot see it.
- Only the author of an employee-management note and, for a shared-upward note, an authorized Super Admin may read it. Peer Admins and an out-of-scope Admin receive the same non-enumerating refusal as a nonexistent note.
- Management-note access requires **both** note-level visibility permission **and** current authorization to manage/read the subject. Authorship never overrides current role, active status, or scope: a demoted author who is now an Employee, a deactivated or removed user, and an author whose subject scope was revoked all lose access, including through a direct note id. The stored author role at creation is historical information only. Archived rows are not a route back to access, and note content never appears in audit metadata, notifications, logs, or error messages.
- A notification belongs to exactly one recipient. Only that recipient may read, mark, archive, or restore it, and a cross-recipient notification id is non-enumerating.
- The audit-history interface is Super Admin only, read-only, and never renders raw metadata; Admin and Employee receive a non-enumerating refusal.
- Reporting reads the reader's current role, active status and scope grants on every request, so a demotion, a deactivation or a revoked grant changes what a report returns on the very next request without a re-login.
- Reporting never classifies a person as generally available. The only permitted derived fact is the conflict fact, whose values are `No known schedule or approved-leave conflict`, `Approved leave on the selected date`, `Published assignment overlaps the selected time window`, and `Approved leave and published assignment overlap`.
- `PLANNING (unpublished)` is Draft and Proposed scheduling. It is a separate report rather than a filter on Published reporting, is view-only for a scoped Admin, is never visible to an Employee, and is never blended into a Published metric.
- Assignment labels never grant permissions or determine availability.
