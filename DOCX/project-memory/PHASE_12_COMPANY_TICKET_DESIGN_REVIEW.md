# Phase 12 Company Ticket System — source assessment and design review

**7 October 2026, Asia/Dubai. Status: design proposal; application integration has not begun.**

**Supersession — 8 October 2026:** This document preserves the original design review and its unresolved questions as historical evidence. The product owner subsequently authorized the core Company ticket workflow and answered its permission and container-mapping questions. [The confirmed implementation decisions](PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md) now govern that slice. The approved core is implemented and locally verified ([delivery evidence](../phase-reports/SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md)); the original design-only restriction no longer applies to the approved core. Daily work lists, flowcharts and cost/PDF reporting remain outside this delivery. The full Phase 12 roadmap, including future workforce handoffs, remains `PARTIAL`.

## Confirmed direction

The product owner asked to review and extract the **Company** experience from [MulhamKassab/ticketSystem](https://github.com/MulhamKassab/ticketSystem), excluding the account-creation/onboarding process, and to see its proposed appearance before implementation. This authorizes source assessment, a visual concept and documentation. It does not approve a schema, migration, permission matrix, application implementation or deployment.

ScopeIs authentication, existing accounts, Super Admin/Admin/Employee roles, operational and TEAM scopes, private storage, audit and notifications remain authoritative. System roles remain independent of job titles, teams and ticket participation. The existing historical AGENTS phase number is superseded by the canonical journey-first roadmap: ticket integration is **Phase 12**.

## Source reviewed

Repository default branch `main` was read through the connected GitHub account. The immutable reviewed commit is [`8888b15a81d85f05c484dac9d17283c9530f61c4`](https://github.com/MulhamKassab/ticketSystem/tree/8888b15a81d85f05c484dac9d17283c9530f61c4). Its recursive tree was complete. No source-repository write or deployment occurred, and no business dataset or credentials were imported.

Primary references at that commit:

- [Company onboarding handoff](https://github.com/MulhamKassab/ticketSystem/blob/8888b15a81d85f05c484dac9d17283c9530f61c4/DOCX/documentation/technical/COMPANY_ONBOARDING_HANDOFF.md), including the current Company model and access boundaries.
- [Combined Company release preparation](https://github.com/MulhamKassab/ticketSystem/blob/8888b15a81d85f05c484dac9d17283c9530f61c4/DOCX/documentation/technical/COMPANY_COMBINED_RELEASE.md).
- [Company overview](https://github.com/MulhamKassab/ticketSystem/blob/8888b15a81d85f05c484dac9d17283c9530f61c4/components/companies/CompanyOverview.tsx) and `lib/companies/service.ts`.
- [Workspace dashboards](https://github.com/MulhamKassab/ticketSystem/blob/8888b15a81d85f05c484dac9d17283c9530f61c4/components/dashboards/WorkspaceDashboardsManager.tsx), `lib/dashboards/configuration.ts` and `lib/dashboards/policy.ts`.
- [Ticket workspace](https://github.com/MulhamKassab/ticketSystem/blob/8888b15a81d85f05c484dac9d17283c9530f61c4/components/dashboard/Dashboard.tsx), `KanbanBoard.tsx`, `TicketExpandedDetails.tsx` and `TicketParticipationPanel.tsx`.
- [Ticket schema](https://github.com/MulhamKassab/ticketSystem/blob/8888b15a81d85f05c484dac9d17283c9530f61c4/lib/tickets/schema.ts) and [ticket authorization evaluator](https://github.com/MulhamKassab/ticketSystem/blob/8888b15a81d85f05c484dac9d17283c9530f61c4/lib/tickets/authorization-policy.ts).
- Supporting implementations: `DailyWorkManager.tsx`, `FilesManager.tsx`, `FlowchartsList.tsx`, `AdminAnalytics.tsx`, `TrashManager.tsx` and `AppShell.tsx`.

Historical `PERSONAL_COMPANY_FOUNDATION.md` describes Company as a team-workspace context. The later onboarding handoff and current source add actual companies and company memberships. The earlier description must not be mistaken for the current source model. The repository's latest Company release documents describe preparation, with browser/manual visual QA deferred; source availability alone does not certify that exact revision as deployed or visually tested.

## Company capabilities extracted for review

These are **observed source capabilities and reuse candidates**, not an approved implementation list.

| Source capability | What the Company experience does | Proposed ScopeIs treatment |
| --- | --- | --- |
| Company overview | Lists accessible workspaces, ticket/dashboard totals and role-appropriate company actions | One Tickets entry in the existing ScopeIs shell; an Overview view alongside operational Tickets, as confirmed by the product owner |
| Workspaces | Company work containers with independently assigned membership | Ticket workspaces proposed; relationship to existing ScopeIs Teams is unresolved |
| Shared dashboards | Shared ticket collections with draft/published/archived definitions, configuration, duplication and personal presentation preferences | Call these **ticket boards** in the concept to avoid confusing them with ScopeIs Home or existing Projects; final terminology remains open |
| Dashboard configuration | Status, priority, ticket date range, participation and Scope Support marker filters; view, sorting and workload/status/priority/logged-effort widgets | Progressive filters and saved presentation candidates |
| Ticket views | Search/filter tickets; list/card presentations and Kanban movement/reordering | Simple List/Board switch in the Tickets section |
| Ticket lifecycle | `Planned`, `Open`, `In Progress`, `On Hold`, `Closed`; on-hold reason required | Preserve these as ticket-specific candidate states; never map them to timetable publication states |
| Priority | `Critical`, `High`, `Medium`, `Low` | Text labels and accessible status presentation |
| Ticket content | Subject, date, summary, planning, work completed, notes, groups and creator attribution | Ticket detail context with information disclosed by task |
| Scope Support marker | Boolean `pushedToScopeSupport`, displayed and filterable | Optional marker only; it does not establish an actual external synchronization feature |
| People and access | Explicit creator/assignee/observer participation, multi-person grants and revocation; observer is view-only | Existing ScopeIs people picker; exact participation and management authority require approval |
| Work logs | Attributed work description and timestamp, optional duration, optional budget/cost with currency, own/other-entry policy | Work log tab under the ticket; do not treat logged effort as attendance or scheduled work |
| Daily Work | Personal daily task list with ticket links and conversion paths | Reuse candidate inside Tickets; it must not replace or duplicate the authoritative monthly timetable |
| Attachments and Files | Private ticket attachments and a central authorized file index, previews, upload and removal | Ticket files through ScopeIs' private storage boundary; no public URLs |
| Flowcharts | Shared planning diagrams, ticket links, editing, duplication and scoped offline drafts | Dedicated ticket flowchart view; editor/offline scope requires a separate bounded decision |
| Analytics and PDF | Authorized distinct-ticket metrics, status/priority/effort views, overlapping person workload and filtered PDF reports | Ticket reports within existing reporting/navigation contracts, subject to approved export rights |
| Archive and Trash | Retained history and authorized recovery for tickets, files and flowcharts | One Archive entry with separate resource types; permanent purge is not implied |
| Notifications | Private, authorization-aware in-application events | Extend the existing ScopeIs notification centre; no duplicate inbox or external delivery service |

The preview demonstrates navigation and representative local interactions. File upload/storage, PDF output, a visual flowchart editor, drag-and-drop persistence and every lifecycle/configuration action remain **reuse candidates**, not completed integration features.

## Excluded from extraction

- Personal workspace/project flows, Personal collaboration and the Personal/Company context switch.
- Signup, email verification, password reset, onboarding activation, new-company creation and invitation acceptance/account creation.
- A second login/account directory or an imported Owner/Manager/global-admin system.
- Source deployment operators, database credentials, production backups, migrations or business data.
- Automatic schedule creation/publication, leave/coverage effects, external notifications or Scope Support synchronization.

Selecting an existing ScopeIs person for a ticket or for future workspace access is separate from registering or inviting a new account. The selection interface does not itself approve the grant policy.

## Visual proposal

The inline concept uses the actual local ScopeIs logo, blue `#163B99`, neutral surfaces, existing grouped navigation and the familiar header/persona presentation. It follows `UI_UX_FOUNDATION.md` rather than importing the Ticket System's distinct CashLedger-inspired visual shell.

The product owner subsequently confirmed: **“I want both to be present, filter between them.”** Both structures now coexist in a single Tickets module:

1. **Overview:** Company/workspace summaries and attention items, with drill-down into workspaces and boards.
2. **Tickets:** The operational ticket list or Kanban board, using the same selected board, search and status filters.

An **Overview / Tickets** switch replaces the comparison carousel. One filter row applies to both views; overview totals, workspace matching-ticket counts and attention items reflect the same matching tickets as the operational view. Switching retains board, search, status and the chosen List/Board layout. The preview starts with Overview when no compatible saved selection exists; that default remains a presentation choice, rather than a separately confirmed domain rule.

Daily work, Files, Flowcharts, Ticket reports and Archive remain available inside the same module. Opening a ticket provides Details, Work log, Files, Flowcharts and People & access. The mock renders an illustrative Super Admin context with twelve fictional tickets attributed to the existing example people. It is not a permission test or a projection of live data.

Prototype interactions are in-memory examples: search, board/status filters, List/Board switch, workspace/board navigation, ticket detail sections, creating a preview ticket, changing status with an on-hold reason, recording work and archive/restore. They neither call application APIs nor write business data. Controls for account onboarding and workspace-role changes are deliberately absent.

Responsive layouts retain readable text and controls, keyboard interaction, visible focus, labels, logical spacing, host light/dark appearance and reduced-motion behavior. The inline presentation is an illustrative review surface; physical-device and full accessibility certification belong to later approved implementation.

The [original review receipt](../phase-reports/evidence/ticket-company-design-2026-10-07/verification.json) records the initial design comparison and its bounded browser checks. The [combined-view revision receipt](../phase-reports/evidence/ticket-company-design-2026-10-07/combined-views-verification.json) records the subsequent shared-state design. In-app browser checks confirmed that board, search, status and List/Board selection survive Overview/Tickets switching, and that Overview reflects the same matching tickets. The 1024px light Overview and compact 320px/390px views were inspected; compact layouts had no horizontal overflow and the primary switch retained 44px control height. Dark appearance, complete accessibility certification and the original unexecuted create/archive/restore checks remain outside this bounded revision verification. No application code, database or production data changed.

## Published design test page

On 2026-10-07 the product owner requested: **“Alright, push so I can test please.”** The reviewed interactive design is exported as `public/previews/company-tickets.html` and delivered through the existing repository/site at `https://scopeis-team-management-system.vercel.app/previews/company-tickets.html`. This public page contains only the fictional examples already reviewed. The existing application account, database and authorization services are not connected to it; the illustrative Raafat persona is sample presentation, not a signed-in identity. Ticket changes reset on refresh, while view/filter preferences use local browser storage.

The maintained application's Ticket navigation remains at its existing delivery boundary. The direct preview URL allows testing the chosen design without turning open ticket policies into application behavior. Publication verification is recorded separately from the original inline receipts.

## Proposed ScopeIs connections

Ticket → optional Client / Project / Location → explicit assignment request → separately approved timetable assignment is the candidate journey described by the canonical Phase 12 roadmap. A ticket date is not automatically a due date. A ticket assignee is not automatically a scheduled employee. A ticket board is not automatically an existing ScopeIs Project or Team.

Only Super Admin may publish schedules and decide leave/replacement outcomes under existing contracts. Completing a ticket cannot complete or publish a timetable assignment. Any Employee ticket view must avoid management-only client/project/location records, notes, unpublished plans and other people's private data. Final ticket projections and assignment handoffs are unresolved.

## Decisions required before application implementation

| Decision | Candidate direction | Why it remains open |
| --- | --- | --- |
| Containers and naming | Independent ticket workspaces and boards, with optional existing client/project links | Do not equate workspace with Team or board with Project without confirmation |
| Role and scope policy | Super Admin global; Admin bounded by existing current scope; Employee limited to explicit allowed ticket work | Source's single Owner, company membership and broader manager rights cannot be mechanically imported into two Super Admins and workforce scopes |
| Ticket creation/assignment/closure | Explicit policy matrix for every role and participant type | ScopeIs has not approved these ticket-specific authorities |
| Board lifecycle | Keep separate from schedule Draft/Proposed/Published | Source managers may publish ticket dashboards, which says nothing about schedule publication rights |
| Daily Work | Personal task list or omit in the first integration | Prevent duplicate time/effort counting and timetable confusion |
| Cost fields and exports | Keep, hide or defer cost/budget and PDF export by role | Existing reporting/export rights cannot be expanded silently |
| Required skills, due dates and requests | Bounded extensions over source ticket fields | Source schema does not supply all Phase 12 workforce relationships |
| Source reuse and data migration | Select module code and mappings after scope approval | No whole-app merge, source SQL replay or production-data import is authorized |

Approving a visual direction alone does not approve the remaining domain decisions. Record subsequent confirmed choices here and in the applicable canonical requirements before implementing them. Phase 12 remains `NEXT` for application delivery; this review does not mark any journey or sub-phase completed.
