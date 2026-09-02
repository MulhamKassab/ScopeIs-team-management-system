# SCOPEIS_PHASE_5_LEAVE_AND_AVAILABILITY_JOURNEY_R1

## Completion classification

**COMPLETED for the approved Phase 5 journey.** An Employee submits annual leave, Super Admin privately reviews the request, balance, and current Published-schedule impact, decides it, the Employee is notified, and Approved leave becomes a future scheduling integrity rule. No production access, migration, QA, deployment, coverage, replacement, skill fulfilment, maps, tickets, payroll, attendance, or travel work occurred.

## Git custody

- Repository: `/Users/mulhamkassab/Desktop/For Me/ScopeIs Team Management System`
- Starting branch/HEAD: `main` at `0c00b91e0613cbd7d98c8c5af5282a20da22e2a9`
- Upstream: `origin/main`, starting ahead/behind `0/0`
- Final custody target: a normal, non-force push of the reviewed Phase 5 commit from `main` to `origin/main`; the exact delivered commit and final ahead/behind result are recorded with this report's delivery.
- Pre-existing user-owned changes were preserved exactly: `README.md`, `package.json`, `playwright.config.ts`, `src/app/(protected)/[module]/page.tsx`, `src/app/api/auth/mock-login/route.ts`, `src/db/seed/index.ts`, `src/modules/auth/session-service.ts`, `src/server/http.ts`, `test/e2e/foundation.spec.ts`, `test/integration/foundation-postgres.test.ts`, `prototype/`, the Phase 1 runner scripts, and `test/route-certification/`.

## Decisions and implementation

Migration `0006_phase_5_leave_availability.sql` is additive and leaves historical migrations unchanged. It adds `leave_request_status`, versioned `leave_requests`, and a singleton versioned `leave_allowance_settings` record initialized at 22. Indexes support employee/status/date lookup and Pending-review lookup.

Allowance is global, Super-Admin-editable, and version protected. Balance is calculated in `Asia/Dubai` for the current calendar year. Monday–Friday inclusive dates consume entitlement; weekend dates do not. Only `APPROVED` requests consume balance. Pending requests do not reserve days; their projected remaining balance is displayed. Approval locks the allowance and employee request stream, then atomically rechecks balance. Reducing the allowance below any employee’s Approved current-year usage is rejected. Public holidays, alternative work patterns, part-time arrangements, carry-over, proration, contract rules, manual adjustments, per-employee allowance, payroll, and attendance are intentionally absent.

Lifecycle is `PENDING → APPROVED|REJECTED` or `PENDING → CANCELLED`. Employees create/cancel only their own Pending request; Super Admin alone decides Pending requests; rejection response is required. Terminal requests are not removed or silently changed.

| Actor | Permitted Phase 5 projection/action |
| --- | --- |
| Super Admin | All request details, private reason/response, balances, current Published impact, allowance update, approve/reject. Draft/Proposed work remains management-only and is never exposed to Employees. |
| Employee | Only own requests, private reason/response, balance, and safe impact outcome. |
| Admin | Explicit-TEAM-scoped employee identity plus Approved unavailable dates only. No reason, response, balance, Pending/Rejected/Cancelled history, allowance, or decision control. |

Operational CLIENT/PROJECT/LOCATION grants and relationship fields do not grant leave authority. Authorization is server-side.

Approved leave marks every inclusive calendar date unavailable. Super Admin sees a current Published-impact list with date/time, Client, Project, and Location context; approval is blocked until the immutable Phase 4 revision workflow resolves every conflict. Draft/Proposed work is not automatically changed and remains management-only. The existing scheduling service calls the leave availability guard during add/update/reference validation and period lifecycle validation, preventing conflicts from progressing through proposal/publication. Published schedules are never changed by leave.

Request create/cancel/decision/allowance update write sanitized audit records. Required generic persisted notifications are transactional: submission goes to active Super Admin recipients; decision goes to the requesting Employee. Metadata contains identifiers, dates/counts, numeric balance facts, impact count, and text-presence flags only.

## Verification evidence

All persistence checks used local loopback test databases only.

| Check | Result |
| --- | --- |
| `npm run db:migrate:test` | Passed; additive migration applied to the local test target. |
| `npm run test:migration` | Passed, 8/8; clean install, idempotence, ledger/schema/manifest drift protection. |
| `./node_modules/.bin/vitest run test/unit/phase5-leave-validation.test.ts` | Passed, 2/2; weekday/weekend count and strict lifecycle validation. |
| `node scripts/run-phase5-service-tests.mjs` | Passed, 3/3; PostgreSQL lifecycle, privacy, balance, Published-impact list/approval block/no Published mutation, schedule guard, cancellation/stale write, concurrent approval, allowance safety, and audit rollback evidence. |
| Targeted ESLint | Passed with `--max-warnings=0`. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed. |
| `node scripts/run-phase5-playwright.mjs` | Passed desktop and mobile Employee → Super Admin → Employee journey; mobile no-horizontal-overflow assertion passed. |
| `git diff --check` | Passed. |

The repository-wide `npm run lint` remains outside Phase 5: preserved `prototype/` work contains the known inherited lint failures. No prototype file was altered or staged.

### Non-blocking command history

| Command/result | Exact observed output or disposition | Safe resolution |
| --- | --- | --- |
| `tsx --env-file=.env.test src/db/seed/index.ts` | `zsh:1: command not found: tsx` | Used the repository-local executable: `./node_modules/.bin/tsx --env-file=.env.test src/db/seed/index.ts`; it passed and seeded five fictional personas. |
| Direct manual dev launch that sourced `.env.test` | `zsh:.:1: no such file or directory: .env.test`; the resulting local request returned HTTP `500`. A later request to that stopped port returned connection failure. | This was a shell launch-path issue, not a product assertion. The isolated local Playwright runner seeded the test database, started the app, and passed desktop/mobile journeys. |
| First `npm run typecheck` after generated-artifact inspection | `error TS2300: Duplicate identifier 'LayoutProps'.` in duplicate generated `.next/types/routes.d 2.ts` and `.next/types/root-params.d 2.ts`. | The duplicate generated copies were moved recoverably outside the repository; `npm run typecheck` then passed. |
| Initial unsafe-allowance test expectation | The test expected a reduction to `19` to fail, but the approved usage was exactly `19`; the service correctly accepted that non-negative balance. | Corrected the test to reduce to `18`; the expected `UNSAFE_ALLOWANCE_REDUCTION` rejection now passes. |
| `npm run db:migrate` using the ordinary local environment | `TypeError [ERR_INVALID_URL]: Invalid URL` because the local default environment has no usable `DATABASE_URL`. | `npm run db:migrate:test`, migration tests, seed, service tests, and E2E used only the configured loopback test database and passed. No production target was contacted. |

## Manual walkthrough

Using the fictional local fixtures: sign in as Cora, submit an inclusive leave range with optional private note, sign out, sign in as Nora, open Leave, review the balance and impact, approve/reject, then sign in as Cora and confirm the state/response. Ava’s Leave page shows only TEAM-visible Approved dates and identities.

## Changed-file inventory

Reviewed Phase 5 files:

- `DOCX/INDEX.md`; `DOCX/phase-reports/SCOPEIS_PHASE_5_LEAVE_AND_AVAILABILITY_JOURNEY_R1.md`; `DOCX/project-memory/DEFINITION_OF_DONE.md`; `DOCX/project-memory/IMPLEMENTATION_STATUS_LOG.md`; `DOCX/project-memory/IMPLEMENTATION_STATUS_TRACKER.md`; `DOCX/project-memory/PHASE_5_LEAVE_DOMAIN_DECISIONS.md`; `PROJECT_CONTEXT.md`.
- `scripts/phase2-migration-core.mjs`; `scripts/run-phase5-playwright.mjs`; `scripts/run-phase5-service-tests.mjs`; `playwright.phase5.config.ts`.
- `src/db/migrations/0006_phase_5_leave_availability.sql`; `src/db/migrations/meta/_journal.json`; `src/db/migrations/meta/adoption-fingerprints.json`; `src/db/schema/index.ts`.
- `src/modules/leave/actions.ts`; `src/modules/leave/date-rules.ts`; `src/modules/leave/domain-error.ts`; `src/modules/leave/forms.tsx`; `src/modules/leave/repositories.ts`; `src/modules/leave/service.ts`; `src/modules/leave/validation.ts`.
- `src/app/(protected)/leave/page.tsx`; `src/app/styles.css`; `src/modules/navigation/navigation.ts`; `src/modules/scheduling/service.ts`.
- `test/migration/phase2-database-foundation.test.ts`; `test/unit/phase5-leave-validation.test.ts`; `test/component/phase5-leave-forms.test.tsx`; `test/integration/phase5-leave-service.test.ts`; `test/e2e/phase5-leave.spec.ts`.

Preserved, excluded user-owned work: `README.md`, `package.json`, `playwright.config.ts`, `src/app/(protected)/[module]/page.tsx`, `src/app/api/auth/mock-login/route.ts`, `src/db/seed/index.ts`, `src/modules/auth/session-service.ts`, `src/server/http.ts`, `test/e2e/foundation.spec.ts`, `test/integration/foundation-postgres.test.ts`, `prototype/`, `scripts/remediate-r2-persistent-test-incident.mjs`, `scripts/run-phase1-integration-tests.mjs`, `scripts/run-phase1-playwright.mjs`, `scripts/run-phase1-route-certification.mjs`, `scripts/run-phase1-safe-build.mjs`, `scripts/start-phase1-test-server.mjs`, and `test/route-certification/`. No file in that inventory was staged for Phase 5.

## Known limitations

No coverage/replacement calculation, skill fulfilment, scarce-skill handling, map behavior, Ticket System integration, notification-centre redesign, external delivery, payroll, attendance, travel, production authentication, production migration, production QA, or deployment was started.
