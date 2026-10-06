# Monthly timetable and people management — 2026-10-06

The user requested a monthly view of who is where and what they are doing, clearer coverage and replacement workflows, managed Team and Designation dropdowns, removal of development phase labels, and coverage copy that addresses Super Admin directly.

## Delivered behavior

- Schedule opens with Month. People shows each person across the month; Agenda provides full chronological work cards. Selecting a day opens times, client, project, location and shared instruction. Person, Client and Project filters sit behind a clearly labelled disclosure. Publishing and assignment editing remain in the monthly schedule editor.
- Published work includes only current Published revisions. Unpublished planning is separate. Employee responses contain only their own Published assignments. Admin responses require both TEAM visibility and matching operational scope, resolved again on each read.
- Teams and Designations have Super Admin-only management pages with creation, renaming and membership controls. Membership moves or clears only its own profile field. System role, explicit scope grants, manager and working pattern remain independent. The directory and employee detail display managed team names.
- Coverage opens with selectable monthly work. It explains staffing shortages separately from missing recorded skills, and shows eligible support candidates. Replacement cards distinguish taking over an assignment from adding another person alongside it, show the proposed person and explain the next step. Approval prepares a Draft for publication.
- Super Admin coverage requests offer “Choose during review” and “Create coverage request”, with a direct route to review. Product-facing phase labels are removed.
- Native dialogs, visible action confirmation, finite motion, 44-pixel touch targets, internal calendar/table scrolling, logical CSS for RTL and theme tokens are retained. On phones, calendar dots lead to full day details; Agenda remains available for reading every assignment.

## Verification

Lint, TypeScript, 140 unit cases, 113 component cases, nine migration cases, five new timetable/organisation service cases, existing scheduling, employee-core and coverage service suites, and company-demo integrity checks passed. The browser journey exercised 320-, 390- and 1280-pixel layouts, all three views, day dialogs, coverage navigation, creation and membership changes, the Team dropdown, and a dark RTL phone with reduced motion. The browser runner builds an isolated production artifact using the safe-build workflow. No production environment file was loaded.

The additive migration `0014_team_catalogue` is applied to the sole approved `scopeis_company_demo` database. The resulting canonical schema fingerprint is `6b5170a137590eac3e51447fada3ffe31da2f05aafd8574526e5073f16d55380`, with all 15 ledger entries and no pending migrations. All 33 existing tables retain identical data, including seven users, profiles and credentials. Operations is backfilled from existing membership and scope references. See [the sanitized migration receipt](evidence/timetable-people-2026-10-06/live-migration.json). Recovery snapshots are stored privately outside this repository.

The hosted operator can append to the verified migration ledger but cannot issue the normal migrator’s redundant CREATE statement in its existing application-owned schema. The guarded upgrade therefore executes the checked canonical SQL and exact journal hash/timestamp in one transaction, verifies the full schema before commit, and grants only the new table’s required application privileges. Existing credentials and permission grants are preserved.

The approved delivery destination remains [the primary application](https://scopeis-team-management-system.vercel.app/). Git and Vercel delivery are verified after pushing the implementation; their exact commit and deployment are recorded in the private delivery receipt. Historical verification reports apply to their original source and are not re-certified by this change.

Live verification of implementation commit `a3228eead8ec9ccf76dd0eadb4c8ecdbcfa19353` confirmed Vercel deployment success on the primary URL, seven successful account sign-ins and 49 authorized page checks with zero errors. The actual-name monthly calendar, day details and Super Admin request wording were also verified in the live browser. A final copy polish uses singular nouns for single assignments, people and sites.
