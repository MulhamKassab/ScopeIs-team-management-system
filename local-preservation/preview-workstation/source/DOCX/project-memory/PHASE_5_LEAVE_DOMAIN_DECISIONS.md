# Phase 5 Leave Domain Decisions

Phase 5 implements annual leave only. A global, Super-Admin-managed allowance defaults to 22 working days per `Asia/Dubai` calendar year. Monday–Friday consume balance; Saturday/Sunday do not. Holidays, work patterns, proration, carry-over, per-employee entitlements, payroll, and attendance are not modeled.

Requests are inclusive full-date ranges and persist `PENDING`, `APPROVED`, `REJECTED`, or `CANCELLED`. Employees create and cancel only their own Pending requests. Super Admin alone approves or rejects Pending requests; rejection has an employee-visible response. Reasons and responses are private to the employee and Super Admin. Admin sees only identity and Approved unavailable dates for Employees made visible by explicit `TEAM` scope.

Approved leave is unavailability for every calendar date in its range. Approval is blocked by current Published overlapping assignments; Draft/Proposed context is never shown to Employees and is revalidated by Phase 4 schedule create/edit/propose/publish paths. Leave never changes or reassigns a Published assignment. Employee-scoped advisory locks plus the allowance row lock serialize active-overlap, balance, and schedule-integrity decisions. Audit metadata excludes private text; required notification and audit writes remain transactional.
