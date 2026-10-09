# Company tickets — production release, 9 October 2026

**Status: `IN_PROGRESS`. Production deployment authorized; no migration or deployment completion claimed in this update.**

After the [completed local core delivery](SCOPEIS_COMPANY_TICKETS_LOCAL_2026_10_09.md), the product owner explicitly requested “deploy please.” This supersedes the original local-only boundary for the approved Company core under [the confirmed decisions](../project-memory/PHASE_12_COMPANY_TICKET_IMPLEMENTATION_DECISIONS.md). Earlier local and production reports retain their original dated scope and evidence.

The release preserves ScopeIs authentication, Super Admin/Admin/Employee boundaries, current scope/membership/participation checks, private storage, audit and notifications. Employees land on Tickets and retain Schedule, Vacations and My profile/own skills; managers retain existing tools. Daily work, flowcharts, cost/PDF reports, required-skill semantics and workforce handoffs remain outside the core. Full Phase 12 remains `PARTIAL`; this release does not certify general Phase 13 readiness.

## Verified release target

| Target | Verified identity |
| --- | --- |
| Canonical application | [scopeis-team-management-system.vercel.app](https://scopeis-team-management-system.vercel.app/) |
| Vercel project | `prj_JvFv2V2vKKmAqfBOySS8FsZ1aZjy` |
| Vercel team | `team_oIqsv7pRRT5ECXyf3WiIQLOf` |
| Release branch | `main` |
| Company PostgreSQL database | `scopeis_company_demo` |
| Neon project | `morning-flower-68935124` |
| Neon branch | `main`, `br-empty-fog-avl4wjxn` |

The existing protected recovery project remains preserved. Production credentials, connection URLs, tokens, private bytes and backup contents are excluded from this report.

The read-only preflight verified migration State D with 15 installed ledger rows and only `0015_company_tickets` pending. The reported pre-migration schema fingerprint is abbreviated here as `6b5170a…55380`; the full fingerprint belongs in the final safe verification receipt. At this update, backup/restore proof is active using PostgreSQL 18 tools and no production writes have occurred.

## Hosted upload compatibility

The Vercel release caps each ticket upload at 4 MiB to fit the hosted function payload boundary, while the local workflow retains its established 5 MiB limit. The server validates the environment-specific limit and bounded multipart body; the ticket-detail page receives that same limit and states it before upload. PDF/JPEG/PNG/DOCX signature validation, current ticket authorization and private download/archive behavior remain intact. The existing configured private storage provider was verified; production local storage remains prohibited.

After this compatibility change, 13 ticket-file unit cases and 11 ticket-detail component cases passed, and TypeScript passed. These are scoped preparation results, not production deployment or live file verification.

## Preservation and release checks

| Check | Current status | Evidence or remaining action |
| --- | --- | --- |
| User authorization | `COMPLETED` | Explicit 9 October “deploy please” request after local core delivery. |
| Exact Vercel/database target | `COMPLETED` | Verified identities above; current production schema is State D with only the additive ticket migration pending. |
| Private provider and hosted upload preparation | `COMPLETED` | Existing private provider configuration verified; 4 MiB hosted cap, UI limit propagation, 13 file unit/11 detail component cases and TypeScript passed. |
| Backup and independent restore proof | `IN_PROGRESS` | PostgreSQL 18 backup/restore work active. Record actual backup hash, restored schema/ledger/facts parity and recovery evidence before production migration. |
| Additive production migration | `VERIFICATION_PENDING` | Apply only `0015_company_tickets` after preservation proof; compare prior tables, facts, schema fingerprints and historical ledger rows. No production write claimed yet. |
| Final release source and build | `VERIFICATION_PENDING` | Record exact deployed source identity and build outcome. Earlier local evidence remains bounded to its source. |
| Vercel production deployment/alias | `VERIFICATION_PENDING` | Record deployment ID, ready state and canonical alias verification after the release. |
| Live role and ticket/file verification | `VERIFICATION_PENDING` | Verify authenticated Employee/manager landing and permitted routes, expected refusals, private files and existing management tools against the canonical application. |
| Final preservation and release receipt | `VERIFICATION_PENDING` | Record final State D/ledger/schema facts, retained recovery resources, live results and material limitations. |

The completed local delivery report is not rewritten as production evidence. No production migration, deployment ID, live pass count or release-completion date is recorded until its actual verification result is available.
