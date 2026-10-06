# Persistent company demo — 2026-10-06

## Purpose and isolation

The product owner approved restoring a full fictional company demonstration aligned with the currently implemented journeys. Its target is a separate Vercel project, `scopeis-company-demo`, and the separate Neon database `scopeis_company_demo`. The dedicated application role is `scopeis_company_demo_owner`; it cannot read the original production `neondb.users` table. The original production workspace, local demo database, prototype, Preview checkout and existing recovery branch are preserved.

The first provisioning attempt created an unused `scopeis_demo_owner` role but no database; Neon refused assigning another role as database owner and subsequently refused altering that role. No business records were changed. The completed database remains owned by the existing provider owner; the dedicated application role receives CONNECT/CREATE on the demo database and USAGE/CREATE on its public schema. It owns its migrated tables and migration ledger. The unused role receives no additional grants and no app configuration uses it.

## Dataset

Base date: 2026-10-06, Asia/Dubai. Eighteen profiles (17 active, one inactive); five signable established personas; fifteen skills and 51 recorded employee-skill facts; six clients; twelve projects; six fictional sites; nineteen periods and 57 assignments; six staffing rules and 21 assignment requirements; four leave requests; two actionable pending replacement/coverage requests; seventy evidence records across all five evidence kinds; shared notes with six historical revisions; fifteen private/shared-upward management notes; two participant-only discussion threads and four messages.

Previous/current Published months and upcoming Draft/Proposed work are distinct. A current Published period also has an immutable predecessor-linked Draft revision. No approved-leave or scheduling overlap conflict exists. Required recorded-skill warnings and staffing count gaps remain explainable and non-blocking. Evidence includes valid, expired and no-expiry certifications, and unreviewed/reviewed/verified states; it does not confer skill or coverage eligibility.

The separate private Vercel Blob store is `scopeis-company-demo-evidence` (`store_IjDiwdoA1hsd9ydX`), connected only to the demo project's Production environment. Cora and Dan each receive a real fictional PDF CV and supporting document through the existing owner upload service; metadata is not seeded for nonexistent objects. File upload/preview/download retain normal ownership checks and no public URLs are introduced.

## Verification recorded before publishing

- Complete immutable 14-migration ledger: fresh State A to State D, exact schema fingerprint `094ef163ef273a2e693bf878d5a1228b9e5b38689690b8b2c0cb09680e1f706b`.
- Explicit target refusal, existing-workspace refusal, dry-run rollback, injected failure rollback and repeat-run preservation of edits and credentials.
- Five profile/dashboard service journeys, real application KDF verification, correct roles and independent Admin scopes.
- Six global current-date map assignments, four scoped Ava assignments with coarse coordinates; Employee map refusal.
- Populated Published allocation and evidence reports; Admin leave reason redaction; management note and discussion participant privacy.
- Both nominations are eligible using live domain services. Coverage approval applies to Draft; replacement approval preserves Published work and creates a Draft revision. These actions were tested only in a disposable loopback database.
- Lint, 138 unit tests, 110 component tests and isolated safe production build passed.

## Repeatable operator workflow

Provide explicit private environment values for DATABASE_URL, AUTH_PASSWORD_PEPPER, SCOPEIS_DEMO_PASSWORD and SCOPEIS_DEMO_BASE_DATE. Run `npm run db:demo:dry-run`, then `npm run db:demo:initialize` on the dedicated target. Run `npm run db:demo:files` with the demo's private Blob configuration. No build or page request invokes initialization. Subsequent runs preserve existing business edits, passwords and attachments.

Run `npm run test:company-demo` to create, migrate, exercise and remove a separately named disposable loopback database; the configured persistent `.env.test` database is never reset. Initial fictional credentials are not committed to source, reports or build output. The demo flag defaults off and has no effect on original production unless explicitly configured there.

## Hosted delivery receipt

Pending final deployment and live route, file authorization and responsive verification. Complete this receipt only from observed results.
