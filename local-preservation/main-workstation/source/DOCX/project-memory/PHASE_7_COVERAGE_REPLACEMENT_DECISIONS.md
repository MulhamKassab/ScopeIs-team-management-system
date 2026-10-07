# Phase 7 — Coverage and replacement decisions

Phase 7 reuses the Phase 3 `staffing_requirements` records as independent Client, Project, and Location rules. Counts are evaluated per rule against same-date, same-interval assignment context in `Asia/Dubai`; they are not summed. A recorded active skill, active employee, absence of Approved leave, and no time overlap are the only candidate facts used. Assignment-specific skill requirements can create a qualification warning but never a count rule.

Gaps are explainable and non-blocking. They do not assert sufficient coverage, candidate ranking, certification eligibility, replacement availability, or a factual capability judgment. There is no coverage override or special override reason.

An Admin with both operational authority and explicit TEAM visibility can request `REPLACE_ASSIGNMENT` or, only for a count gap, `ADD_COVERAGE_ASSIGNMENT`. Super Admin alone decides. An approved Draft request applies to Draft; Proposed is returned to Draft; current Published creates an immutable Draft revision. No request mutates Published work in place or auto-publishes. Notifications go to active Super Admins on request and the requester on decision; affected Employees use only normal `schedule.published` notification on later publication.

## Confirmed conflict integrity — 2026-10-06

The user explicitly required coverage, replacements and additional support to work together without overlapping or conflicting effects.

- Replacement changes the person on an existing assignment; additional support creates a separate assignment and preserves the original person. Neither can select that original person as their own replacement or extra support.
- Requests and approvals serialize on the effective schedule period. Gap counts, candidate facts and permissions are re-read inside the decision transaction; independent rules do not permit two approvals to fill the same now-resolved shortage.
- An unchanged copy in the existing Draft/Proposed revision is the effective planning anchor for a current Published assignment. Further compatible changes reuse this revision. A changed person, date, time, project, site or instruction, an edited requested Draft assignment, or a superseded source refuses an old approval with a clear current-plan message. An outdated request can still be declined.
- Only one pending replacement may target the same logical assignment, regardless of which gap prompted it. Only one pending support request may target a staffing rule's same-date, same-interval shortage across the Published/Draft copies. Approve or decline that request before requesting the next remaining person. A pending request alone never books a person or reserves staffing capacity.
- Manual timetable edits, coverage effects, proposal and publication share the same employee/date overlap checks and locks across clients and projects. Adjacent intervals are permitted; overlapping intervals for one employee are refused. Approved leave remains blocking. Lock order is overlap before leave; an existing editable revision is locked without holding its Published parent in the opposite order to publication.
- Rejection and every failed approval leave assignments, lifecycle state, audit/notifications and request status intact through transactional rollback. Existing role, scope, qualification, privacy and separate-publication boundaries remain unchanged. No schema or production data migration is required.
