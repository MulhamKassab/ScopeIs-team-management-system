# Clear user journeys — 2026-10-06

## Confirmed Cover and access amendment — 2026-10-15

The owner authorized the [consolidated Cover workspace and access amendment](COVER_WORKSPACE_AND_ACCESS_AMENDMENT_2026_10_15.md). It supersedes older statements permitting Admin unpublished timetable/team-leave/report reads or project creation. Super Admin alone holds those capabilities; Employee own vacation self-service remains. Cover unifies timetable selection, creation, versioned editing/cancellation and direct decisions, with separate publication. The main timetable exposes assignment creation and the map gains place labels and selected-work controls. Existing scope, privacy, conflict, accessibility and RTL rules remain.

## Connected controls — authorized 2026-10-14

Super Admin has a new Assignment labels tab: New label → set descriptive name/colour/order → Edit, Archive or Reactivate. This catalogue stays separate from scheduling and access. Job titles now include Archive/Reactivate and retain existing members; unrelated employee edits preserve their archived title. In People → person → Super Admin controls, Default work location edits the management text reference and Employee planning coordinate separately saves/corrects/clears protected manual coordinates. Admin and Employee do not receive these controls.

In Skills, Super Admin selects a person and uses Archived skills → Restore to recover the original record; an archived catalogue entry must first be reactivated. Informational details → Edit details changes the existing optional descriptions and notes without qualification effects. The notification bell shows the person's own unread count. My profile states the applicable file limit and lets retained larger files download through authorized chunks. Removing Draft work preserves history and changes Employee timetables only after separate revision publication. [The implementation report](../phase-reports/SCOPEIS_FRONTEND_BACKEND_GAP_FIXES_2026_10_14.md) records verification. Historical journey counts below are preserved.

The user confirmed that every tab should be simpler and clearer. These presentation requirements extend UI_UX_FOUNDATION.md and preserve the existing domain decisions. The application remains at https://scopeis-team-management-system.vercel.app/.

Each page has one purpose, an identifiable next action, and a compact, optional “How to use” disclosure with two or three steps. Related tools come only from server-authorized navigation. Everyday labels are UI aliases; routes, module keys, job-designation records, system roles, permission grants and stored report/export contracts remain independent.

| Step | Tab | Audience | User goal | Path and result |
| --- | --- | --- | --- | --- |
| 1 | Home | All roles | Know what to do next | Employee opens Tickets first, then their Schedule or Vacations; managers check waiting decisions or open Schedule. Additional figures are under More team insights. |
| 2 | Schedule | All roles, with separate Super Admin editing tools | See who is where, when and doing what | Choose month and view → open a day. Super Admin prepares Draft work, reviews and publishes; Admin reads scoped plans and may use the separate cover-request workflow; Employee sees own Published work. |
| 3 | Find cover | Managers | Find the work that needs support | Search work or choose a person → open a day → Check cover → replace someone or add extra support → follow Cover requests. |
| 4 | Cover requests | Managers | Know what a request changes and what happens next | Super Admin reviews the decision queue; Admin follows their own requests. Approval prepares a Draft; publication remains a separate Schedule action. |
| 5 | My requests | Named participants with module access | Identify a request and discuss its next step | Read request type, date and status → expand conversation → exchange messages. Managers see work context only after current-role and scope checks. |
| 6 | Vacations | All roles, with separate self-service/read/review tools | Request time off, read approved team leave or review a waiting decision | Employee opens My vacations, checks own balance and previews working days/projected balance → Apply for vacation → follow status. Super Admin reviews dates, balance and work conflicts and decides. Admin reads Approved unavailable dates for TEAM-visible Employees only, with no own-request or balance controls. |
| 7 | Work map | Managers | Understand the selected day’s published work | Choose date → search a person or choose a pin/site → read time and place → check cover or open Schedule. |
| 8 | People | Managers | Find the right person and understand their record | Search/filter → open person → review work details, recorded skills and permitted documents. Team/job title and system role/access stay separate. |
| 9 | Teams | Super Admin | Keep team membership current | New team → Add member → Rename or Remove membership. Each person has one team; access grants remain separately managed. |
| 10 | Job titles | Super Admin | Maintain the company’s job titles | New job title → Add member → manage membership. Designation is the same underlying catalogue; a job title never grants system permissions. |
| 11 | Skills | All roles, with separate editing rights | See who has a recorded skill without choosing twice | Super Admin chooses one person → View skills → Record skill for that person. Manage skill list is a secondary disclosure. Admin searches skill holders; Employee reads own skills. |
| 12 | My profile | All roles | Keep work details and documents current | Review recorded skills → Edit profile or Add document or experience → choose type → save → Attach file where eligible. Compact category counts expose saved records, review states and retained history without expanding every empty category. |
| 13 | Clients | Managers in their access | Keep customer work and contacts together | Search/create client → add projects and same-client sites → Super Admin plans people in Schedule; Admin reviews authorized work. |
| 14 | Projects | Managers in their access | Describe what the team will do | Choose client → prepare project, dates, sites and requirements → Super Admin assigns people in Schedule; Admin reviews authorized work. |
| 15 | Locations | Managers in their access | Prepare the worksites used by assignments | Choose client/site → record address and visit instructions → link a same-client project → Super Admin uses the site in Schedule; Admin reviews authorized work. |
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
- Settings remains honestly marked as unfinished. The approved Company ticket core is delivered separately below; broader Phase 12 work remains outside it. No recurrence, live tracking, attendance, ranking or automatic publication is added by these clarity requirements.

Fresh walkthrough screenshots and bounded validation are in [the user-journey review](../phase-reports/SCOPEIS_CLEAR_USER_JOURNEYS_2026_10_06.html).

The confirmed [coverage conflict-integrity rules](PHASE_7_COVERAGE_REPLACEMENT_DECISIONS.md) apply to Find cover, Cover requests and Timetable: duplicate requests are refused; approval rechecks the effective Draft and candidate availability; compatible changes share one revision; stale work cannot overwrite another decision. Outdated requests can be declined and reconsidered against the current plan.

## Company ticket journey — confirmed 2026-10-08

[The Company core decisions](PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md) extend the original 20-page review. Its earlier unfinished-ticket statement is historical; the approved core is implemented and locally verified ([delivery evidence](../phase-reports/SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md)).

Employees land on Tickets, find their own/assigned/observed work, open a ticket and act according to their current creator/assignee/observer permission. Creators and assignees can update/close tickets, log their own work and attach private files; observers read only. Under the 9 October amendment, every active authenticated company user may create on a Published dashboard without membership and choose multiple assignees/mentions from active company people. Their primary tabs are Tickets, Schedule, Vacations and My profile, with their own recorded skills in My profile. Home and permitted notifications/request conversations remain secondary destinations.

Managers retain the original management journeys and gain Tickets. They move between Tickets and secondary Overview with shared filters, create eligible workspaces/dashboards, manage membership and participants, and review ticket work and retained history. Super Admin is global; Admin container supervision uses current TEAM scope, linked Client/Project grants and active membership, while independent ticket participation remains ticket-only. Ticket publication, work logs and archive never change schedule, leave or replacement rules.

Daily work lists, flowcharts, cost/PDF reporting and future workforce handoffs are outside the first delivery. The integrated route is `/tickets`; the earlier `/previews/company-tickets.html` remains a historical fictional-data concept.

## Consolidated tickets and approved clarity pass — 2026-10-12

The product owner approved implementation of the [9 October UI clarity review](../phase-reports/SCOPEIS_UI_CLARITY_REVIEW_2026_10_09.md), then push to `main` and deployment. Requirements are current; [implementation and verification](../phase-reports/SCOPEIS_UI_CLARITY_IMPLEMENTATION_2026_10_12.md) remain tracked separately.

| Journey | Audience | Path and result |
| --- | --- | --- |
| Find my accessible tickets | Every active company role | Open Tickets → see All accessible across destinations → optionally choose Workspace, Dashboard, Assigned to me, Created by me or Mentioned in → open related work. Cards explain the actor's current relationship, and server authorization defines the entire set. |
| Narrow or recover the list | Every role | Search or choose destination → expand optional status/priority filters → read active filters → Clear filters if nothing matches. Overview, List/Kanban and workspace views retain the authorized context. |
| Create and find the result | Every active company role | New ticket → choose Published dashboard, describe work and choose assignees/mentions → optionally More options → Create ticket → Ticket created / Open ticket. Create another is secondary; failures retain entered data. |
| Start, hold or finish work | Creator, assignee or independently authorized manager | Read subject/status/instructions first → Change status → give a reason for On hold → receive actual server success or a stale-version response. Edit details, People and supporting metadata remain available separately. |
| Return to the same work | Anyone with current ticket access | Follow Workspace → Dashboard → Ticket breadcrumbs or Back to tickets → recover the validated local filter/layout context. Direct links use a safe Tickets fallback. |
| Manage workspace access | Authorized manager | Open Workspace access → choose only server-derived eligible people → save with fresh scope/version checks. This picker never restricts company-wide ticket assignee/mention choices or grants unrelated workforce rights. |

The supporting profile and vacation requirements in rows 12 and 6 preserve their original domain policies. The [UI foundation](UI_UX_FOUNDATION.md) preserves phone/desktop access, native focus, themes, RTL and reduced motion. The earlier role-specific ticket defaults and review-only boundary are superseded; unrelated unfinished/deferred features are not added.

The approved changes are implemented and bounded local/source/production delivery is complete: 469 unique unit/component/integration, desktop/phone and focused Chrome cases, static gates and the isolated production build pass. Tested application `6e33c6b3ea461c15a53a8af01506d71d4e4ac4f0` is pushed to `origin/main` and Ready/canonical verified, with 11/11 anonymous live checks. [The report](../phase-reports/SCOPEIS_UI_CLARITY_IMPLEMENTATION_2026_10_12.md) and [receipt](../phase-reports/evidence/ui-clarity-2026-10-12/production-release.json) distinguish the ticket-case retry and bounded visual/live evidence from the uncertified broad responsive/full-system and authenticated-production journeys. Broader Phase 12/13 status is unchanged.

## Complete responsive and ordinary live role verification — 2026-10-12

The owner subsequently requested the full responsive gate, deployed journeys for all three roles and repair/retest before push/deployment. [The final repaired report](../phase-reports/SCOPEIS_FULL_RESPONSIVE_ROLE_VERIFICATION_2026_10_12.md) records 24/24 in 11.8 minutes with all prior assertions plus populated Tickets, 54/54 supplementary RTL/dark/enlarged-text observations, 4/4 controlled cancellation and owned cleanup. Bounded normal deployed journeys all pass: Super Admin global work/controls; Admin related/mentioned versus unrelated work, read-only planning and vacation privacy; Employee creator/assignee/read-only mention, revocation, own work history/private bytes, Published Schedule, recorded skills/evidence chooser and cross-year/weekend vacation previews without submission. Production role refusals and ordinary saved sign-in pass. No app source changes were required from baseline `90cd5286c52ced0695d8672d9b134a9af44bd14e`; final types/whole ESLint/manifest/whitespace and seven harness hashes pass.

Four normal collaboration QA tickets are real production facts, created/changed then archived 4/4 through authorized UI workflows; synthetic file/log history is retained. There was no reset/seed, credential/account/provider/environment change or schedule fixture mutation. The current user journeys and role boundaries remain unchanged; earlier evidence is preserved. [Verification](../phase-reports/evidence/responsive-role-verification-2026-10-12/verification.json) and [release receipts](../phase-reports/evidence/responsive-role-verification-2026-10-12/production-release.json) record `PRODUCTION_RELEASED`: tested harness/docs `da6a5a36457932b9ae833d0bf6acb510f23196df` pushed and Ready/canonical verified, anonymous 11/11 and read-only post-release smoke for all three roles. Detailed pre-release mutations were not newly repeated post-release. Cancellation uses synthetic registered SIGINT-handler dispatch through `process.emit`, not observed OS delivery. Live forged/stale API tests, unobserved revoked-file HTTP denial and general full-system/Phase 13 certification are not inferred; a future docs-only deployment needs separate source proof.
