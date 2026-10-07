# Phase 10 management-note authorization remediation R1

**Classification:** `SCOPEIS_PHASE_10_ACCESS_CONTROL_REMEDIATION_COMPLETED_AND_PUSHED`

**Remediation ID:** `SCOPEIS_PHASE_10_MANAGEMENT_NOTE_AUTHORIZATION_REMEDIATION_R1`

**Starting point:** `c534e7357a38c2e8594c75baa656f3a2950f7a5d` (`feat: implement Phase 10 collaboration and governance journey`) on `main`, `main...origin/main` at `0/0`. Phase 10 remains `COMPLETED`; Phase 11 was not started.

## 1. Previous ambiguity

The Phase 10 report and decisions record stated two rules that cannot both hold:

1. "Access always uses the reader's current role and scope; the stored `author_role` is historical context only."
2. "An author who is later demoted keeps access to what they wrote through the author-scoped listing."

The second rule lets authorship permanently bypass current authorization, which is unsafe for a management record that can contain sensitive supervision content about a specific employee.

## 2. Actual pre-remediation behaviour (verified, not assumed)

The claim in rule 1 was **not** what the shipped code did. Two functions produced the conflict:

| Location | Pre-remediation behaviour |
| --- | --- |
| `src/modules/employees/employee-policy.ts` → `canReadManagementNote` | Returned `true` for `actor.id === note.authorUserId` **before** evaluating role or scope, so authorship short-circuited every other check. |
| `src/modules/notes/service.ts` → `listAuthoredByActor` | Had no role gate and projected rows through the authorship-first policy, so any current role — including `EMPLOYEE` — received the notes it had written. |
| `src/modules/notes/service.ts` → `project` → `canArchive` | Offered archive to the stored author whenever the row was readable, which it always was for that author. |
| `src/modules/notes/service.ts` → `archive` | Authorized through the same authorship-first policy, so an out-of-scope Admin author could still archive, and a demoted author was blocked only by the separate `EMPLOYEE` guard. |
| `src/modules/notes/repositories.ts` → `activeNoteCount` | Exported a policy-free count query. It was unused at the time, but it was an unsafe existence signal available to a future caller. |

A temporary probe was executed against the then-current policy with an author who is (a) demoted to `EMPLOYEE`, (b) an `ADMIN` with no scope, and (c) an `ADMIN` scoped to another team. It recorded `demotedAuthor: true, outOfScopeAuthor: true, otherTeamAuthor: true`. The probe file was deleted immediately after the run and was never committed.

The employee-detail panel path (`listForSubject` → `requireVisibleSubject`) was already correct, because it refused the subject, `EMPLOYEE` actors, and out-of-scope Admins before projecting. The defect was real but confined to the author-scoped and archive paths plus the policy function itself.

## 3. Approved policy implemented

> Management-note access requires both note-level visibility permission and current authorization to manage/read the subject. Authorship alone never overrides current role or scope.

`canReadManagementNote` now evaluates, in order:

1. Subject exclusion — `actor.id === note.subjectUserId` is refused absolutely, regardless of role or authorship.
2. Current role — an `EMPLOYEE` actor is refused.
3. Current subject authorization — `canReadEmployee(actor, note.subject)` is required for every path, **including an author reading their own note**.
4. Note-level visibility — the author may read; otherwise the note must be `shared_upward` **and** the actor must currently be a Super Admin.

`ManagementNoteService` additionally resolves the acting user from the database on every operation (`currentActor`): current `role`, current `active`, and current `admin_scope_grants`. A missing or inactive actor receives the same non-enumerating refusal as a nonexistent note, so a stale session or a previously constructed actor object cannot carry access forward.

| Enforcement point | Behaviour after remediation |
| --- | --- |
| Service-layer reads (`listForSubject`) | Current actor + current subject authorization, then visibility |
| Author-scoped list (`listAuthoredByActor`) | Current actor resolved, `EMPLOYEE` returns no notes, every row re-filtered through the policy |
| Direct-id lookup (`archive` resolves the note by id) | Policy evaluated against the freshly loaded note and subject |
| Archive authority | Requires the policy **and** (current author **or** current Super Admin) |
| Counts / existence signals (`countVisibleForSubject`) | Runs through the same read policy; an unauthorized actor gets the refusal instead of a number |
| Employee-detail panel (`panel`) | Returns `null` for any actor the policy refuses; the panel is never composed |

The policy-free `activeNoteCount` repository helper was deleted. The stored `author_role`, original `author_id`, timestamps, content, and audit history are untouched — historical authorship is preserved, only access changes. Archived notes are not a route back to access.

## 4. Authorization matrix (implemented and tested)

| Actor | Read own private note | Read own shared-upward note | Read peer note | Archive own note |
| --- | --- | --- | --- | --- |
| Current Super Admin, still authorized | Yes | Yes | Private: no. Shared-upward: yes | Yes |
| Current Admin, subject in current TEAM scope | Yes | Yes | No | Yes |
| Current Admin, subject scope revoked | No | No | No | No |
| Admin moved to another team | No | No | No | No |
| Admin demoted to Employee | No | No | No | No |
| Disabled or removed actor | No | No | No | No |
| Another Super Admin (non-author) | No | Yes | n/a | No (private), Yes (shared-upward) |
| Subject, even after a role or scope upgrade | No | No | No | No |
| Unauthorized, out-of-scope, peer, demoted, subject, and guessed id | Same `NOT_FOUND`, status 404, same message as a nonexistent note | | | |

## 5. Files changed

| File | Change |
| --- | --- |
| `src/modules/employees/employee-policy.ts` | `canReadManagementNote` now requires current role and current subject authorization before visibility; authorship is no longer a short-circuit |
| `src/modules/notes/service.ts` | Added `currentActor` (role/active/grants re-read per request); applied it to list, author list, panel, count, create, and archive; archive requires current author or Super Admin; `canArchive` no longer trusts authorship alone; added policy-applied `countVisibleForSubject` |
| `src/modules/notes/repositories.ts` | Added `actor` lookup (current role and active); removed the policy-free `activeNoteCount` |
| `test/integration/phase10-management-note-authorization.test.ts` | New: 15 disposable-PostgreSQL scenarios that mutate role, active flag, and TEAM grants between calls |
| `test/integration/phase10-collaboration-service.test.ts` | The demoted-author assertion now proves denial and restoration through current authorization, with the stored content asserted unchanged |
| `test/unit/employee-policy.test.ts` | Added the current-authorization policy matrix, including absolute subject exclusion under a role upgrade |
| `scripts/run-phase10-service-tests.mjs` | Phase 10 focused runner now executes both Phase 10 integration files |
| `scripts/run-aggregate-integration-tests.mjs` | Phase 10 aggregate suite entry now lists both integration files (manifest guard stays satisfied) |
| `DOCX/phase-reports/SCOPEIS_PHASE_10_…R1.md` | Corrected the inaccurate privacy bullet and added the authoritative commit manifest |
| `DOCX/project-memory/PHASE_10_COLLABORATION_AND_GOVERNANCE_DECISIONS.md` | Corrected the superseded demoted-author wording and recorded per-request enforcement |
| `DOCX/project-memory/ROLE_AND_PERMISSION_MODEL.md` | Matrix and safeguards now state the current-authorization requirement |
| `DOCX/project-memory/DECISIONS_AND_CONSTRAINTS.md` | Confirmed decision records the corrected rule |
| `DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md` | Remediation row, evidence shorthand, and Phase 10 matrix evidence updated |
| `DOCX/project-memory/IMPLEMENTATION_STATUS_LOG.md` | Append-only remediation entry |

No product behaviour outside management-note authorization changed. Shared notes, discussions, notifications, audit, evidence, scheduling, leave, coverage, and the planning map are untouched.

## 6. Tests added or strengthened

`test/integration/phase10-management-note-authorization.test.ts` owns a dedicated fictional subject and dedicated fictional Admin actors, so its counts are exact and its role/grant mutations cannot disturb another integration file. Each scenario mutates the database and then calls the service, proving authorization is evaluated at request time.

1. Authorized Admin author reads their own private note while in scope.
2. The same author loses access immediately when their TEAM grant is revoked, and the stored note is asserted unchanged.
3. The same author loses access after being demoted to Employee, including archive.
4. Access returns only after the current role **and** current scope are restored.
5. A disabled/inactive author is refused for list, author list, archive, and create.
6. An Admin moved to another team is refused.
7. A peer Admin holding the subject's TEAM scope still sees no notes and cannot archive.
8. A Super Admin reads an authorized shared-upward note.
9. Another Super Admin cannot read, or archive, a private-to-author note.
10. The subject is never re-admitted, including after being upgraded to Admin and given the subject's scope.
11. List, direct-id, count, archive, and manipulated/missing identifiers all return the identical message and status.
12. Every denial is non-enumerating and carries no note content.
13. No note content reaches audit metadata or notification rows.
14. Historical authorship, author role at creation, visibility, and content remain stored.
15. Archive authority follows the same current-authorization rule, and a repeat or stale archive is refused while history survives.

The Phase 10 collaboration suite and the unit policy suite were strengthened to encode the corrected rule, and the existing Phase 10 journey tests (component and desktop/mobile E2E) continue to pass unchanged.

## 7. Commit-manifest reconciliation

Obtained independently from Git for the Phase 10 commit `c534e7357a38c2e8594c75baa656f3a2950f7a5d`:

| Category | Reported in the Phase 10 delivery message | Authoritative manifest |
| --- | ---: | ---: |
| Documentation | 12 | **15** |
| Harness and configuration | 9 | **9** (correct) |
| Application | 41 | **39** |
| Tests | 6 | **5** |
| **Total** | 68 | **68** (36 added, 32 modified) |

The enumerated file names in the delivery message were correct and summed to 68; only the category labels were wrong. The authoritative counts were added to section 14 of the Phase 10 report. The Phase 10 commit was **not** amended or rewritten; the correction is recorded in this remediation commit.

## 8. Gate results (remediation commit)

| # | Gate | Command | Result | Totals | Skips |
| --- | --- | --- | --- | --- | --- |
| 1 | Typecheck | `npm run typecheck` | PASS (exit 0) | — | 0 |
| 2 | Unit | `npm run test:unit` | PASS | 59/59 in 15 files | 0 |
| 3 | Component | `npm run test:component` | PASS | 32/32 in 12 files, database-free | 0 |
| 4 | Aggregate integration | `npm run test:integration` | PASS | 10/10 suites, 78/78 | 0 |
| 5 | Phase 10 focused service | `npm run test:phase10-service` | PASS | 26/26 in 2 files | 0 |
| 6 | Migration | `npm run test:migration` | PASS | 8/8 | 0 |
| 7 | Aggregate E2E | `npm run test:e2e` | PASS | 10/10 suites, 66/66 | **0** |
| 8 | Phase 10 focused E2E | `npm run test:phase10-e2e` | PASS | 2/2 (desktop + mobile) | 0 |
| 9 | Route certification | `npm run test:route-certification` | PASS | 12/12 | 0 |
| 10 | Seed smoke | `npm run test:seed-smoke` | PASS (idempotent) | 3 verifications | 0 |
| 11 | Isolation | `npm run test:isolation` | PASS | 9/9 checks | 0 |
| 12 | Lint | `npm run lint` | PASS (exit 0) | — | 0 |
| 13 | Safe build | `npm run build:safe` | PASS (exit 0) | all routes emitted | 0 |
| 14 | Whitespace | `git diff --check`, `git diff --cached --check` | PASS (exit 0) | — | — |

No test was skipped to manufacture a pass. The management-note authorization scenarios all execute.

## 9. Custody, safety, and next step

- Work was performed on `main` only, starting from `c534e7357a38c2e8594c75baa656f3a2950f7a5d`.
- `prototype/full-frontend-r1/` and `scripts/remediate-r2-persistent-test-incident.mjs` were preserved untouched and unstaged.
- Every `.env*` file was preserved untouched; no secret value was read or printed, and no production database, storage, authentication, hosting, or deployment was contacted.
- Plain `npm run build` was not executed; `npm run build:safe` remains the only sanctioned build.
- All database verification used freshly created loopback-only disposable PostgreSQL databases with fictional data.
- The Preview worktree (`preview` at `7c401c6add34db14c43b2139aebc9c8878618927` with its five pre-existing untracked duplicates) was not modified, merged, rebased, staged, cleaned, or pushed.
- Phase 10 remains `COMPLETED`. Phase 11 — dashboards, reports, and exports — remains the next journey and was not started. The commit and push result are recorded in the delivery message.

## 10. Remaining debt

- `listAuthoredByActor` remains a service method with no route or action caller. It is now correctly gated, but it could be removed if no future surface needs an author-scoped list.
- The employee-detail panel still relies on the surrounding page for `module:employees:view`; the note service enforces the note-specific policy independently, and both are required.
- Phase 9 sub-phase 9.9 (whether verification affects coverage or replacement eligibility) remains a deferred product decision and is unaffected by this remediation.
