# ScopeIs frontend and backend feature audit

14 October 2026 · Source reviewed at `80080426669b757ec0b13d9e47c9c9ffd64a7120`

The maintained application has a substantial working backend, and most visible workflows have matching server handlers. The main gaps are missing management controls, incomplete recovery paths, and one file limit mismatch. Global Settings is a labelled placeholder. The separate Company ticket design preview uses fictional browser data and does not represent the implemented `/tickets` module.

This is an audit of the current repository. Findings below distinguish existing server capabilities without a user interface, features that have storage or reads but no complete write workflow, and deliberately deferred functionality. No application behavior or product requirements were changed.

## Review scope and evidence

The inventory covers 222 TypeScript/TSX files under `src`, 31 page files, 12 API route files, 66 exported Server Actions, 41 Drizzle table declarations, all 21 navigation modules, the 13 ticket commands, and the 13 report contracts. Page reads, forms, action adapters, services, repositories, schema, permissions, and relevant tests were traced across the feature areas below. Counts describe source inventory, not a claim that every possible user journey was exercised.

The architecture is a Next.js modular monolith. A screen can have a real backend without making a visible REST request: Server Components load services directly and most workforce changes use authenticated Server Actions. The absence of an `/api` endpoint is therefore not itself a gap.

The governing references are [Project context](../../PROJECT_CONTEXT.md), [documentation index](../INDEX.md), [architecture decisions](../project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md), [current tracker](../project-memory/IMPLEMENTATION_STATUS_TRACKER.md), and the current employee, skills, map, scheduling, and ticket decisions. The preserved root prototype is reference material and was not treated as maintained application source.

### Fresh checks

| Check | Result |
| --- | --- |
| Unit tests | 31 files and 239 tests passed |
| Component tests | 27 files and 174 tests passed |
| TypeScript | Passed with no emit and incremental output disabled |
| Exported Server Action references | All 66 have references in other maintained source files; their UI adapters were inspected by module |
| Ticket commands | All 13 have matching UI command construction and server handling |
| PostgreSQL integration tests | Could not start: the loopback test server at `127.0.0.1:5432` refused the connection |

Unit and component tests were run directly with `node ./node_modules/vitest/vitest.mjs run test/unit` and `node ./node_modules/vitest/vitest.mjs run test/component`. The equivalent npm entry points initially failed because the Windows command shim mishandled the ampersand in the repository path. TypeScript ran through `node ./node_modules/typescript/bin/tsc --noEmit --incremental false`. The guarded `npm run test:phase2-core` stopped before its integration cases and reported disposable-database cleanup.

The 413 passing tests establish the tested unit/component behavior; they do not establish that every backend capability has a UI. No fresh browser, production, or database integration certification is claimed. Production data, credentials, configuration, migrations, and deployments were not changed.

## Existing backend capabilities without complete frontend controls

### G01 Archived employee skills cannot be restored through the app

**Priority: high. Category: missing UI recovery path.**

Super Admin can record and archive a person's skill on `/skills`. The backend also supports reading archived associations and restoring an association with `employeeSkillService.setArchived(..., false)`. The page only requests active associations, and the action adapter always passes `true` for archival. There is no archived-record picker or restore action.

The user-facing failure is concrete: record a skill, archive it, then try to record the same skill for the same person again. `add` checks for the employee/skill pair without excluding archived rows and refuses it as `INVALID_SKILL_ASSOCIATION`. The unique database constraint also preserves that pair. An archived skill can therefore disappear from the UI while preventing the apparent recovery action.

Evidence: [skill forms](../../src/modules/capabilities/forms.tsx), lines 21–28; [skill actions](../../src/modules/capabilities/actions.ts), lines 17–18; [employee skill service](../../src/modules/employees/employee-services.ts), lines 390–433; [repository lookup](../../src/modules/employees/employee-repositories.ts), lines 197–203. The existing Phase 2 integration case covers archive persistence and duplicate refusal, but does not exercise this complete UI recovery sequence.

Recommended repair: provide a versioned Super Admin restore operation and an archived-association view, or make the record-skill flow explicitly recover an archived association. Preserve the existing record and its history; do not remove the uniqueness constraint or grant Employee skill editing.

### G02 Job title archive and reactivation exist only in the service

**Priority: medium. Category: backend capability without a UI adapter.**

`employeeCatalogueService.setDesignationActive` supports archival and reactivation, with version checks and audit persistence. The `/designations` UI supports creating and renaming job titles and adding/removing members. Its server action accepts only `save` and `member`. There is no lifecycle operation.

The page can display an already archived job title, but cannot produce that state or reactivate it through normal application controls. Removing all members does not retire the job title from future choices.

Evidence: [catalogue service](../../src/modules/employees/employee-services.ts), line 123; [organisation action](../../src/modules/employees/organisation-actions.ts), lines 12–15; [organisation page](../../src/modules/employees/organisation-page.tsx); [organisation forms](../../src/modules/employees/organisation-forms.tsx).

Recommended repair: expose the existing Super Admin lifecycle service with the current version and retain historic memberships. Team retirement is a separate feature: the current Team model does not offer an equivalent archive operation.

### G03 Assignment arrangement label management has no application screen

**Priority: medium. Category: confirmed backend feature without a frontend.**

The database and employee catalogue service support listing, creating, renaming, colouring, ordering, archiving, and reactivating descriptive arrangement labels. No navigation entry, form, Server Action, or API handler exposes those operations in the maintained app. The global Settings placeholder does not implement them either.

This is more than unused sample code: [ARR-001](../project-memory/PRODUCT_REQUIREMENTS.md) requires Super Admin label management, and the [employee decisions](../project-memory/PHASE_2_EMPLOYEE_DOMAIN_DECISIONS.md) preserve the service boundary. The certified schema deliberately has no employee-label association. Exposing the catalogue must not invent one or derive scheduling, coverage, employment type, or permissions from a label.

Evidence: [catalogue methods](../../src/modules/employees/employee-services.ts), lines 120 and 127–129; [label validation](../../src/modules/employees/employee-validation.ts); [arrangement label table](../../src/db/schema/index.ts), line 89; [navigation](../../src/modules/navigation/navigation.ts).

Recommended repair: add a Super Admin catalogue surface backed by the existing service. Label assignment semantics remain outside this repair.

### G04 Default work location is displayed but cannot be edited

**Priority: medium. Category: backend field and mutation without a UI adapter.**

The employee profile stores `defaultWorkLocation`. Super Admin's employee detail displays it, and the older versioned `updateManagementProfile` service accepts it. The current basic-information and assignment forms do not include it. Their action allowlists exclude it, so adding an input alone would not complete the workflow.

Evidence: [employee detail](../../src/modules/employees/employee-detail.tsx), line 12; [management profile service](../../src/modules/employees/employee-services.ts), line 262; [profile validation](../../src/modules/employees/employee-validation.ts), lines 54–72; [management forms](../../src/modules/employees/employee-management-panel.tsx), lines 19–20; [management actions](../../src/modules/employees/employee-management-actions.ts), lines 30–48.

Recommended repair: expose an explicitly validated Super Admin field through an appropriate existing management action. This text field is distinct from employee map coordinates and does not create a schedule assignment. Keep it withheld from scoped Admin projections and Employee self-editing.

### G05 Legacy skill metadata has no editing or detail UI

**Priority: optional product refinement. Category: preserved backend capability with deliberately limited current UX.**

The employee-skill service can save and update proficiency description, experience description, notes, verification, and coverage-eligibility metadata. The current skill form submits only person and skill IDs; recorded skills are displayed as names. No UI adapter calls `employeeSkillService.update`.

This should not be treated as permission to activate new qualification rules. The [Phase 6 decisions](../project-memory/PHASE_6_SKILLS_CAPABILITIES_DECISIONS.md) explicitly preserve these legacy fields while excluding them from filtering, warnings, qualification, and scheduling effects. Free-text proficiency/experience could be exposed as informational content if the desired product scope is confirmed. A proficiency scale or staffing effect is a separate decision.

Evidence: [skill input contract](../../src/modules/employees/contracts.ts), lines 51–61; [validation](../../src/modules/employees/employee-validation.ts), lines 88–94; [skill update service](../../src/modules/employees/employee-services.ts), line 414; [skill action](../../src/modules/capabilities/actions.ts), line 17; [recorded skill UI](../../src/modules/capabilities/forms.tsx).

### G06 Unread counts are available but absent from the global notification bell

**Priority: low. Category: discovery improvement.**

The backend calculates unread notification counts. The inbox shows its count, and the Employee Home summary also shows one. The global header bell is a navigation link with no count or unread indicator. Users who start in Tickets have to open Notifications to discover an update.

Evidence: [unread service](../../src/modules/notifications/service.ts), line 137; [notification centre](../../src/modules/notifications/forms.tsx), line 45; [header bell](../../src/shared/components/shell.tsx), line 93; [personal dashboard](../../src/modules/reporting/service.ts).

An authorized count in the shell would improve discovery. The current bell does navigate to a real notification centre; it is not a dead button. Automatic delivery, email, push, and live polling are separate capabilities.

## Partial workflows and frontend actions with practical limits

### P01 Employee map coordinates have storage and reads but no maintained write workflow

**Priority: medium. Category: incomplete data maintenance in both layers.**

The map joins `employee_planning_locations` and renders exact Super Admin markers or coarse scoped Admin markers. There is no maintained service mutation, authenticated action/API, or form for creating, correcting, or clearing a person's planning coordinate. Coordinates are supplied by explicit demo/test initialization; demo-roster scripts also manage related rows as operator work.

A new person can receive a real Published assignment but have no employee map marker. The assignment stays in the list and worksite coordinates remain independent. The map's omitted-marker count is honest, but normal users cannot fill the missing source data through the app. A new account/profile does not initialize a planning-coordinate row.

Evidence: [coordinate schema](../../src/db/schema/index.ts), lines 104–111; [map repository](../../src/modules/maps/repositories.ts), lines 8–11; [projection](../../src/modules/maps/service.ts), lines 23–24; [demo insertion](../../scripts/seed-company-demo.mjs), line 56; [account creation](../../src/modules/account-administration/service.ts); [map decisions](../project-memory/PHASE_8_STATIC_PLANNING_MAP_DECISIONS.md).

This needs a complete governed input workflow, not just another map control. The approved precision and role rules must apply, with validation, audit, and stale-write handling. GPS tracking and geocoding are not implied.

### P02 Removing an assignment with retained history remains unsupported

**Priority: high. Category: known domain limitation with a real handler.**

The Remove assignment form is wired to a server action and a transactional service. That service still physically deletes the Draft assignment. Foreign keys protect retained assignment-skill requirements, replacement history, and copied-assignment provenance. When such references exist, removal is refused rather than destroying history. The UI warns about retained skill/replacement history, but it still offers the action.

For example, a Draft revision copies assignment-specific skills from a Published plan. Removing the copied assignment can then fail even after its active requirement is archived, because archival retains the referencing row. This limits cancellation and omission of work during revision, including the workflow that resolves Published schedule conflicts before leave approval.

Evidence: [remove service](../../src/modules/scheduling/service.ts), lines 167–172; [remove UI](../../src/modules/scheduling/forms.tsx), line 47; [revision copying](../../src/modules/scheduling/service.ts), line 181; [current scheduling status](../project-memory/IMPLEMENTATION_STATUS_TRACKER.md), sub-phases 4.6, 4.10, and 4.12. This is an existing open finding, not a newly claimed regression.

Recommended repair: settle and implement the documented history-preserving omission design across scheduling, coverage, reports, map projections, and publication. Hiding the button or cascading deletes would not complete that workflow.

### P03 Profile evidence file limits do not match the hosted function path

**Priority: high for hosted file workflows. Category: application and hosting mismatch.**

Profile evidence validation permits files up to 5 MiB. The frontend uploader checks only that a file is nonempty and posts its bytes as multipart data through `/api/evidence/[evidenceId]/files`. It does not receive or enforce an environment-specific maximum. The private download route also returns the full file through a function response.

The ticket module already handles this concern: hosted production uploads use a 4 MiB limit, and the detail UI receives that limit. Evidence has no corresponding hosted adjustment. [Vercel's current function limits](https://vercel.com/docs/functions/limitations#request-body-size) set the request and response payload maximum at 4.5 MB. A valid evidence file near 5 MiB can therefore satisfy the application's validator while exceeding the hosting boundary, on upload or byte delivery. This conclusion comes from the current code path and provider limit; no production upload/download near the boundary was attempted.

Evidence: [evidence maximum](../../src/modules/evidence/file-validation.ts), line 4; [evidence uploader](../../src/modules/evidence/forms.tsx), lines 74–102; [upload route](../../src/app/api/evidence/[evidenceId]/files/route.ts); [download route](../../src/app/api/evidence/files/[fileId]/route.ts); [ticket hosted limit](../../src/modules/tickets/files.ts), lines 17–27.

Recommended repair: align the evidence UI, route, validation, and delivery limits with the deployed path. Account for existing larger retained files before reducing a limit. Supporting larger private files would require an explicitly authorized delivery design, not merely a frontend size change.

## Display only and planned surfaces

### S01 Global Settings is a labelled placeholder

`/settings` resolves through the generic module page and renders `EmptyModule`. It contains a Coming soon message and return navigation. There is no settings form, persistence model, or mutation handler behind it. Only Super Admin has the module capability.

Evidence: [Settings definition](../../src/modules/navigation/navigation.ts), line 26; [generic module page](../../src/app/(protected)/[module]/page.tsx); [placeholder component](../../src/shared/components/states.tsx), line 4.

This is a real frontend-only placeholder, clearly labelled. Ticket workspace/dashboard Settings and annual leave allowance settings are separate, implemented controls; they should not be confused with this page.

### S02 The published ticket design preview uses fictional browser state

`/previews/company-tickets.html` is the historical 7 October design preview. It includes hardcoded tickets and local widget state, plus preview views for daily work, flowcharts, insights, and other source-product ideas. It labels itself Design preview with fictional tickets. It does not send the user's edits through the maintained ticket API or persist them as Company ticket records.

Evidence: [preview source](../../public/previews/company-tickets.html), lines 1561, 1569, 1725, 1748, and 1764; [ticket delivery boundary](../project-memory/PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md).

The integrated `/tickets` route uses authenticated identity, PostgreSQL, transactional services, and private storage. The preview should remain clearly distinguishable from that product. Its existence does not mean the live ticket workflow is simulated.

## Feature coverage across the maintained application

Connected means the current advertised workflow has a matching server implementation. It does not imply the entire original roadmap, production readiness, or every lifecycle edge is complete.

| Area and route | Frontend and backend connection | Gaps or deliberate limits |
| --- | --- | --- |
| Home `/dashboard` | Role-specific summaries from reporting services and repositories | Real metrics; management Home primarily summarizes workforce planning rather than ticket work |
| Tickets `/tickets` and detail | Workspace/dashboard management, creation, details, status, participants, logs, private files, archive/restore | Core connected; broader workforce handoffs and advanced source-product tools deferred |
| People `/employees` and detail | Search/filter, create, basic edits, team/title/manager, role, lifecycle, TEAM scope, evidence and notes | G04 default work location; account-only people have a separate profile-completion action |
| Teams `/teams` | Create, rename, add/move/remove members through organisation actions | One team per profile; team membership does not grant Admin scope |
| Job titles `/designations` | Create, rename, add/move/remove members | G02 lifecycle missing |
| Accounts `/accounts` | Create accounts, enable existing credentials, reset passwords, complete workforce profiles | Super Admin only; credentials cannot be viewed; enterprise identity is separate |
| Skills `/skills` | Catalogue create/rename/archive/reactivate; person-skill record/archive; scoped search; own reads | G01 restore missing; G05 informational metadata absent; Employee skills also appear in My profile |
| Clients `/clients` and detail | Global creation; authorized detail editing, lifecycle, contacts, requirements, associations, notes, scope | Contacts and requirements offer add/archive, not in-place editing |
| Projects `/projects` and detail | Creation within Client authority, editing/lifecycle, explicit Location linking/unlinking, supporting details | Links and employee associations do not create scheduled work or grants |
| Locations `/locations` and detail | Creation/editing/lifecycle, manual coordinate pairs, site/access detail, supporting records | Manual worksite coordinates are implemented; they are distinct from P01 employee coordinates |
| Timetable `/schedule` | Month/People/Agenda views, Draft assignments, propose/return/publish, revision, skill warnings | Super Admin writes; Admin reads scoped planning; Employee reads own current Published work; P02 removal limit |
| Work map `/map` | Published selected-date projection, filters, markers/layers, pan/zoom, fallback, schedule/coverage links | P01 coordinate maintenance missing; static planning, no live tracking |
| Leave `/leave` | Employee submit/cancel/history/balances; Super Admin decisions/allowance; Admin Approved team-leave reads | Published overlap blocks approval; resolving some conflicts is affected by P02 |
| Find cover `/coverage` | Current assignment context, staffing/qualification gaps, candidate search, create requests | Candidates are unranked and advisory; no automatic publication |
| Cover requests `/replacements` | Request history, Super Admin decisions, Draft effects, participant discussion | Decision prepares/updates a Draft, which still needs publication |
| My requests `/requests` | Participant-derived threads and messages | Admin discussions are exposed through Cover requests; no general chat or ticket-comment system |
| Notifications `/notifications` | Recipient inbox, filters, paging, read/unread, mark-all-read, archive/restore, authorized destinations | G06 header count absent; in-app notifications, no external delivery |
| Reports `/reports` and detail | All 13 registered report contracts, supported filters, paging, authorized CSV | Audit report never exports; ticket analytics/cost/PDF reports are outside the current registry |
| Activity log `/audit` | Super Admin safe event projection, filters, paging | Read-only, no export; no raw audit payload display |
| My profile `/profile` | Own permitted contact/summary changes, recorded skills, evidence creation/editing/archive/review state and private files | P03 file limit mismatch; skill metadata limits as G05 |
| Global Settings `/settings` | Placeholder message and navigation only | S01 |

### Ticket command coverage

Every current command has a matching UI entry point: `createWorkspace`, `updateWorkspace`, `setWorkspaceMember`, `createBoard`, `updateBoard`, `createTicket`, `updateTicket`, `changeTicketStatus`, `setParticipants`, `addWorkLog`, `editWorkLog`, `archiveTicket`, and `restoreTicket`. Attachment upload, download, archive, and restore use the separate private-file routes.

Evidence: [command validation](../../src/modules/tickets/validation.ts), [command service](../../src/modules/tickets/service.ts), [workspace forms](../../src/modules/tickets/workspace.tsx), [detail forms](../../src/modules/tickets/ticket-detail.tsx), and [command route](../../src/app/api/tickets/commands/route.ts).

List/Kanban, filters, view switches, theme changes, navigation disclosure, dialogs, map layers, and fit/zoom controls legitimately operate in the browser over authorized data. They do not require database mutations. Kanban currently presents status columns; drag-and-drop status mutation is not implemented or offered as an action.

## Deferred capabilities and intentional boundaries

The following are absent in both the implemented UI workflow and its backend operation, or are explicitly outside the approved current scope. They should not be mistaken for hidden finished backend features:

- Ticket required-skill associations, direct Location relationships, ticket-to-cover-request and ticket-to-schedule-assignment handoffs. Optional workspace Client/Project links and ticket due dates are implemented, but do not complete these broader Phase 12 relationships.
- Daily work lists, flowcharts, cost/PDF reporting, external ticket synchronization, and scheduled reminders. These are deferred in the current ticket decisions, even where a historical preview shows them.
- Recurring or automatic scheduling, automatic replacement ranking/selection, GPS tracking, travel-time calculations, and geocoding.
- Certification verification affecting staffing or coverage eligibility. Evidence review is real, but its effect is informational under the confirmed decisions.
- Email/push/SMS notifications and background delivery workers.
- Microsoft/Google/company identity integration and general Phase 13 rollout certification. Existing password sign-in, account administration, and deployed fictional-company delivery are real; they must not be described as mock-only merely because older architecture/tracker text predates them.

The development/test-only foundation scope endpoint and mock-login API are intentional verification seams without normal product screens. Likewise, unused legacy readers such as `schedulingService.getMySchedule` are not evidence that personal scheduling is missing: the current `/schedule` page uses the timetable service. The unused placeholder provider file is not proof that map/file features are fake; active map and evidence adapters are implemented separately.

## Recommended work order

1. Complete employee-skill recovery, including the archive → restore or re-record journey, with retained history and current Super Admin authority.
2. Align profile evidence limits and byte delivery with the hosted path, including a plan for any existing larger files.
3. Resolve the existing history-preserving schedule omission design and verify its effect on revision, leave conflicts, coverage, map, and reports.
4. Expose the existing arrangement-label catalogue, job-title lifecycle, and default-work-location mutation through authorized UI actions.
5. Define and implement employee planning-coordinate maintenance with the approved privacy boundaries.
6. Treat unread indicators and informational skill metadata as separate refinements. Keep global Settings labelled until its content is confirmed, and keep the historical preview distinguishable from the live application.

These findings identify work; they do not authorize implementation of unresolved product decisions or amend phase completion claims.
