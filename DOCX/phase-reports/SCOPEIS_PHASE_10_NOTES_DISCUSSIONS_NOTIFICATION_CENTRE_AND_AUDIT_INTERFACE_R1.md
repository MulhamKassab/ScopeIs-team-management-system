# Phase 10 — Notes, discussions, notification centre, and audit interface R1

**Classification:** `SCOPEIS_PHASE_10_COMPLETED_AND_PUSHED`

**Phase ID:** `SCOPEIS_PHASE_10_NOTES_DISCUSSIONS_NOTIFICATION_CENTRE_AND_AUDIT_INTERFACE_R1`

**Starting point:** `64fd480a5d099a127d9ea62ef0e53a819f1e5d7a` (`feat: implement Phase 9 capability evidence journey`) on `main`, `main...origin/main` at `0/0`.

## 1. Journey delivered

`Manager records and revises shared operational or employee-management context → the record stays within its authorized audience → participants on a replacement request discuss it → every affected recipient sees and curates their own notification → Super Admin can explain recorded actions from audit history`

Phase 10 completed five real, PostgreSQL-backed surfaces plus one prerequisite. Shared Client, Project, and Location notes preserve the previous content on every edit, keep editing author-only, and keep archive Super Admin-only with a retained reason. Employee-management notes gained a real repository, service, validation, action, authorization, audit, and `/employees/[userId]` panel over the existing schema and policy. Replacement-request discussions are participant-only with participants derived live from the request. `/notifications` became a complete recipient-owned inbox for every role. `/audit` became a Super Admin-only read-only history with safe, allowlisted rendering. The Phase 9 evidence-integrity prerequisite resets review and verification provenance whenever an owner materially changes evidence.

## 2. Approved shared-note access decision

The product owner confirmed during Phase 10 that "shared" Client, Project, and Location notes are shared with **every authenticated user already authorized on the parent record**, not with every authenticated user:

- Super Admin may read and add shared notes for any applicable parent.
- Admin may read and add shared notes only where their Client, Project, or Location scope authorizes the parent.
- Employees gain no Client, Project, Location, or shared-note access.
- NTE-005 and its related documentation were reconciled to this meaning; Employee permissions were not widened.

| Actor | Read shared note | Add note | Edit note | Archive note |
| --- | --- | --- | --- | --- |
| Super Admin | Any authorized parent | Yes | Author only | Yes, with a retained reason |
| Scoped Admin | Parent in their Client/Project/Location scope | Yes | Author only | No |
| Scoped Admin, out of scope | `OUT_OF_SCOPE` refusal performed before any content read | No | No | No |
| Employee | `FORBIDDEN` refusal | No | No | No |

No notification is generated for shared-note activity in V1, and a database test asserts that no notification row references a shared note.

## 3. Shared-note revision history

Additive table `operational_note_revisions` (`id`, `note_id`, `version`, `content`, `edited_by_user_id`, `created_at`, unique `(note_id, version)`, check `version > 0`, index on `(note_id, version)`) stores the superseded content of each edit.

Every edit runs in one transaction: the note row is locked with `select ... for update`, the expected version is re-checked against the locked row, the previous content is written as a revision, then the note row is updated. A stale expected version returns `STALE_VERSION` and writes no revision. Editing and revision creation are both audited (`operational_note.updated`, `operational_note.revision_created`) with safe metadata only — never note content. The client detail panel renders the history inside a collapsed "Previous versions" disclosure, so a superseded value is recoverable without dominating the page.

## 4. Employee-management-note privacy matrix (implemented and tested)

| Actor | Create about | Read private-to-author | Read shared-upward | Subject exposure |
| --- | --- | --- | --- | --- |
| Super Admin | Admin or Employee (never a Super Admin) | Own notes only | Any authorized subject | Never the subject |
| Scoped Admin | In-scope Employee only | Own notes only | Own notes only | Never the subject |
| Peer Admin | n/a | No | No | n/a |
| Out-of-scope Admin | No (`NOT_FOUND`) | No | No | n/a |
| Employee actor | No | No | No | n/a |
| Note subject | n/a | No | No | Never |

Additional implemented rules:

- The subject of a note, an Employee actor, a peer Admin, an out-of-scope Admin, and a guessed note id all receive the same `NOT_FOUND` refusal as a nonexistent note.
- An Admin without the subject in their current scope is refused before any subject fact is returned, so the panel cannot be used to confirm that an out-of-scope employee exists.
- Content is immutable. Corrections archive the old note and create another; nothing is hard-deleted.
- Visibility is fixed at creation and cannot change.
- Access always uses the reader's current role and scope; the stored `author_role` is historical context only.
- Current authorization is required for every read, including an author reading their own note: a demoted, deactivated, re-scoped, or out-of-scope author loses access, and the shared-upward projection follows the reader's current scope.
- HTML-shaped input is refused at the validation boundary; rendering is plain text.
- The panel is only composed for an actor the service authorizes; it renders nothing for the subject or an unauthorized actor.

> **Corrected after Phase 10.** The rule above was **not** what the Phase 10 commit enforced. The shipped `canReadManagementNote` returned `true` for the author before evaluating role or scope, and `listAuthoredByActor` admitted any current role, so a demoted or out-of-scope author retained access to notes they had written. This was corrected by the post-Phase-10 access-control remediation recorded in [`SCOPEIS_PHASE_10_MANAGEMENT_NOTE_AUTHORIZATION_REMEDIATION_R1.md`](SCOPEIS_PHASE_10_MANAGEMENT_NOTE_AUTHORIZATION_REMEDIATION_R1.md). This report's section 11 totals for Phase 10 are likewise superseded by that remediation's gate table.

## 5. Replacement-request discussions

Only `replacement_request` is a supported discussion parent. The restriction is enforced twice: a strict Zod boundary (`UNSUPPORTED_PARENT`) and a database check constraint on `discussion_threads.parent_type`.

- Participants are derived live from the request: requester plus the currently named employee(s). No membership management exists, and a Super Admin is not a participant because of their role.
- Messages are plain text, maximum 2,000 characters, append-only, immutable, and ordered by `(created_at, id)`.
- Only the author may archive their own message; another participant receives the same refusal as a nonexistent message, and archived rows remain in the table.
- One thread per request, enforced by a unique `(parent_type, parent_id)` constraint. Concurrent first messages are serialized with a transaction advisory lock on the parent plus `on conflict do nothing`, so exactly one thread exists.
- Message creation writes the message, a safe audit event (`discussion.message_created`, never the content), and one notification per other current participant, in a single transaction.
- Participants are recalculated on every read and write: a newly named employee gains access, and a removed one loses it immediately.
- Threads are surfaced on `/replacements` for participating management and on `/requests` for participating employees. Nonparticipants receive `NOT_FOUND`.

## 6. Notification centre

| Capability | Implemented behaviour |
| --- | --- |
| Ownership | One recipient per row; only that recipient may read or mutate it |
| Inbox | Newest-first, page size 25, stable `(created_at, id)` ordering |
| Unread count | Recipient-scoped, active (non-archived) only |
| Read / unread | Independent, idempotent |
| Archive / restore | Independent of read state, explicit restore, idempotent |
| Mark all read | Bounded to the acting recipient's active unread rows |
| Related-record navigation | Resolved server-side and reauthorized for the current recipient |
| Unavailable target | One neutral state; never a probe that reveals existence |

Notification rows still store no private display content. Titles and summaries derive from the event type through a presentation catalogue, and an unmapped event type falls back to a neutral "Update" label. Navigation resolution covers `employee_evidence`, `discussion_thread`, `replacement_request`, `leave_request`, and `schedule_period`; anything else, any missing row, and any unauthorized actor returns the neutral state.

## 7. Audit-history interface

`/audit` is Super Admin-only, read-only, newest-first, paginated at 50, and ordered by `(occurred_at, id)`. Filters cover action, target type, actor, and an inclusive bounded date range; options are derived from recorded data so the filter can never invent a value. Admin and Employee receive a non-enumerating `NOT_FOUND`.

Rendering never shows raw JSON. Every known action declares an allowlist of safe metadata keys — identifiers, enumerable state, counts, and booleans — and each value is coerced to a short primitive; objects, arrays, and nulls are dropped. An unknown action receives the generic label `Recorded system action` with no metadata at all. The actor join is a left join, so a removed actor leaves the event readable with no name. Opening the page generates no audit event, and no mutation, deletion, or export exists.

## 8. Phase 9 evidence-integrity prerequisite

When an owner materially changes evidence — title, issuer, issue date, expiry date, related skill, details, file attachment, or file replacement — the update transaction also sets `review_state` back to `unreviewed` and clears `reviewed_by_user_id`, `reviewed_at`, `verified_by_user_id`, and `verified_at`. An `evidence.review_reset` audit event records the evidence kind, the previous state, and `cause: owner_material_change`; no title, issuer, filename, URL, or detail is written.

Proven by the Phase 9 integration suite:

- A verified item becomes `unreviewed` after a material edit, with both review and verification provenance cleared.
- A file attachment after re-verification resets it again (two reset events).
- The owner still sees the item and it is flagged new or updated; Super Admin still receives an `evidence.updated` notification.
- Review actions themselves never reset the item and never change `last_submitted_at`.
- Phase 7 coverage results remain unchanged; no Phase 7 service is imported by the evidence module.

## 9. Data model and migration

Additive migration `0011_phase_10_collaboration_governance.sql` (journal index 11, `when` 1788930000000) adds three tables and four indexes and changes no existing column or constraint.

| Object | Purpose |
| --- | --- |
| `operational_note_revisions` | Previous content of every shared-note edit; unique `(note_id, version)`, checks, restricted foreign keys |
| `discussion_threads` | One thread per parent; unique `(parent_type, parent_id)`, check constraining `parent_type = 'replacement_request'`, restricted foreign key to `replacement_requests` |
| `discussion_messages` | Append-only messages with `version`, archive provenance, a 1–2,000 character content check, and a `(thread_id, created_at, id)` index |
| `notifications_recipient_created_idx` | Recipient pagination in `(recipient_user_id, created_at, id)` order |
| `audit_events_occurred_idx`, `audit_events_target_idx` | Chronological pagination and target lookup |

Verified post-migration state: **32 tables** and **12 migration-ledger rows**, with the adoption fingerprint manifest and migration state mapping updated and the drift-detection suite green.

## 10. Transactions, concurrency, and rollback

| Guarantee | Mechanism | Proven by |
| --- | --- | --- |
| Note edit is never lossy | Lock + version re-check + revision insert + update in one transaction | Integration test asserting one revision and `STALE_VERSION` on a stale write |
| Stale note edits cannot overwrite | Conditional update on `expected_version` inside a locked transaction | Integration test |
| One thread per request | Advisory lock on the parent + unique constraint + `on conflict do nothing` | Integration test running two concurrent first messages |
| Message + audit + notifications are atomic | Single transaction per message | Failure-injection test: a forced notification failure leaves no message, no audit event, and no notification |
| Management-note + audit are atomic | Single transaction | Failure-injection test: a forced audit failure leaves no note row |
| Notification state is idempotent | Conditional updates scoped by recipient | Integration test re-applying read and archive |
| Pagination is deterministic | `(created_at, id)` / `(occurred_at, id)` ordering | Integration test asserting no overlap between pages |

## 11. Verification gates (final committed state)

Every command below was executed against the completed implementation on `main`.

| # | Gate | Command | Result | Totals | Skips |
| --- | --- | --- | --- | --- | --- |
| 1 | Typecheck | `npm run typecheck` | PASS (exit 0) | — | 0 |
| 2 | Unit | `npm run test:unit` | PASS | 56/56 in 15 files | 0 |
| 3 | Component | `npm run test:component` | PASS | 32/32 in 12 files | 0 |
| 4 | Aggregate integration | `npm run test:integration` | PASS | 10/10 suites, 63/63 tests | 0 |
| 5–13 | Focused service suites | `npm run test:phase2-core` … `test:phase10-service` | PASS (each exit 0) | 13, 7, 5, 3, 3, 5, 1, 11, 11 | 0 |
| 14 | Migration | `npm run test:migration` | PASS | 8/8 | 0 |
| 15 | Route certification | `npm run test:route-certification` | PASS | 12/12 | 0 |
| 16 | Aggregate E2E | `npm run test:e2e` | PASS | 10/10 suites, 66/66 tests | **0** |
| 17 | Seed smoke | `npm run test:seed-smoke` | PASS (idempotent re-run) | 3 smoke verifications | 0 |
| 18 | Isolation | `npm run test:isolation` | PASS | 9/9 checks | 0 |
| 19 | Lint | `npm run lint` | PASS (exit 0) | — | 0 |
| 20 | Safe build | `npm run build:safe` | PASS (exit 0) | all 20 routes emitted, including `/notifications`, `/audit`, `/requests` | 0 |
| 21 | Whitespace | `git diff --check`, `git diff --cached --check` | PASS (exit 0) | — | — |

Per-suite aggregate integration counts: Phase 1 = 5, Phase 2 = 13, Phase 3 = 7, Phase 4 = 5, Phase 5 = 3, Phase 6 = 3, Phase 7 = 4, Phase 8 = 1, Phase 9 = 11, Phase 10 = 11.

Per-suite aggregate E2E counts (desktop + mobile): Phase 1 = 14, Phase 2 = 20, Phase 3 = 14, Phase 4 = 2, Phase 5 = 2, Phase 6 = 2, Phase 7 = 2, Phase 8 = 4, Phase 9 = 4, Phase 10 = 2.

The focused Phase 7 service runner also loads `test/unit/phase7-coverage-validation.test.ts`, which is why it reports 5 where the aggregate file reports 4.

### Environment and isolation evidence

- Every database gate ran against a freshly created loopback-only disposable PostgreSQL database owned by `scripts/disposable-test-database.mjs` and dropped in a `finally` block.
- Isolation proof: distinct per-suite databases, mutual invisibility, post-suite drop, unique non-privileged loopback ports, five unsafe database names refused, and the persistent `.env.test` database unchanged.
- No gate loaded `.env.production`. A scanner covers every harness and configuration file, and a manual grep of `src`, `scripts`, `test`, and the Playwright/Vitest/ESLint configuration found only prose comments.
- Plain `npm run build` was not executed. `npm run build:safe` remains the only sanctioned build.
- The lint boundary remains `prototype/**` only; a temporary probe file inside `src` was reported by ESLint and failed `npm run lint` (exit 1), proving the boundary is not overbroad. The probe was deleted immediately and the tree is clean.

## 12. Deferred work, non-goals, and remaining debt

- **Deferred product decision (not debt):** Phase 9 sub-phase 9.9 — whether verification affects coverage or replacement eligibility. Phase 10 surfaces verification state and deliberately does not change Phase 7 results.
- **Explicit non-goals, not implemented:** Phase 11 dashboards, reports, and exports; Phase 12 Ticket System and Ticket discussions; Phase 13 production identity, deployment, and rollout; external email/SMS/push notifications; real-time or WebSocket delivery; notification retention or purge automation; audit export or mutation; assignment discussions; note or message attachments, rich text, reactions, mentions, or edit history; Employee Client/Project permission widening; Preview fixture imports.
- **Non-blocking debt:** the notification centre is a server-rendered, action-per-row interface with no optimistic client update; `/requests` lists only replacement-request discussions because no other parent type is approved; the shared-note history disclosure is not paginated; the audit interface filters by exact action rather than by action family.

## 13. Custody, preservation, and Preview

- Work was performed on `main` only, starting from `64fd480a5d099a127d9ea62ef0e53a819f1e5d7a`.
- `prototype/full-frontend-r1/` and `scripts/remediate-r2-persistent-test-incident.mjs` were preserved untouched and unstaged.
- Every `.env*` file was preserved untouched; no secret value was read or printed, and no production database, storage, authentication, hosting, or deployment was contacted.
- The separate Preview worktree (`preview` at `7c401c6add34db14c43b2139aebc9c8878618927` with its five pre-existing untracked duplicate artifacts) was not modified, merged, rebased, staged, cleaned, or pushed.
- The commit and push result are recorded in the delivery message; Phase 11 was not started.

## 14. Authoritative commit manifest

Independently obtained from Git for commit `c534e7357a38c2e8594c75baa656f3a2950f7a5d` (`feat: implement Phase 10 collaboration and governance journey`).

| Category | Count | Composition |
| --- | ---: | --- |
| Documentation | 15 | `DOCX/` 13 (index, 10 project-memory records, the Phase 10 decisions record, this report) + `PROJECT_CONTEXT.md` + `README.md` |
| Harness and configuration | 9 | `scripts/` 7 (`phase10-test-fixtures`, `run-phase10-service-tests`, `run-phase10-playwright`, `run-aggregate-integration-tests`, `run-aggregate-e2e-tests`, `run-seed-smoke`, `phase2-migration-core`) + `package.json` + `playwright.phase10.config.ts` |
| Application | 39 | `src/` (3 new route pages, 2 updated route pages, `layout.tsx`, `phase10.css`, migration `0011`, journal, adoption manifest, schema, 20 new module files, 4 updated module files, 3 updated operations files, `navigation` and `evidence/service`) |
| Tests | 5 | `phase10-collaboration-service.test.ts`, `phase10-collaboration-forms.test.tsx`, `phase10-collaboration.spec.ts`, and the two Phase 9/migration files touched by the prerequisite |
| **Total** | **68** | 36 added + 32 modified |

**Correction recorded.** The Phase 10 delivery message reported "Documentation (12)", "Application (41)", and "Tests (6)". The independent manifest shows 15, 39, and 5 respectively. The enumerated file names in that message were themselves correct and summed to 68; only the category labels were wrong. The Git manifest above is authoritative, and the Phase 10 commit was not amended or rewritten.
