# Admin schedule-access amendment — 2026-10-09

Status: `PRODUCTION_RELEASED` for the bounded permission amendment and inaccurate-help corrections. All 98 affected local automated cases and the final-source guarded build/browser journey pass. Application `955fb4a88e26014fd19bc90a57323f97cf27eaf0` is pushed to `origin/main`, Ready at the canonical production domain, with 11/11 anonymous live checks passed. [The public release receipt](evidence/admin-schedule-access-2026-10-09/production-release.json) records exact source and deployment evidence. Signed-in production role/private-file journeys remain unverified.

## Confirmed requirement

The product owner instructed: “remove drafting schedules from admins.” This supersedes earlier scoped Admin schedule-writing authority in the current role model, requirements, Phase 4 decisions, workflows and navigation guidance. Historical dated reports remain evidence for their original source.

Super Admin alone creates or changes schedule periods, assignments, Draft notes and assignment-specific required skills; submits or returns proposals; creates/clones revisions; and publishes. Admin has no direct schedule mutation through a visible control, direct URL, assignment identifier or command API. Employee remains restricted to their own current Published assignments.

Admin retains authorized read access to Draft, Proposed and Published plans with existing TEAM and operational-scope checks. The separate scoped cover/replacement-request workflow remains permitted: Admin requests, Super Admin decides, the resulting approved effect prepares Draft work, and only Super Admin publishes. Independent Client/Project/Location requirements, operational notes, ticket participation/supervision, skills visibility and other management tools retain their existing permissions.

## Implementation boundary

This amendment changes authorization, capability-driven controls and role-aware help/shortcuts only. It requires no schema or migration, no account/credential change, no destructive schedule-data cleanup, and no production data seed. Existing optimistic versions, current-role/session checks, overlap/approved-leave controls, transactional audit/notifications and immutable Published history remain required.

The requested broader UI simplification review is completed as [a separate assessment](SCOPEIS_UI_CLARITY_REVIEW_2026_10_09.md), using current source, canonical guidance and fictional local desktop/phone evidence. Its add/remove/change/fix recommendations do not constitute an implemented redesign. The included permission-sensitive guidance now says View schedules, Schedule details or View team schedules for Admin; Admin leave help accurately describes Approved team-leave reading under the existing Phase 5 boundary. Ticket help consistently uses workspace → dashboard → ticket.

## Verification required

- Server-side refusal of all Admin direct schedule commands, including draft/revision creation, cloning, assignment create/edit/remove, Draft notes, proposal/return/publication and Draft assignment-requirement mutations.
- No schedule, assignment, requirement, audit or notification writes caused by those refused requests; stale caller roles cannot restore removed permission.
- Preserved scoped Draft/Proposed/Published reads and negative out-of-scope/Employee privacy checks.
- Preserved Super Admin drafting/publication and separate scoped Admin cover requests.
- Role-aware UI, help, discovery and shortcuts; guarded desktop/phone journey; affected tests, lint/types/build and scenario metadata checks.

## Current evidence

The coordinating implementation agent reports these actual passed checks for the amendment:

| Gate | Result | Bounded evidence |
|---|---|---|
| Phase 4 scheduling service | 14 passed | Admin direct mutations refused; scoped reads and Super Admin lifecycle retained |
| Phase 6 capabilities service | 5 passed | Admin assignment-specific requirement mutations refused; operational requirements retained |
| Scheduling-action, Phase 4/6 validation unit checks | 14 passed | Current-role action boundary and input contracts |
| Phase 7 coverage service | 19 passed | Separate scoped requests and Super Admin Draft-safe effects retained |
| Affected components | 41 passed across four files | Schedule forms, reporting shortcuts, journey help and workspace guidance |
| Timetable component | 3 passed | Existing timetable read/view behavior retained |
| ESLint and TypeScript | Passed | Full maintained lint/types plus late timetable/E2E scoped lint and final typecheck |
| Scenario registry | Passed | 83 scenarios, 89 registered/runner-covered files, 39 protected routes |
| Whitespace checks | Passed | No whitespace error |
| Guarded final-source build and browser journey | 2/2 passed | Desktop 23.0 s, phone 23.5 s; final application source built and started through the isolated production-build harness |

The 52 backend/unit, 44 component and two browser checks total **98 unique passed affected cases**. Three owned disposable PostgreSQL service-test databases were cleaned up, and final browser cleanup confirms zero Phase 4 disposable databases remain. The guarded browser run lasted approximately 1.5 minutes including isolated safe production build/startup. Final E2E scoped lint passes. The existing local PostgreSQL prerequisite was restored before rerunning. No production data or credentials are used for these tests.

The desktop and phone journey verifies Admin read-only Draft/Proposed/Published plans, recorded assignment skills, coverage handoffs and shared instructions; Employee exclusion from Draft and current Published Agenda; and Super Admin create/propose/return/publish/revise/remove. Obsolete coverage-test labels found during interim attempts were corrected before the final-source passing run; earlier attempts are not counted as successful evidence.

Seven final screenshots are retained locally in ignored `test-results/admin-schedule-access-amendment/`: `desktop-admin-draft.png`, `desktop-admin-draft-details.png`, `desktop-admin-proposed.png`, `desktop-admin-published.png`, `mobile-admin-draft.png`, `mobile-admin-proposed.png`, and `mobile-admin-published.png`. They contain only fictional guarded-test data.

The 4.7 writer-boundary amendment is `COMPLETED`; the tracker restores Phase 4 to 8/12 completed sub-phases (67%) while preserving the separate retained-history assignment-removal findings at 4.6/4.10/4.12 and deferred assignment types at 4.5. This amendment does not close full Phase 4 or general production readiness.

## Source and production delivery

[The release receipt](evidence/admin-schedule-access-2026-10-09/production-release.json) verifies:

| Check | Actual result |
|---|---|
| Application source | `955fb4a88e26014fd19bc90a57323f97cf27eaf0`, pushed to `origin/main` |
| Vercel target | Production project `prj_JvFv2V2vKKmAqfBOySS8FsZ1aZjy` |
| Ready deployment | `dpl_7hs93EV73qh7JsDNaHSpJXhheJr8`, exact application source |
| Canonical alias | [ScopeIs application](https://scopeis-team-management-system.vercel.app/), assignment verified `2026-10-09T10:05:14.038Z` (14:05 Dubai) |
| Live anonymous smoke | 11/11 passed at `2026-10-09T10:05:56.321Z` (14:05 Dubai) |
| Production state changes | No migration, database write, environment/account/credential change or seed |

The live checks cover normal sign-in availability; login redirects for protected Schedule, Tickets, Home and Profile pages; ticket/detail/private-file API refusals with private no-store/no-sniff headers; and disabled mock login. The initial smoke helper omitted the required Origin header on POST and correctly received 403; the helper supplied the ordinary same-origin header before the final 11/11 run. No application fix was required for that refusal.

The **98 local signed-in/permission/component cases** and **11 production anonymous checks** are separate evidence. Ordinary authenticated production Admin/Super Admin/Employee and private-file journeys are not certified by these anonymous checks; no credentials were reset or bypassed. Earlier releases remain historical. The broader UI clarity recommendations remain proposed, not an implemented redesign. A later documentation-only closure commit requires its own source/deployment verification; it is not inferred from this application release.
