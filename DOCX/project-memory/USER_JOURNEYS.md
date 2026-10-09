# Clear user journeys — 2026-10-06

The user confirmed that every tab should be simpler and clearer. These presentation requirements extend UI_UX_FOUNDATION.md and preserve the existing domain decisions. The application remains at https://scopeis-team-management-system.vercel.app/.

Each page has one purpose, an identifiable next action, and a compact, optional “How to use” disclosure with two or three steps. Related tools come only from server-authorized navigation. Everyday labels are UI aliases; routes, module keys, job-designation records, system roles, permission grants and stored report/export contracts remain independent.

| Step | Tab | Audience | User goal | Path and result |
| --- | --- | --- | --- | --- |
| 1 | Home | All roles | Know what to do next | Check waiting decisions or your next work → open Timetable. Additional figures are under More team insights. |
| 2 | Timetable | All roles, with separate Super Admin editing tools | See who is where, when and doing what | Choose month and view → open a day. Super Admin prepares Draft work, reviews and publishes; Admin reads scoped plans and may use the separate cover-request workflow; Employee sees own Published work. |
| 3 | Find cover | Managers | Find the work that needs support | Search work or choose a person → open a day → Check cover → replace someone or add extra support → follow Cover requests. |
| 4 | Cover requests | Managers | Know what a request changes and what happens next | Super Admin reviews the decision queue; Admin follows their own requests. Approval prepares a Draft; publication remains a separate Timetable action. |
| 5 | My requests | Named participants with module access | Identify a request and discuss its next step | Read request type, date and status → expand conversation → exchange messages. Managers see work context only after current-role and scope checks. |
| 6 | Leave | All roles, with separate self-service/read/review tools | Request time off, read approved team leave or review a waiting decision | Employee checks own balance, chooses dates and follows status. Super Admin reviews dates, balance and work conflicts and decides. Admin reads Approved unavailable dates for TEAM-visible Employees only, with no own-request or balance controls. |
| 7 | Work map | Managers | Understand the selected day’s published work | Choose date → search a person or choose a pin/site → read time and place → check cover or open Timetable. |
| 8 | People | Managers | Find the right person and understand their record | Search/filter → open person → review work details, recorded skills and permitted documents. Team/job title and system role/access stay separate. |
| 9 | Teams | Super Admin | Keep team membership current | New team → Add member → Rename or Remove membership. Each person has one team; access grants remain separately managed. |
| 10 | Job titles | Super Admin | Maintain the company’s job titles | New job title → Add member → manage membership. Designation is the same underlying catalogue; a job title never grants system permissions. |
| 11 | Skills | All roles, with separate editing rights | See who has a recorded skill without choosing twice | Super Admin chooses one person → View skills → Record skill for that person. Manage skill list is a secondary disclosure. Admin searches skill holders; Employee reads own skills. |
| 12 | My profile | All roles | Keep work details and documents current | Edit profile → add documents/experience → follow review states. The managed team name is displayed; Add button text is readable. |
| 13 | Clients | Managers in their access | Keep customer work and contacts together | Search/create client → add projects and same-client sites → plan people in Timetable. |
| 14 | Projects | Managers in their access | Describe what the team will do | Choose client → prepare project, dates, sites and requirements → assign people in Timetable. |
| 15 | Locations | Managers in their access | Prepare the worksites used by assignments | Choose client/site → record address and visit instructions → link a same-client project → use the site in Timetable. |
| 16 | Reports | Managers in their access | Find an answer to a team question | Search by topic → open familiar report title → filter dates and scope → read/download where permitted. Unpublished plans remain explicitly separate. |
| 17 | Notifications | All roles | Turn an update into a clear action | Inbox/Unread → open the authorized request, conversation, document or timetable → mark read or archive independently. |
| 18 | Accounts | Super Admin | Help the right person sign in | Search person → check Sign-in setup and readable system role → create/enable sign-in or reset password through existing controls. |
| 19 | Activity log | Super Admin | See who changed what and when | Filter action, record type, person/date → read event → expand Record details only when references or safe metadata are needed. |
| 20 | Settings | Super Admin, unfinished | Know which tools are available | Clearly marked Coming soon. Guidance points to the working Profile, Accounts and people tools; no unconfirmed settings are implemented. |

## Acceptance boundaries

- Super Admin alone drafts, changes, proposes, revises and publishes schedules and decides leave/cover. Admin reads scoped Draft, Proposed and Published plans and follows separate scoped cover requests; Employee sees only own current Published work. The confirmed 2026-10-09 amendment supersedes earlier Admin drafting/proposals.
- Request participation does not grant planning access. Work context is omitted for Employees, inactive actors, and managers outside current scope; caller-supplied/stale roles cannot grant it.
- Private files, certification summaries, management notes, conversations, notifications and unknown audit metadata retain their existing privacy projections.
- Search filters only the authorized DTO already on the page. Empty results offer a clear recovery action.
- Disclosures are native keyboard controls. Layout uses logical properties, 44px targets and 16px mobile inputs; existing reduced-motion, RTL and theme behavior stays in place.
- Settings and Ticket integration remain honestly marked as unfinished. No schema, recurrence, live tracking, attendance, ranking or automatic publication is added.

Fresh walkthrough screenshots and bounded validation are in [the user-journey review](../phase-reports/SCOPEIS_CLEAR_USER_JOURNEYS_2026_10_06.html).

The confirmed [coverage conflict-integrity rules](PHASE_7_COVERAGE_REPLACEMENT_DECISIONS.md) apply to Find cover, Cover requests and Timetable: duplicate requests are refused; approval rechecks the effective Draft and candidate availability; compatible changes share one revision; stale work cannot overwrite another decision. Outdated requests can be declined and reconsidered against the current plan.

## Company ticket journey — confirmed 2026-10-08

[The Company core decisions](PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md) extend the original 20-page review. Its earlier unfinished-ticket statement is historical; the approved core is implemented and locally verified ([delivery evidence](../phase-reports/SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md)).

Employees land on Tickets, find their own/assigned/observed work, open a ticket and act according to their current creator/assignee/observer permission. Creators and assignees can update/close tickets, log their own work and attach private files; observers read only. An active member may create a ticket on a Published board. Their primary tabs are Tickets, Schedule, Vacations and My profile, with their own recorded skills in My profile. Home and permitted notifications/request conversations remain secondary destinations.

Managers retain the original management journeys and gain Tickets. They move between Company Overview and Tickets with shared filters, create eligible workspaces/boards, manage membership and participants, and review ticket work and retained history. Super Admin is global; Admin uses current TEAM scope, linked Client/Project grants and active membership. Ticket publication, work logs and archive never change timetable, leave or replacement rules.

Daily work lists, flowcharts, cost/PDF reporting and future workforce handoffs are outside the first delivery. The integrated route is `/tickets`; the earlier `/previews/company-tickets.html` remains a historical fictional-data concept.
