# Project Context

ScopeIs Team Management System is a documentation-first workforce planning product for an internal engineering team of approximately 15-20 people. It will help managers understand skills, assignments, availability, clients, projects, locations, leave, coverage, and replacement options across future weeks and months.

All employees are internal. Labels such as "Outsourced to Client" describe an assignment arrangement, never an employment type and never a source of business logic. Actual dates, times, assignments, skills, locations, approved leave, and coverage rules determine availability and conflicts.

The confirmed system roles are Super Admin, Admin, and Employee; roles are independent of job designations. Only the Super Admin/team manager publishes schedules and approves or rejects leave. Admins may draft schedules and request replacements within their scope, but do not publish schedules or advise on leave decisions. Employees see only published schedules. The management map is static planning based on stored data, not GPS or live tracking.

Canonical detailed references are indexed in [`DOCX/INDEX.md`](DOCX/INDEX.md). Before implementation, read [`DOCX/project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md`](DOCX/project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md) for the approved architecture and its change conditions. The existing Ticket System is a future Phase 12 integration candidate, not an architectural base.

The former module-first roadmap is superseded by the journey-first roadmap in [`DOCX/project-memory/IMPLEMENTATION_ROADMAP.md`](DOCX/project-memory/IMPLEMENTATION_ROADMAP.md). Phase 0 discovery and technical direction are `COMPLETED`; Phase 1 is `COMPLETED_IN_NARROW_FOUNDATION_SCOPE`, not a usable workforce-management product. Existing verified employee profile, catalogue, and employee-skill backend services are preserved, while current employee work is approximately 25–35% complete and has no end-to-end workforce journey. Phase 2 — Employee management journey is `NEXT`. Do not expand incomplete evidence, file, certification, portfolio, CV, or management-note structures before their designated later journeys. Production authentication, database state, and deployment remain uncertified.

Git custody was established on 2026-08-27: [`origin/main`](https://github.com/MulhamKassab/ScopeIs-team-management-system/tree/main) contains initial commit `6e0c0046aef366115ec90caf394f5950f7f043bb`. No deployment occurred.
