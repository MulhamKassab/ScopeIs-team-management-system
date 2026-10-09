# Company ticket collaboration amendment — 9 October 2026

**Local implementation/verification: `COMPLETED`. Source and production delivery: `IN_PROGRESS`.**

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

Verify creation and multiple assignment by all three roles, creator participant changes, company-wide person inclusion, assignee work, observer read-only access, nonparticipant privacy, revocation, inactive-user refusal, stale changes and transactional audit/notifications. Verify Workspace/Dashboards/Tickets navigation and retained Employee/manager tools at desktop and phone sizes. Existing private-file and workforce permission regressions remain part of the affected boundary.

Confirmed local amendment checks:

| Gate | Result | Evidence boundary |
|---|---|---|
| Focused unit/component checks | `PASS` — 47 | 25 unit, 9 workspace component and 13 detail component cases. |
| Ticket/private-file service integration | `PASS` — 26 | Two owned disposable PostgreSQL databases; both dropped after verification. |
| Updated real HTTP certification | `PASS` — 21 | All-role unenrolled creation, minimal directory, company-wide multiple assignment, read-only observers, file revocation and no automatic membership grants; cleanup completed with zero failures. |
| Isolated production build and TypeScript | `PASS` | Guarded HTTP runner build/typecheck and separate TypeScript check. |
| ESLint | `PASS` | Scoped checks and full repository ESLint completed with exit 0. |
| Scenario manifest registration | `PASS` | 83 scenarios (82 automated, one manual), all 88 registered test files covered, 39 protected routes. TKT descriptions updated; evidence registration unchanged. |
| Whitespace | `PASS` | `git diff --check` at the metadata update; final source closure still requires the current check. |
| Desktop/phone journeys | `PASS` — 12 | Six journeys at 1440px and the same six at 390px, using ordinary fictional credential forms. The fresh full run passed in 1.3 minutes; one owned database was created/dropped, with zero retained resources. Owned server, build and private test bytes were removed. |
| Manual local walkthrough | `PASS` | Current Employee session follows Workspace → Dashboard → Tickets; two assignees and an included person can be selected, search retains the counts, and the unsaved form was closed without writes. Desktop/phone fictional evidence was visually reviewed with no overflow. |
| Source delivery and production verification | `IN_PROGRESS` | No amendment push, Ready deployment or canonical smoke outcome recorded yet. |

The canonical scenario manifest and human catalogue retain TKT-01–12 IDs, requirement references, evidence files and runner registration. Their descriptions now distinguish participant/session revocation from workspace membership removal: existing ticket participation survives membership removal; scoped container supervision and current participant grants remain enforced. Registration is evidence mapping, not a full-system-lock passing result.

The 106 scoped automated cases above are combined affected-boundary evidence, not a new full-system-lock result. Chrome desktop/phone emulation does not certify physical devices or every browser. No schema change or migration is required. Amendment source/whitespace closure, push, Ready/canonical assignment and live smoke remain pending actual delivery receipts; authenticated live role/private-byte certification is not inferred from local journeys. The session's existing authorization to update the deployed application continues. Deferred daily work, flowcharts, cost/PDF reports and workforce handoffs remain outside scope; full Phase 12 remains `PARTIAL` at 4/9.

## Local visual evidence

| View | Hierarchy | Multiple-person picker | Ticket detail |
|---|---|---|---|
| Desktop | [Workspace/Dashboards/Tickets](evidence/company-ticket-collaboration-2026-10-09/desktop-hierarchy.png) | [Assignees and included people](evidence/company-ticket-collaboration-2026-10-09/desktop-people.png) | [Ticket detail](evidence/company-ticket-collaboration-2026-10-09/desktop-detail.png) |
| Phone | [Workspace/Dashboards/Tickets](evidence/company-ticket-collaboration-2026-10-09/mobile-hierarchy.png) | [Assignees and included people](evidence/company-ticket-collaboration-2026-10-09/mobile-people.png) | [Ticket detail](evidence/company-ticket-collaboration-2026-10-09/mobile-detail.png) |
