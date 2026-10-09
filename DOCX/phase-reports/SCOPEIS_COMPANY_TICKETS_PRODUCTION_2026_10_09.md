# Company tickets — production release, 9 October 2026

**Status: `COMPLETED` for the authorized production migration and deployment. Authenticated live Employee/manager/private-file journey certification remains `VERIFICATION_PENDING`.**

The Company core is deployed at [the canonical ScopeIs application](https://scopeis-team-management-system.vercel.app/). Application implementation `4307413360c4f8bd7ec62016cc962ddbcf13e4f9` is Ready in deployment `dpl_8y2AJ45xyjHtFPK2bKhZhnFWwrES`; canonical assignment was verified at `2026-10-09T06:04:23Z` and the final anonymous production smoke passed 10/10 at `06:04:29Z`. This is a bounded deployment result, not a claim of authenticated live workflow or general Phase 13 certification.

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

The read-only preflight verified migration State D with 15 installed ledger rows and only `0015_company_tickets` pending, with schema fingerprint `6b5170a137590eac3e51447fada3ffe31da2f05aafd8574526e5073f16d55380`. The earlier backup was approximately eight hours eleven minutes old, exceeding the six-hour freshness bound, and was replaced before migration. The fresh backup, independent restore, production migration and preservation checks below passed.

Production configuration was reread as `APP_ENV=production`, `MOCK_AUTH_ENABLED=false`, `EVIDENCE_STORAGE_MODE=vercel` and `SCOPEIS_DEMO_WORKSPACE=true`. No environment change was made for this release. These configuration facts do not constitute a live private-file round-trip test.

## Hosted upload compatibility

The Vercel release caps each ticket upload at 4 MiB to fit the hosted function payload boundary, while the local workflow retains its established 5 MiB limit. The server validates the environment-specific limit and bounded multipart body; the ticket-detail page receives that same limit and states it before upload. PDF/JPEG/PNG/DOCX signature validation, current ticket authorization and private download/archive behavior remain intact. The existing configured private storage provider was verified; production local storage remains prohibited.

After this compatibility change, 13 ticket-file unit cases and 11 ticket-detail component cases passed. Final release preparation also passed repository ESLint, TypeScript and the isolated hosted-cap build. The combined unit/component set covers 324 unique cases, including four additional hosted-limit checks. These are local release-preparation results, not production deployment or live file verification.

## Release candidate and restored-database proof

Implementation commit `6d714f6e0b8e4ea281daf8a095bcb3ef14627da7` was pushed to `origin/main` through the repository owner's authorized account. Vercel deployment `dpl_7sdKY6YCMPVzRTt7Br5PzXSB6HTG`, at `scopeis-team-management-system-ka2222gl5-mu-ka7.vercel.app`, reached Ready and its canonical alias was verified by API at `2026-10-09T06:01:36Z`. Its actual Vercel Turbopack build and TypeScript check passed, including all ticket routes.

The first anonymous production smoke passed 8 of 10 cases. Authentication/status/cache checks passed, but the two file API JSON error responses omitted `X-Content-Type-Options: nosniff`. Both file routes were corrected to use the shared ticket error response and no-sniff metadata headers. Scoped lint and TypeScript passed after the repair. [Correction commit `4307413360c4f8bd7ec62016cc962ddbcf13e4f9`](https://github.com/MulhamKassab/ScopeIs-team-management-system/commit/4307413360c4f8bd7ec62016cc962ddbcf13e4f9) was pushed to `origin/main` and deployed. The same ten-case smoke then passed 10/10 on the final release. These are ten unique checks with an initial failure and rerun, not an eighteen- or twenty-case passing total.

Final application deployment `dpl_8y2AJ45xyjHtFPK2bKhZhnFWwrES` reached Ready for implementation `4307413360c4f8bd7ec62016cc962ddbcf13e4f9` at the [immutable deployment](https://scopeis-team-management-system-bkv3pmvbj-mu-ka7.vercel.app/). The canonical alias was assigned and verified at `06:04:23Z`. A later documentation-only closure commit, if made, has its own source/deployment receipt; no closure SHA is inferred here.

The corrected fixed additive upgrade in `scripts/company-ticket-upgrade-core.mjs` was tested against an independently restored production snapshot. That restored database reached canonical State D with 16 migration rows and 41 tables, with schema fingerprint `05604ebb77f36d850f12cc758da3c40b4562c8ef42e26634a798c98831ffc04d`. All 34 prior table schemas, all 579 prior facts and all 15 historical migration rows were preserved. A second call returned already current, verifying idempotent refusal to reapply. This is evidence for the restored test target; it is not evidence that the production migration has occurred.

## Verified production preservation and migration

A fresh PostgreSQL 18 archive was captured at `2026-10-09T05:56:24Z`, with 170,350 bytes and SHA-256 `8477161b5137d06bbef3041638a89f0dd600c8971e165df1fa292f351db2d27c`. Independent restore and migration trial passed before the production operation. The owned PostgreSQL 18 test resources were cleaned up. The prior protected recovery project remains preserved.

The fixed additive operation applied canonical `0015_company_tickets` to the verified production Company database at approximately `05:59Z`. Its SQL SHA-256 is `4c329595f8939836a0cac9d00d0fab5a904e80e0e5c5a78b52de8cac44d50276`. Post-commit production inspection verified State D with 16 ledger rows and 41 tables, with fingerprint `05604ebb77f36d850f12cc758da3c40b4562c8ef42e26634a798c98831ffc04d`. All 34 prior table schemas, all 579 prior facts and all 15 historical migration rows were preserved.

The private receipt is retained as `production-company-ticket-upgrade-receipt.json` under the owned `backup-2026-10-09T05-56-24-136Z_6a191aef-c` backup folder. Backup contents, production credentials and connection URLs are excluded from repository documentation. This database preservation result is separate from the verified Ready deployment and anonymous smoke; authenticated live journey certification remains pending.

## Preservation and release checks

| Check | Current status | Evidence or remaining action |
| --- | --- | --- |
| User authorization | `COMPLETED` | Explicit 9 October “deploy please” request after local core delivery. |
| Exact Vercel/database target | `COMPLETED` | Verified identities above; production configuration reread without environment changes. |
| Private provider and hosted upload preparation | `COMPLETED` | Existing private provider configuration verified; 4 MiB hosted cap and UI limit propagation. Scoped 13 file-unit/11 detail-component checks passed; final local preparation also passed TypeScript, ESLint, isolated build and the combined 324 unique unit/component cases. |
| Restored-target upgrade rehearsal | `COMPLETED` | State D/16/41 and fingerprint above; all 34 prior schemas, 579 prior facts and 15 historical ledger rows preserved; second call already current. This is not a production application result. |
| Fresh production backup and independent restore proof | `COMPLETED` | Fresh `05:56:24Z` archive, 170,350 bytes and SHA-256 above; independent restore/trial and owned PostgreSQL 18 cleanup passed. Prior protected recovery project preserved. |
| Additive production migration | `COMPLETED` | Canonical `0015_company_tickets` applied at approximately `05:59Z`; production State D/16/41 and fingerprint above. All 34 prior schemas, 579 facts and 15 historical ledger rows preserved. |
| Release source and local build | `COMPLETED` | Implementation `6d714f6` and header repair `4307413360c4f8bd7ec62016cc962ddbcf13e4f9` pushed to `origin/main`. Initial isolated build/ESLint/TypeScript passed; post-repair scoped lint and TypeScript passed. |
| Final Vercel production deployment/alias | `COMPLETED` | Application `4307413` Ready in `dpl_8y2AJ45xyjHtFPK2bKhZhnFWwrES`, immutable `scopeis-team-management-system-bkv3pmvbj-mu-ka7.vercel.app`; canonical alias verified at `06:04:23Z`. Initial deployment/build evidence is preserved separately. |
| Anonymous production smoke | `COMPLETED` | Final 10/10 at `06:04:29Z` after the initial 8/10 exposed two file-error no-sniff omissions. Same ten unique cases rerun after repair. |
| Authenticated live role and ticket/file journey certification | `VERIFICATION_PENDING` | Ordinary production credentials were unavailable. Live Employee/manager landing, permitted operations and private-byte round trip were not certified. Local/disposable authenticated tests remain local evidence. |
| Bounded preservation/deployment receipt and limitations | `COMPLETED` | Production migration State D/16/41 and 34/579/15 preservation, Ready application/source/canonical alias and final anonymous checks recorded. Authenticated live certification remains explicitly pending. |

The completed local delivery report is not rewritten as production evidence. Production preservation, final Ready deployment and anonymous rerun are verified separately. No environment, credential or data-seed change was made for this release.

## Live verification boundary

The final anonymous smoke verified login `200`; `/tickets`, `/dashboard` and `/profile` redirected `307` to sign-in. Ticket workspace/detail/private-file GETs and command/upload POSTs returned `401` with private no-store and no-sniff headers. Mock login returned `404`. These are anonymous authorization/delivery checks; they do not exercise an authenticated user's permitted ticket operations or download private bytes.

The ordinary production sign-in page was visually verified in the in-app browser and opened as the deliverable. A private screenshot was captured as `production-sign-in.png`. No existing authenticated session was available, and ordinary production credentials were unavailable for these release checks. Credentials were not reset and authentication was not bypassed. Consequently, authenticated live Employee/manager journeys and a private-byte upload/download round trip remain unverified. The private provider and environment-specific limits were validated as configuration; local/disposable authenticated journeys remain their own evidence. This limitation does not change the verified Ready deployment or migrate the broader Phase 12/13 roadmap to completed.
