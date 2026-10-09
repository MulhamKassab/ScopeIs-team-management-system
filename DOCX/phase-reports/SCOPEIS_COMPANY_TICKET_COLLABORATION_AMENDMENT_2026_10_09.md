# Company ticket collaboration amendment — 9 October 2026

**Local implementation/verification and bounded production delivery: `COMPLETED`. Authenticated live role/private-file journeys remain unverified.**

After the prior Company core release, the product owner requested that all company users can create tickets, mention/include any company person and assign multiple people. They confirmed the hierarchy **Workspace → Dashboards → Tickets**: one workspace contains many dashboards, and one dashboard contains many tickets.

This explicitly supersedes the original manager-only participant administration and Employee creation without participants. The earlier [local delivery](SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md) and [production release](SCOPEIS_COMPANY_TICKETS_PRODUCTION_2026_10_09.md) remain historical evidence for their own source and policies; they do not certify this amendment.

## Confirmed contract

- “All company users” means active authenticated company accounts, including Super Admin, Admin and Employee. It does not grant anonymous access.
- Ticket creators can choose multiple active company people as assignees and mention/include active company people. Assignees can work on the ticket; included/mentioned observers remain read-only.
- Included/mentioned people receive an in-app notification. Mentioning someone grants read-only ticket participation, not edit permission or an external message.
- Participant choice is company-wide rather than limited to the creator's team or previously available Employee choices. Ticket access remains participation-based; the company people picker is not permission to read workforce management records.
- **Dashboard** is the product term for the existing ticket-board container. This does not require a database/table/type rename or a new manager Home route. The existing management dashboard remains a separate application surface.
- Workforce roles, Admin scope, schedule publication, leave decisions, private-file authorization, audit and notification boundaries remain authoritative. Ticket collaboration does not widen unrelated workforce capabilities.

## Confirmed access mechanics

All active authenticated company users can see Published dashboard routing metadata and a minimal active-company people picker, and can create a ticket without workspace enrollment. Own, assigned or mentioned participation grants ticket-only access independently of workspace membership or Admin workforce scope. Unrelated ticket contents remain hidden; the picker does not expose management profiles or private workforce facts.

Creators can manage their own ticket's multiple assignees and included observers. Workspace/dashboard supervision retains the existing manager TEAM, linked Client/Project and membership checks. No participant action automatically grants workspace membership. Current activity, session, participant grants and Draft/Published/Archived lifecycle checks remain enforced. The hierarchy reuses existing board records as Dashboard containers; no database migration or rename is needed.

## Verification

The affected checks cover creation and multiple assignment by all three roles, creator participant changes, company-wide inclusion, assignee work, observer read-only access, nonparticipant privacy, revocation, inactive-user refusal, stale changes and transactional audit/notifications. Workspace/Dashboards/Tickets navigation and retained Employee/manager tools are verified at desktop and phone sizes. Private-file and workforce permission regressions remain part of this bounded evidence.

Confirmed local amendment checks:

| Gate | Result | Evidence boundary |
|---|---|---|
| Focused unit/component checks | `PASS` — 47 | 25 unit, 9 workspace component and 13 detail component cases. |
| Ticket/private-file service integration | `PASS` — 26 | Two owned disposable PostgreSQL databases; both dropped after verification. |
| Updated real HTTP certification | `PASS` — 21 | All-role unenrolled creation, minimal directory, company-wide multiple assignment, read-only observers, file revocation and no automatic membership grants; cleanup completed with zero failures. |
| Isolated production build and TypeScript | `PASS` | Guarded HTTP runner build/typecheck and separate TypeScript check. |
| ESLint | `PASS` | Scoped checks and full repository ESLint completed with exit 0. |
| Scenario manifest registration | `PASS` | 83 scenarios (82 automated, one manual), all 88 registered test files covered, 39 protected routes. TKT descriptions updated; evidence registration unchanged. |
| Whitespace | `PASS` | `git diff --check` passed for implementation/metadata and documentation closure. |
| Desktop/phone journeys | `PASS` — 12 | Six journeys at 1440px and the same six at 390px, using ordinary fictional credential forms. The fresh full run passed in 1.3 minutes; one owned database was created/dropped, with zero retained resources. Owned server, build and private test bytes were removed. |
| Manual local walkthrough | `PASS` | Current Employee session follows Workspace → Dashboard → Tickets; two assignees and an included person can be selected, search retains the counts, and the unsaved form was closed without writes. Desktop/phone fictional evidence was visually reviewed with no overflow. |
| Source delivery and production verification | `PASS` | Application `48e6c827320a649c01b38428a734f5d5f194b6b2` pushed to `origin/main`; Vercel Ready/canonical verified, followed by live anonymous smoke 10/10. |

The canonical scenario manifest and human catalogue retain TKT-01–12 IDs, requirement references, evidence files and runner registration. Their descriptions now distinguish participant/session revocation from workspace membership removal: existing ticket participation survives membership removal; scoped container supervision and current participant grants remain enforced. Registration is evidence mapping, not a full-system-lock passing result.

The 106 local scoped automated cases are combined affected-boundary evidence, not a new full-system-lock result. Chrome desktop/phone emulation does not certify physical devices or every browser. [The local receipt](evidence/company-ticket-collaboration-2026-10-09/verification.json) records checks, cleanup and source hashes. Deferred daily work, flowcharts, cost/PDF reports and workforce handoffs remain outside scope; full Phase 12 remains `PARTIAL` at 4/9, and general Phase 13 readiness is not certified.

## Production delivery

Application implementation `48e6c827320a649c01b38428a734f5d5f194b6b2` is pushed to `origin/main`. Vercel project `prj_JvFv2V2vKKmAqfBOySS8FsZ1aZjy` deployment `dpl_GqYFAUpCEuxPKADuDq8b4jPTS9We` was verified **Ready with canonical alias assigned at `2026-10-09T07:00:56.931Z`**. The immutable [application deployment](https://scopeis-team-management-system-k4of6a4cw-mu-ka7.vercel.app/) and canonical [ScopeIs application](https://scopeis-team-management-system.vercel.app/) identify this release. The safe provider/live receipt is [production-release.json](evidence/company-ticket-collaboration-2026-10-09/production-release.json).

Live anonymous smoke passed **10/10 at `2026-10-09T07:01:04.889Z`**: sign-in returns 200; Tickets, dashboard and profile redirect 307 to login; protected ticket API reads/commands/uploads refuse with 401, private no-store and `X-Content-Type-Options: nosniff`; mock login returns 404. This verifies public delivery and unauthenticated boundaries. Ordinary production credentials were unavailable, so signed-in Employee/manager workflows and private-file byte delivery remain unverified live. Their passing ordinary fictional credential journeys remain local evidence.

This amendment made no migration, environment or credential change, production seed or production database write. Its deployed application source is the SHA above; a later documentation-only closure commit/deployment does not replace that implementation identity and is recorded separately after verification. Bounded deployment is complete without certifying all Phase 12/13 or the authenticated live journeys.

## Local visual evidence

| View | Hierarchy | Multiple-person picker | Ticket detail |
|---|---|---|---|
| Desktop | [Workspace/Dashboards/Tickets](evidence/company-ticket-collaboration-2026-10-09/desktop-hierarchy.png) | [Assignees and included people](evidence/company-ticket-collaboration-2026-10-09/desktop-people.png) | [Ticket detail](evidence/company-ticket-collaboration-2026-10-09/desktop-detail.png) |
| Phone | [Workspace/Dashboards/Tickets](evidence/company-ticket-collaboration-2026-10-09/mobile-hierarchy.png) | [Assignees and included people](evidence/company-ticket-collaboration-2026-10-09/mobile-people.png) | [Ticket detail](evidence/company-ticket-collaboration-2026-10-09/mobile-detail.png) |
