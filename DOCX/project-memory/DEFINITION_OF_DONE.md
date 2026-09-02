# Definition of Done

## Phase 5 — Leave and availability

The Phase 5 journey is complete only when an Employee can submit and cancel their own Pending annual-leave request; Super Admin can privately review balance and Published-schedule impact, decide it, and the Employee receives the persisted notification/result.

- Additive PostgreSQL migration, immutable ledger/manifest, runtime schema parity, indexes, constraints, and version checks are verified.
- The 22-day global Dubai-calendar-year Monday–Friday rule, Approved-only consumption, approval-time recheck, and safe allowance reduction rule are server enforced.
- Server-side privacy/role/scope rules protect reasons, responses, balances, decision controls, and Admin’s narrow TEAM-based Approved-unavailability projection.
- Approved leave is enforced by Phase 4 schedule create/edit/propose/publish validation; it does not mutate Published work.
- Audit and required notification writes share the mutation transaction; stale writes and concurrent approvals fail safely.
- Targeted unit, PostgreSQL integration, migration, component, desktop/mobile Playwright, typecheck, targeted lint, build, diff, migration/seed/dev smoke, and documented manual walkthrough evidence are recorded.
- The Phase report, tracker, status log, context, index, and Phase decision record are updated; unrelated user-owned work is neither altered nor staged.
