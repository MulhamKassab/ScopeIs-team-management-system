# Company tickets — local core delivery, 9 October 2026

The approved core Company workflow is implemented at `/tickets`: independent workspaces and boards, optional Client/Project links, five ticket states, four priorities, creator/assignee/observer access, work logs, private attachments, in-app notifications and retained archive/restore. Managers can correct workspace names/descriptions and board names/lifecycle. Workspace corrections preserve their operational links and access facts.

Employees land on Tickets and use Tickets, Schedule, Vacations and My profile as their primary destinations. My profile includes their own recorded skills. Existing published-only personal timetable, leave balance/request/history, profile/evidence, notification and participant-only request boundaries remain. Managers retain their existing tools.

The [confirmed decisions](../project-memory/PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md) are the acceptance boundary. The full Phase 12 roadmap remains partial: direct Location/required-skill relationships and workforce handoffs are future work. The user deferred daily work lists, flowcharts and cost/PDF reporting. No push, production migration or deployment was requested or performed.

## Access and retained history

Every read and mutation rechecks current database identity, session, activity, password-change gate, workspace membership, board lifecycle and participation. Admin work also requires current TEAM and matching Client/Project authority. New Admin membership/participation must be reachable under that Admin's own scope. Employees create on Published boards and update/close their own or assigned tickets; observers remain read-only. Creator and manager ticket archive/restore preserve history. Work-log edits remain author-only; file owners and authorized managers can archive/restore eligible files.

Review found and repaired two access problems before delivery: authorization and content reads could span different snapshots during revocation, and a revoked cross-team participant's retained logs/files could become visible to a scoped Admin. Reads now use consistent snapshots and ordered locks, and retained authors/uploaders remain part of the TEAM authorization check. Mutation races share the ticket version and serialize under parent/session/grant locks. Audit and notifications commit with primary state; private upload bytes are compensated when persistence fails.

The final browser checks also exposed PostgreSQL serialization failure `40001` when a repeatable-read snapshot met a newer committed row at its SHARE lock. Workspace, detail and file-access reads now retry the entire transaction up to three fresh attempts, including current identity and authorization. Exhaustion returns a safe 409; other infrastructure and authorization failures propagate without retry. Mutations are not automatically retried. Deterministic PostgreSQL tests commit between the first snapshot and lock for all three read paths, verify fresh content, and confirm that revoked participation is refused after restarting.

Attachments follow the host PDF/JPEG/PNG/DOCX and 5 MiB boundary. Download uses fresh authorization, private no-store headers, attachment delivery, nosniff and sandboxing. Public URLs and storage keys are absent from client metadata. Ticket notification links reauthorize their destinations; audit text uses safe per-action fields without subjects, notes, filenames or log contents.

## Local data and runtime

The guarded additive upgrade applied `0015_company_tickets` to the explicitly configured loopback development database. The pre-upgrade snapshot and receipt are under `%LOCALAPPDATA%\ScopeIsLocal\backups`. All 34 existing tables and their facts/schema fingerprints, plus all 15 historical migration ledger rows, matched before commit. The canonical current state is D with 16 ledger rows and 41 tables. A later dry run reported the database already current.

The prior local data included seven users, 57 assignments, 19 schedule periods and four leave requests. The additive migration preserved them. Ordinary authenticated demo actions then added five labeled fictional ticket examples and one 678-byte valid fictional PDF. Re-running the example creator added zero duplicate tickets.

The ignored development environment uses durable private storage outside the checkout under `%LOCALAPPDATA%\ScopeIsLocal\private-files`. After an app restart, Mulham's ordinary Employee session downloaded the example PDF successfully with private no-store and attachment headers; SHA-256 `4bbfe84a63f43a0ae7d2c4948696009309447af19e2b30e259d4f3131fd763fe`. Production still refuses local storage. The Next development indicator is hidden because it otherwise covered the first mobile navigation item.

The persistent local app was walked through in the in-app browser: Raafat retained management navigation and ticket management actions; Mulham landed on Tickets and saw two assigned tickets plus one read-only observed ticket, their recorded skills, their published schedule and their vacation request/balance. Mobile Tickets navigation was verified after restart.

## Verification

| Gate | Actual result |
| --- | --- |
| Unit/component regression | 314/319 passed in the broad initial invocation; five 5-second timeouts occurred during competing builds. All affected files passed on the focused 36/36 recheck with a 20-second bound. One later workspace-settings component case brings the validated unique unit/component set to 320. |
| Final ticket policy/presentation/detail/workspace checks | 26/26 passed after workspace correction support; includes 17 component cases. |
| Aggregate PostgreSQL integration | All 16 isolated suites passed, including the existing workforce, credentials, account administration and ticket/file suites. |
| Final ticket/file service recheck | 24/24 passed after workspace corrections and serialization retry: 17 ticket cases and seven file cases; two disposable databases created/dropped, zero retained. |
| Migration | 11/11 passed: fresh install, existing-state upgrade/preservation, ledger/schema parity, constraints, drift and cleanup. |
| HTTP route certification | 21/21 passed, including ticket authentication, role/participation, privacy, validation, stale updates and membership revocation. |
| Isolation | 9/9 passed. |
| Scenario registration | 83 scenarios, 88 files and 39 protected routes validated. Registration is not itself a passing journey. |
| TypeScript and repository ESLint | Passed after the serialization retry and regression cases. |
| Whitespace | `git diff --check` passed. |
| Isolated production build | Passed on the final source through the guarded ticket browser runner, including both TypeScript stages and all ticket pages/APIs. |
| Desktop/mobile browser | All ten unique final-source journeys verified: eight passed in the full 10-case run, then both manager cases passed in a focused 2/2 desktop/phone rerun after fixing dismissal of an already removed modal in the test helper. Employee creation/hold/close/log/archive/restore, observer privacy, file delivery/revocation, shared filters/List/Board, manager workspace correction/membership/publication/participation and retained manager routes pass. This is combined evidence, not one clean 10/10 invocation. |

The final browser build includes the badge foreground tone adjustment. Light/dark High and On-hold labels mix the accent with the text color for computed contrast of 4.65:1 / 7.73:1.

Ignored browser receipts are `test-results/company-tickets-complete-journeys-results.json` (8 passed, two modal-helper failures) and `test-results/company-tickets-manager-results.json` (2/2 passed). Both runs created and dropped their one owned disposable database, retained zero databases, and cleaned their owned server/build/private-file resources. Six final-source screenshots remain under `test-results/company-tickets-complete-journeys/`; phone captures are readable and fit without horizontal overflow. Desktop captures caught entrance motion and are not asserted as settled sidebar/header contrast evidence. Earlier attempts additionally exposed readiness bounds, exact-label selectors, navigation/login waits and Windows process-tree cleanup; their failures are preserved rather than described as passing runs.

An earlier failed HTTP test checkout remains under the system temporary directory because automatic approval review rejected its recursive deletion with the reason “blocked by policy.” It was left intact. Subsequent guarded runs track their own server/process trees, databases and private-file directories; their cleanup receipts apply to those runs only.

The complete system-lock/aggregate historical browser contract was not rerun for this core slice. Previous phase receipts remain evidence for their own source. This report records combined scoped evidence, including the initial failures and specific rechecks, rather than claiming one clean full-system-lock invocation.
