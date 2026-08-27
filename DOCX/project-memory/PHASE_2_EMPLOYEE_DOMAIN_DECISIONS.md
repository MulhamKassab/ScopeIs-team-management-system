# Phase 2 Employee Domain Decisions

Phase 2 models every worker as an internal employee. System role, designation, skill, team, and descriptive arrangement label are independent concepts. No employment-type, scheduling, coverage, map, leave, client, project, or Ticket behavior is introduced.

Super Admin manages employee lifecycle, roles, designations, skills, labels, and evidence review globally. Admin reads workforce capability metadata only within server-enforced assigned scope and cannot administer global catalogues or another employee profile. Employees may change only their own permitted work contact and professional content; they cannot change role, scope, manager, designation, team, active status, or protected home data.

Skills support multiple records and optional free-text proficiency/experience; no fixed scale or automatic staffing rule exists. Certifications and other evidence save immediately. `reviewed` and `verified` are informational states, never approval gates.

Employee files use private Vercel Blob access behind server authorization. PostgreSQL stores metadata only; generated keys, conservative type/size validation, and repeated ownership checks protect upload, read, and archive actions. Browser responses never include credentials.

Employee-management notes are author-private or shared upward. Subjects never see notes about themselves, and peer Admins do not gain access through a shared scope. Note content never enters audit metadata.

Production uses only the existing Vercel Production configuration. Temporary fictional mock authentication is permitted only when `MOCK_AUTH_ENABLED=true`; disabling that flag makes mock login unavailable in every environment. It is not real authentication and must be replaced by an approved identity provider before real data is entered. Neon is on the Free plan: before real employee, HR, certification, portfolio, or operational data is entered, backup and recovery policy must be explicitly established and verified. Production is never a test or seed target. Phase 3–9 remain deferred.
