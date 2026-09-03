# ScopeIs Preview — Rich Operational Data and Multi-Layout Exploration R2

## Classification and custody

- Phase ID: `SCOPEIS_PREVIEW_RICH_OPERATIONAL_DATA_AND_MULTI_LAYOUT_EXPLORATION_R2`.
- Classification: Preview-only, database-free frontend demonstration; not evidence of completing a persistent Production phase.
- Worktree: `/Users/mulhamkassab/Desktop/For Me/ScopeIs Team Management System-preview` on `preview`.
- Starting Preview tip: `b99e3effa966e63712a1953fd58d3644e13dd830`.
- `origin/main` inspected at `99199353f92057184cb7bd2ea97b010915a7f40d` (Phase 8 static planning map) and merged as `b772ea4e928c968b365cb3780872812bf3ca1a0a` without importing persistence into active Preview routes.
- The original dirty `main` checkout was not edited. The five unrelated duplicate Preview files remain untracked and unstaged: `login-screen 2.tsx`, `dashboard/page 2.tsx`, `styles 2.css`, `employee-management-panel 2.tsx`, and `shell 2.tsx`.

## Fixture expansion

`src/preview/rich-operational-data.ts` is one typed, deterministic graph. It has no runtime random values and uses fictional `example.test` contacts.

| Entity | Records |
| --- | ---: |
| Employees / personas | 18 / 5 |
| Clients / projects / locations | 10 / 30 / 50 |
| Capabilities / certifications / portfolio examples | 90 / 54 / 72 |
| Historical and future schedule assignments | 409 |
| Operational work history / monthly trends | 360 / 36 |
| Historical leave / coverage evaluations / replacements | 54 / 36 / 25 |
| Requests / shared notes / management notes | 80 / 110 / 32 |
| Notifications / audit events | 110 / 110 |

Activity ranges from October 2023 through September 2026. Projects, work, capabilities, certifications, requests, leave, coverage, replacements, notifications, audits, and reports share their fixture IDs rather than using screen-specific totals.

## Frontend work completed

- Added a scope-aware Skills explorer with skill-first and employee-first modes, verification, coverage eligibility, demand, certification, and availability details.
- Added large employee capability overlays for profile, skills, certifications, portfolio, experience, schedule/activity, leave, and authorized management context.
- Added populated client, project, and location explorers with overlays. Client-to-project drill-down retains client context and has an explicit **Back to client** control.
- Added dense Requests and assignments, Coverage, Replacements, Analytics dashboard, and Reports surfaces. Simulated actions state: `Demo only — this change is not saved and will reset on refresh.`
- Added 54 historical leave records and shared role-aware leave/management-history selectors. Management context is shown only to Super Admin or an Admin viewing notes they authored for an in-scope employee.
- Added Schedule 1 (employee/day board), Schedule 2 (resource timeline), and Schedule 3 (demand-first workspace), all using the same period, filters, states, warnings, leave, assignment selection, and permissions.
- Enforced route authorization before rendering module content. Employee direct URLs to management views now receive the explicit Preview access-boundary state.
- Retained the fixture-only Leaflet/OpenStreetMap map and its scope-filtered markers plus location/project route controls from the prior Preview increment.

## Database, storage, and Production boundaries

- Active Preview wrappers for merged canonical Coverage, Replacements, and Map pages resolve to `PreviewApp`; they do not import database services.
- `tsconfig.json` excludes synchronized canonical database, module, server, and test trees from the Preview compilation boundary, preserving main-origin source while keeping Preview runtime fixture-only.
- No database, Neon, Blob, upload, repository, persistence-service, migration, bootstrap, or business-data API dependency was added.
- No Production credentials, database, storage, Vercel Production environment, or deployed Production service was accessed or changed.

## Verification

Static checks run after implementation:

```text
npm run typecheck
npm run lint
npm run test:preview
npm run build
git diff --check
```

The fixture suite asserts records, relationships, scopes, contact safety, map relationships, route visibility, rich history, leave, and management-note privacy. A credential-free build also removes database, Neon, PostgreSQL, Blob, migration, and bootstrap environment names explicitly; it must complete without attempting a connection.

## Browser QA evidence

In-app Browser QA used `http://localhost:3201` with no credentials or external business-data requests.

| Check | Result |
| --- | --- |
| Nora desktop Schedule 1 | Passed: dense grid, shared filters, detail rail, warnings, and non-persistent controls. |
| Nora Schedule 2 and 3 | Passed: resource timeline and demand-first layouts render from the same records. |
| Nora overlays | Passed: employee modal and client-to-project Back to client flow work. |
| Ava Skills | Passed: inspected skill detail contains Team Alpha records only; Ben is absent. |
| Ava / Ben map scope | Passed: Leaflet rendered 5 Alpha markers for Ava and 6 Bravo markers for Ben; opposite-team labels were absent. |
| Cora / Dan access | Passed: direct Coverage/Map URLs render the unavailable-for-this-persona state. |
| Cora mobile 390 × 844 | Passed: `innerWidth` 390, document width 375, no horizontal page overflow, Published-only state. |
| Console / theme | Passed on exercised screens: no browser console errors; existing light/dark control remained usable. |

Public OpenStreetMap tile requests remain the only map-related network request. The fixture map has no GPS, geocoding, route service, or live tracking.

## Known limitations

- This is a presentation-only in-memory fixture demonstration, not a Production-ready, persistent, or authenticated system.
- Persona selection is illustrative rather than a security mechanism.
- Request, assignment, approval, and publication controls reset on refresh.
- Ticket System is still deferred and not a workforce module.
- Deployment identity is verified after the Preview commit is pushed; no production promotion is allowed.
