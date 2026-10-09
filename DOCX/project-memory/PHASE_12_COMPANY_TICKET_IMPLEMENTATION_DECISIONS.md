# Company ticket workflow — confirmed implementation decisions

## Current amendment — confirmed 9 October 2026

The product owner subsequently required that **all active authenticated company users can create tickets, mention/include any active company person and assign multiple people**. Ticket creators may manage their ticket's assignee/included-person choices; assignees can update/work, and included/mentioned observers are read-only and receive an in-app notification. This supersedes the original manager-only grants and Employee creation without participants in the delivery contract below. Workforce Admin scope and unrelated workforce tools remain unchanged. Ticket contents remain private to authorized participants/management.

The confirmed hierarchy is **Workspace → Dashboards → Tickets**, with many dashboards per workspace and many tickets per dashboard. Dashboard is the user-facing name for the existing ticket-board container; no migration, database rename or new management Home route is implied. All active authenticated company users see Published dashboard routing metadata and a minimal company people picker, and can create without workspace enrollment. Own/assigned/mentioned participation grants ticket-only access independently of workspace membership or Admin workforce scope; unrelated tickets remain hidden. Workspace/dashboard supervision retains current manager TEAM, Client/Project and membership checks. No automatic workspace grant is created, and current activity/session/participation/lifecycle checks remain binding.

Local implementation/verification is `COMPLETED` under [the amendment report](../phase-reports/SCOPEIS_COMPANY_TICKET_COLLABORATION_AMENDMENT_2026_10_09.md): 106 affected automated cases, guarded builds/types, full ESLint, manual Employee review and scenario registration pass. Source and production delivery remain `IN_PROGRESS` under the existing session authorization; no amendment push/Ready/canonical outcome is claimed yet. Earlier local/production reports retain their historical source and scope.

## Original core delivery — 8–9 October 2026

**Authorized 8 October 2026; core implemented and locally verified 9 October 2026, Asia/Dubai.**

[The delivery report](../phase-reports/SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md) records scoped verification, preservation and remaining roadmap boundaries.

**Production migration/deployment delivered 9 October 2026:** Following local delivery, the product owner explicitly requested “deploy please.” [The production report](../phase-reports/SCOPEIS_COMPANY_TICKETS_PRODUCTION_2026_10_09.md) verifies fresh backup/independent restore and the additive Company migration with prior schema/facts/history preserved, plus Ready application `4307413`, canonical assignment and final anonymous smoke 10/10. The initial 8/10 no-sniff finding and repair remain recorded. Ordinary sign-in was visually checked; authenticated live Employee/manager/private-byte certification remains pending without ordinary credentials. The later request supersedes the original local-only delivery restriction without approving deferred features or completing Phase 12/13.

The product owner authorized Company ticket-system integration into ScopeIs. Subsequent answers confirmed that Employees may create tickets and update or close tickets they created or are assigned to; observers are read-only. Ticket workspaces and boards are independent containers with optional links to existing Clients and Projects. The requested first delivery is the complete core workflow: workspaces, boards, tickets, people access, work logs, private files, notifications, and retained archive/restore. Daily work lists, flowchart editing, cost/PDF reporting, external synchronization and automatic reminders are outside this delivery.

The source reviewed for this implementation is `MulhamKassab/ticketSystem` main at `10e028538f600b8ebf289b5d1d2026d0b4399e4a`, with the earlier reviewed `8888b15a81d85f05c484dac9d17283c9530f61c4` as its ancestor. ScopeIs owns authentication, roles, scopes, storage, audit and notifications. Source onboarding, Company Owner/global-admin roles, Personal workspaces, credentials, deployment configuration and business datasets are not imported.

## Original access contract

| Actor | Company ticket access |
| --- | --- |
| Super Admin | Global workspace/board administration, ticket management and participant grants. Existing workforce tools remain available. |
| Admin | Current active workspace membership and current Client/Project scope are required for linked workspace administration. Employee choices and work remain bounded by current TEAM scope. Unlinked company workspaces remain Super Admin-managed. |
| Employee creator | Active workspace membership and a Published board are required. Creates tickets, reads/edits their own tickets, changes status, records work, attaches private files, and archives/restores their created tickets. |
| Employee assignee | Active membership, a Published board and current explicit participation permit read, content/status edits, work logging and attachment upload. Assignment does not grant participant administration or ticket archive authority. |
| Employee observer | Active membership, a Published board and current explicit participation permit read only. |
| Non-participant | No Employee discovery, detail, file or notification-link access to the ticket. |

Managers alone grant or revoke assignee/observer access using authorized existing people. Employee creation establishes creator participation atomically and cannot assign or observe other users. Current user activity, sessions, workspace membership, board lifecycle, participant grants and Admin scopes are rechecked on reads and writes; a historical grant cannot preserve access after revocation. Unknown or inaccessible ticket/file identities receive the same neutral refusal.

## Workflow and persistence

Ticket states are Planned, Open, In progress, On hold and Closed. On hold requires a reason. Priorities are Critical, High, Medium and Low. Subject, ticket date, optional due date, summary, planning, work completed and notes stay ticket-specific. Work logs attribute the authenticated author and may include minutes; they do not constitute attendance or timetable assignments.

Boards have their own Draft, Published and Archived lifecycle. Publishing a ticket board does not publish a timetable. Core mutations use optimistic versions and transactions for content, participation, audit and notifications. Archive retains history; it does not permanently purge data. Private attachment metadata remains in PostgreSQL and bytes pass through the existing private-storage boundary with fresh ticket authorization on every download.

Authorized workspace managers can correct a workspace name and description with its current version. This operation does not change the workspace's Client/Project links or access facts. Board names and lifecycle remain independently editable. An Admin membership or assignment grant must be reachable under that Admin's current TEAM and Client/Project authority; Super Admin cannot assign inaccessible work through an unlinked container.

Work-log edits remain author-only while the author retains ticket work permission. Attachments use the host's existing PDF/JPEG/PNG/DOCX allowlist, with validated bytes and bounded multipart input. Local uploads retain the established 5 MiB limit. The authorized Vercel production release caps ticket uploads at 4 MiB to accommodate the hosted function's payload limit; both the server and ticket-detail UI use this environment-specific limit. An uploader may archive/restore their own attachment while retaining write access; authorized ticket managers may manage attachments. Ticket content, participation, logs and file changes share the ticket version, so a concurrent stale action receives an explicit conflict instead of overwriting newer work. Attachment archive preserves both metadata and bytes; there is no permanent-purge interface.

Development may use an explicit absolute `EVIDENCE_LOCAL_DIRECTORY` with the local storage adapter to retain private bytes across restarts. Production still refuses local storage and requires a configured private provider; disposable tests ignore persistent development storage and use owned temporary resources. Provider selection and production retention/recovery remain separate rollout decisions.

Client/Project links establish management scope and context, not new Employee access to management records, contacts or operational notes. Tickets do not create assignments, publish schedules, decide leave, or apply coverage effects. Optional future workforce handoffs, required-skill semantics and migration of source business data remain separate decisions.

## Employee workspace

Employees land on Tickets after sign-in and root visits. Their primary destinations are Tickets, Schedule, Vacations and My profile. My profile contains their recorded skills. The existing published-only personal schedule, vacation request/balance/history, own profile, Notifications and participant-only My requests retain their authorization boundaries. Home remains a secondary personal summary. Super Admin and Admin keep their existing navigation and gain Tickets.

Overview and Tickets share the same workspace/board, search, status and priority filters. List and Board presentations use the same authorized ticket set. The Employee default presents operational Tickets; management can use the Company overview. Ticket details expose only the actions the server permits.

## Delivery boundary

The 8 October implementation request and its completed local report originally excluded push, production migration and deployment. The product owner's explicit 9 October deployment request supersedes that delivery restriction for the approved core. The release targets the existing Vercel project and Company database, requires current target verification and backup/restore proof before additive migration, and requires live verification after deployment. Release outcomes belong in the separate production report; earlier local evidence remains unchanged.

No source business-data import, external message, broader role grant or deferred source capability is authorized by this release. The prior design preview remains historical material; the integrated route uses persisted data and authenticated identity. The complete canonical Phase 12 roadmap also includes future workforce handoffs, so core delivery or deployment must not be presented as completion of every Phase 12 sub-phase or blanket Phase 13 certification.
