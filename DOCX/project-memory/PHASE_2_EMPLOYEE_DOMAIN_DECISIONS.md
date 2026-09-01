# Phase 2 Employee Domain Decisions

This record preserves confirmed employee-domain decisions and the existing backend boundary. Under the superseding journey-first roadmap, Phase 2 is the employee-management journey; system role, designation, skill, team, and descriptive arrangement label remain independent concepts. No employment-type, scheduling, coverage, map, leave, client, project, or Ticket behavior is introduced.

Super Admin manages employee lifecycle, roles, designations, skills, labels, and evidence review globally. Admin reads workforce capability metadata only within server-enforced assigned scope and cannot administer global catalogues or another employee profile. Employees may change only their own permitted work contact and professional content; they cannot change role, scope, manager, designation, team, active status, or protected home data.

The R1 core service certification confirms that the employee-editable persisted fields are `workEmail`, `workPhone`, and `professionalSummary`; all other `employee_profiles` fields are management-controlled. Employee self-mutation of `employee_skills` remains denied until an explicit policy authorizes it. `default_work_location` is withheld from scoped Admin projections. Assignment labels remain descriptive catalogue-only records: there is no employee-label association in the certified schema and no label may influence authorization or operational availability.

Skills support multiple records and optional free-text proficiency/experience; no fixed scale or automatic staffing rule exists. Certifications and other evidence save immediately. `reviewed` and `verified` are informational states, never approval gates.

Employee files use private Vercel Blob access behind server authorization. PostgreSQL stores metadata only; generated keys, conservative type/size validation, and repeated ownership checks protect upload, read, and archive actions. Browser responses never include credentials.

Employee-management notes are author-private or shared upward. Subjects never see notes about themselves, and peer Admins do not gain access through a shared scope. Note content never enters audit metadata.

Production uses only the existing Vercel Production configuration. Temporary fictional mock authentication is permitted only when `MOCK_AUTH_ENABLED=true`; disabling that flag makes mock login unavailable in every environment. The fixture seed is insert-only and, in Production, requires that same explicit flag; it creates only the five fictional mock personas and the two Admin team-scope grants. It is not real authentication and must be replaced by an approved identity provider before real data is entered. Neon is on the Free plan: before real employee, HR, certification, portfolio, or operational data is entered, backup and recovery policy must be explicitly established and verified. Production is never a test or seed target except for this expressly authorized fictional fixture bootstrap. Later journey phases remain deferred.

Certification, portfolio, CV, file, and employee-management-note structures are preserved but excluded from the Phase 2 employee-management journey. Their implementation belongs to the later evidence/files and notes/discussions journeys in the authoritative roadmap.

## Database authority and migration adoption

The TypeScript Drizzle schema is the authoritative runtime model. Committed SQL migrations are immutable historical transitions, `_journal.json` is the ordering record, and `src/db/migrations/meta/adoption-fingerprints.json` pins exact migration hashes and PostgreSQL structural fingerprints. Migration `0001` is valid and remains unchanged; the former defect was missing runtime schema definitions.

Fresh databases use the normal migrator. Ledgerless databases may adopt only an exact migration fingerprint and exact installed Drizzle hash/timestamp format. Partial schemas, altered constraints or indexes, extra objects, changed migration bytes, invalid journal order, and ledger/schema disagreement are State E and fail without mutation. Production adoption requires backup/restore proof and explicit confirmation; it was not performed during local reconciliation.
