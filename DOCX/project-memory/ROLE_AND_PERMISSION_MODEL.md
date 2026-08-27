# Role and Permission Model

## Governing rules

`Super Admin > Admin > Employee` is the system-access hierarchy. A system role is not a job designation, skill, department, employment type, or assignment arrangement. Authorization combines role, Admin scope where applicable, record participation, publication state, and data sensitivity.

## Role summaries

### Super Admin

Has global management authority: employee accounts and roles, designations, skills, clients, projects, locations, arrangement labels, schedules, publication, leave decisions, coverage rules, replacements, warnings and overrides, management map, authorized management notes, notifications, audit, reports, exports, mock accounts, and later integrated tickets.

### Admin

May be an account manager, team senior, coordinator, or other trusted employee. Can view necessary employee capabilities and availability; manage assigned clients/projects/locations; create schedule drafts and assignments within scope; propose schedules; review conflicts; find candidates; submit replacement requests; use the scoped planning map; create shared project/client notes; create permitted employee-management notes about Employees below their role; and participate in private requester-assignee discussions.

Admin cannot publish schedules, make final schedule approvals, approve or reject leave, recommend leave decisions, access private leave reasons by default, manage global permissions, change global coverage policies without permission, assign replacements without required Super Admin approval, or access data outside scope.

### Employee

Can use a mock account; view their own published daily/weekly/monthly schedule; view relevant client/project/location/time/instructions; submit and track annual leave; cancel a pending request when allowed; maintain permitted profile, skills evidence, certifications, portfolio, CV, and project experience; receive notifications; read and add shared project/client notes; and participate in private discussions when requester or assignee.

Employee cannot publish or finalize schedules, approve leave, manage roles, access the management planning map, view others' private leave details, view employee-management notes, or view discussions in which they are not a participant.

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
| See private-to-author management note | Author only | Author only | No |
| See shared-upward management note | Authorized higher role and author | If author or authorized higher role | No |
| Read/add client and project notes | Yes | Yes | Yes |
| Read assignment/request discussion | If participant | If participant | If participant |
| Notifications | Yes | Yes | Yes |
| Audit history, reports, exports | Yes | Scoped/later-defined | No unless later confirmed |
| Integrated tickets | Later, global | Later, scoped | Later, assigned/owned |

## Explicit safeguards

- Admin cannot publish schedules.
- Admin cannot approve or reject leave.
- Admin does not recommend leave decisions.
- Employee cannot access the management planning map.
- Only requester and assigned employee(s) can see an assignment/request discussion.
- Project and client notes are not private notes; every authenticated user can read and add them.
- The subject of an employee-management note cannot see it.
- Assignment labels never grant permissions or determine availability.

