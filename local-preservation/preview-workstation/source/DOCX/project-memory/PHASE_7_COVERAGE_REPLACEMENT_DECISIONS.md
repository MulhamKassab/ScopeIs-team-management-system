# Phase 7 — Coverage and replacement decisions

Phase 7 reuses the Phase 3 `staffing_requirements` records as independent Client, Project, and Location rules. Counts are evaluated per rule against same-date, same-interval assignment context in `Asia/Dubai`; they are not summed. A recorded active skill, active employee, absence of Approved leave, and no time overlap are the only candidate facts used. Assignment-specific skill requirements can create a qualification warning but never a count rule.

Gaps are explainable and non-blocking. They do not assert sufficient coverage, candidate ranking, certification eligibility, replacement availability, or a factual capability judgment. There is no coverage override or special override reason.

An Admin with both operational authority and explicit TEAM visibility can request `REPLACE_ASSIGNMENT` or, only for a count gap, `ADD_COVERAGE_ASSIGNMENT`. Super Admin alone decides. An approved Draft request applies to Draft; Proposed is returned to Draft; current Published creates an immutable Draft revision. No request mutates Published work in place or auto-publishes. Notifications go to active Super Admins on request and the requester on decision; affected Employees use only normal `schedule.published` notification on later publication.
