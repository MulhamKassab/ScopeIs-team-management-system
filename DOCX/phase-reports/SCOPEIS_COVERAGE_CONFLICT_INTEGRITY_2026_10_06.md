# Coverage, support and timetable conflict integrity — 6 October 2026

The user required replacements, extra support and timetable work to coexist without overlapping or conflicting effects. The corrected baseline reproduced both duplicate pending requests and simultaneous approvals that overfilled one staffing shortage. The guarded disposable database was discarded after every run.

## Final behavior

- A replacement changes the person on an assignment. Support adds a different person and retains the original assignment. The original person is excluded from both candidate selection and direct approval.
- Duplicate pending replacements for one logical assignment are refused, including across different gap types and Published/Draft copies. Duplicate support requests for one staffing rule and interval are refused; review the pending request before requesting another remaining person.
- Creation and approval lock the effective period, then reread current gap counts, permissions and candidate facts. Independent rules cannot approve extra people after their shared shortage is already filled.
- Compatible changes reuse one existing editable revision. Support followed by replacement retains both effects. A request anchored to changed or superseded work is refused; the original Published plan and prior decisions remain intact. Outdated requests can still be declined.
- Manual edits, support, replacement, proposal and publication share employee/date overlap protection across clients and projects. Adjacent intervals are valid. Approved leave stays blocking. Overlap locks precede leave locks; the existing revision is locked without taking its Published parent in reverse publication order.
- Every failed approval rolls back its assignment, revision, decision, audit and notification writes. Schedule errors explain the conflict in the form. Nothing auto-publishes.

The [canonical coverage decisions](../project-memory/PHASE_7_COVERAGE_REPLACEMENT_DECISIONS.md) and [schedule decisions](../project-memory/PHASE_4_SCHEDULING_DOMAIN_DECISIONS.md) record the confirmed rules. Role, scope, participant-only privacy, non-blocking staffing guidance and separate publication remain unchanged. No schema, provider, authentication or production business-data mutation is introduced.

## Verification

All scoped checks passed on the final application source:

| Check | Result |
| --- | --- |
| TypeScript / ESLint / whitespace | Passed |
| Unit | 140 passed |
| Components | 120 passed |
| Coverage integration | 18 passed in each of three disposable runs |
| Scheduling integration | 9 passed |
| Leave integration | 6 passed |
| Collaboration / management-note integration | 26 passed |
| Coverage browser | 4 passed on desktop and mobile |
| Guarded safe production build | Passed through final browser runner |

The browser journey explicitly submits a duplicate request and an overlapping manual assignment, verifies both refusals, checks decision feedback, and keeps Employee access closed. Service tests cover concurrent independent-rule approvals, cross-client manual/coverage races, both support/replacement orders, one revision, old-work refusal, adjacent times, rollback and publication races. No full system-lock or physical-device certification is claimed.

[Verification receipt and frozen scoped file hashes](evidence/coverage-integrity-2026-10-06/verification.json) retain the corrected baseline failures and final results. Main push and canonical deployment verification are pending.
