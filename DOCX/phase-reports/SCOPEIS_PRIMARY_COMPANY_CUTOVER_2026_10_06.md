# Company example at the primary application address

Confirmed and delivered 2026-10-06. The product owner clarified that production is still developmental and requested the complete company example at **https://scopeis-team-management-system.vercel.app/** as the sole application address. This supersedes the separate public demo destination in the earlier [company demo report](SCOPEIS_COMPANY_DEMO_WORKSPACE_2026_10_06.md).

## Delivery

The existing verified company deployment, PostgreSQL database, password configuration and private Blob store remain together. Its Vercel project was renamed from `scopeis-company-demo` to `scopeis-team-management-system`, and the primary domain was moved onto it. This avoids changing password hashes, copying secrets, recreating file objects or reseeding business data.

| Item | Current configuration |
| --- | --- |
| Primary application | `https://scopeis-team-management-system.vercel.app/` |
| Active Vercel project | `prj_JvFv2V2vKKmAqfBOySS8FsZ1aZjy`, named `scopeis-team-management-system` |
| Team | `mu-ka7` / `team_oIqsv7pRRT5ECXyf3WiIQLOf` |
| Git delivery | `MulhamKassab/ScopeIs-team-management-system`, Production branch `main` |
| Database and application role | `scopeis_company_demo` / `scopeis_company_demo_owner` |
| Private file store | Existing `scopeis-company-demo-evidence`, `store_IjDiwdoA1hsd9ydX` |
| Former demo domain | HTTP 308 redirect to the primary domain, preserving the requested path |
| Production team and `git-main` aliases | HTTP 308 redirects to the primary domain, preserving the requested path |
| Recovery project | `prj_pE9utFkTQd6uulsVrDKoqsgmmKKd`, renamed `scopeis-pre-company-recovery` |

The recovery project has no public project domains and no Git connection. Vercel authentication protects its deployment URLs. Its original `neondb` database and settings remain available for deliberate recovery. No database, file store, deployment history, local simulation, Preview checkout or prototype was deleted. A later purge remains a separate explicitly requested operator operation.

The five established demonstration identities retain their existing credentials and roles: Nora is Super Admin, Ava and Ben are separately scoped Admins, and Cora and Dan are Employees. Initial passwords remain out of committed documentation. Old sessions from the previous primary database do not authenticate against the company database; sign in again after the cutover. The visible **Demo workspace** label continues to identify fictional data and saved changes.

The root and clean-build checkout's local Vercel project links now identify the active project. Existing root environment files were left untouched. Temporary files automatically downloaded by CLI linking were removed without emitting their contents.

## Verification

The domain move initially served the already verified Ready deployment `dpl_71q2Ub31tfcoke96xXHag1abognv`, whose recorded application source is `3e3210bbb4155ee3fc927900f296aefe1cb3d34d`. `main` also contains the existing `7d111a2b73ea1b6179917d7f5b309c93afc78a23` documentation and verification-harness closure. This cutover changes provider configuration and documentation only; application logic, permissions, schema and business data are unchanged.

The subsequent Git push `b73beb328ea1a99e7a416d7e5353339a9b74c6c1` automatically produced Ready Production deployment `dpl_HycWSLQA74HwoCN2tzjHR97u5KJX`. The primary alias and the active project's Production target both identify that deployment. Afterward, all five accounts signed in again, 18 dashboard/profile/schedule/management-map pages passed, and all four owner PDFs downloaded correctly. Additional public production aliases were explicitly configured as primary-address redirects; the immutable deployment URL remains protected by Vercel authentication. This verifies the Git delivery connection as well as the initial domain cutover.

Fresh checks against the **primary URL** passed:

- All five accounts authenticated successfully.
- 245 authorized pages returned their expected authenticated workspace without an error screen. These include each role's allowed features, discovered authorized record details, reports and September/October/November schedule views.
- 26 unauthorized management pages returned non-enumerating 404s. Four Employee coverage/replacement pages returned the existing safe management-only explanation, without reading management records.
- 21 private-file checks passed: four real PDFs were readable by their owner and Super Admin; scoped Admins and other Employees received 404; an unauthenticated request received 401.
- Nora's employee directory contained all 18 workforce names, and her client directory contained all six companies. The live map showed six Published assignments, six employees, six worksites and three coverage gaps.
- The former demo `/login` returned 308 to the primary `/login`. The former demo immutable deployment, its team alias, and an original production immutable deployment returned a redirect to Vercel authentication when requested without a Vercel session.
- The Git connection identifies the correct repository and `main`; the recovery project is disconnected and has no project domains.

The first temporary HTTP crawler followed unbounded schedule-month navigation; its schedule discovery was restricted to the three intended months before the completed verification above. No application repair was required. The CLI pause command required interactive user confirmation, so no pause was performed; deployment authentication and removal of public domains provide the verified recovery arrangement instead.

Receipts: [configuration](evidence/primary-company-cutover-2026-10-06/configuration.json), [live access checks](evidence/primary-company-cutover-2026-10-06/live-access-checks.json), and [primary map screenshot](evidence/primary-company-cutover-2026-10-06/live-primary-map.png). They contain no passwords, provider tokens, session cookies or private storage URLs.

Git delivery receipts: [Ready deployment and primary alias](evidence/primary-company-cutover-2026-10-06/git-delivery.json), [address checks](evidence/primary-company-cutover-2026-10-06/address-checks.json), and [post-deployment smoke](evidence/primary-company-cutover-2026-10-06/post-git-smoke.json).

## Operator continuity

Future `main` pushes deploy to the active primary project. Do not recreate the old public company demo, reset credentials merely to move configuration, or run the company initializer against `neondb`. Redeployments preserve company changes; initialization remains an explicit guarded operation, with the original dataset base date of 2026-10-06 in `Asia/Dubai`.

If deliberate recovery is requested, move the primary project domain back to the retained recovery project, restore its Git `main` connection and confirm its original authentication/database configuration before making it public. This is a routing/configuration rollback, not a database merge. A later company-data purge must identify the intended database and private file objects explicitly and preserve schema and any requested account setup.
