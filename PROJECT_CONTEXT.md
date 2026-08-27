# Project Context

ScopeIs Team Management System is a documentation-first workforce planning product for an internal engineering team of approximately 15-20 people. It will help managers understand skills, assignments, availability, clients, projects, locations, leave, coverage, and replacement options across future weeks and months.

All employees are internal. Labels such as "Outsourced to Client" describe an assignment arrangement, never an employment type and never a source of business logic. Actual dates, times, assignments, skills, locations, approved leave, and coverage rules determine availability and conflicts.

The confirmed system roles are Super Admin, Admin, and Employee; roles are independent of job designations. Only the Super Admin/team manager publishes schedules and approves or rejects leave. Admins may draft schedules and request replacements within their scope, but do not publish schedules or advise on leave decisions. Employees see only published schedules. The management map is static planning based on stored data, not GPS or live tracking.

Canonical detailed references are indexed in [`DOCX/INDEX.md`](DOCX/INDEX.md). Before technical implementation, read [`DOCX/project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md`](DOCX/project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md) for the current recommended Phase 1 architecture and its change conditions. The project is currently in the foundation and documentation phase. No application code should be added until an implementation phase is explicitly authorized. The existing Ticket System is a future Phase 9 integration candidate, not an architectural base.

Phase 1 implementation was explicitly authorized and completed on 2026-08-27. Read [`DOCX/project-memory/UI_UX_FOUNDATION.md`](DOCX/project-memory/UI_UX_FOUNDATION.md) for the approved UI foundation and [`DOCX/phase-reports/PHASE_1_FOUNDATION_IMPLEMENTATION_REPORT.md`](DOCX/phase-reports/PHASE_1_FOUNDATION_IMPLEMENTATION_REPORT.md) for implementation and validation evidence. Later-phase product boundaries remain unchanged.
