# ScopeIs Preview — Fixture Data Coverage Audit and Interactive Map R1

## Classification

Preview-only, database-free frontend demonstration maintenance. This work does not certify production persistence, authentication, tracking, or completion of a real implementation phase.

## Custody and synchronization

- Preview worktree: `/Users/mulhamkassab/Desktop/For Me/ScopeIs Team Management System-preview`
- Starting Preview HEAD and `origin/preview`: `57cdc3259bf6ed5563bde6bcb23211105f7f06c1`
- Starting `origin/main`: `db7c19310ef4a13d0e1e30435d6178df04e41d28`
- `origin/main` had not advanced beyond the Phase 6 merge already included by Preview (`a7e4ad7`), so no additional synchronization merge was required.
- The separate dirty `main` worktree was not changed.
- The five unrelated untracked duplicate files in the Preview worktree were preserved unmodified and unstaged: `login-screen 2.tsx`, `dashboard/page 2.tsx`, `styles 2.css`, `employee-management-panel 2.tsx`, and `shell 2.tsx`.

## Fixture audit and corrections

The fixture graph remains the only business-data source. The audit found and corrected these projection/data issues:

1. Clients, projects, locations, and assignments displayed related names but did not consistently retain typed IDs. Added `primaryLocationId`, `locationId`, and `clientId` links while preserving display labels.
2. Coverage and replacement records lacked fixture links to affected assignments and employees. Added stable assignment, requester, and candidate IDs.
3. Participant discussions were previously role-level hardcoded text, which could show an unrelated employee thread. Replaced them with participant-ID fixtures and one common selector.
4. Private management notes are now visible only to their author; Admins retain their Team-scoped shared-upward presentation.
5. Dashboard and report counters now use shared fixture-count selectors rather than duplicated expressions.

Record inventory after the audit: 18 employees, 5 personas, 6 clients, 6 projects, 6 operational locations, 7 assignments (4 Published, 2 Proposed, 1 Draft), 3 leave records, 2 coverage gaps, 2 replacement requests, 5 notes, 3 discussions, 4 notifications, 5 audit events, and 10 typed planning coordinates.

All employee contacts use `example.test` and fictional UAE-context placeholder phone numbers. Coordinates are approximate fictional operational/planning areas, never residential addresses or current positions.

## Route and persona coverage

`src/preview/preview-routes.ts` now supplies a shared 22-route coverage matrix for the renderer and tests.

| Persona | Authorized presentation |
|---|---|
| Nora Albright | Global dashboard, both teams, all schedule states, global reports/audit/settings, and disabled final-workflow controls. |
| Ava Mercer | Team Alpha employee/client/project/location/schedule/coverage/replacement/map data only; no global decisions, reports, or audit. |
| Ben Iqbal | Team Bravo equivalent only; no Team Alpha records or global authority. |
| Cora Bell | Own profile, own Published work, own leave, shared Team Alpha content, participant-only discussions, and own notifications. |
| Dan Rowan | Own profile, own Published work, own leave, shared Team Bravo content, participant-only discussions, and own notifications. |

Dashboard, employees/detail, profile, skills, evidence, clients/detail, projects/detail, locations/detail, schedule, leave, coverage, replacements, map, requests, notes, management notes, discussions, notifications, reports, audit, settings, and the deferred Ticket System presentation have fixture surfaces. The former generic Phase 1–2 shell message is absent. Business-mutation controls remain disabled with a frontend-demonstration explanation.

## Role, scope, and privacy evidence

- Super Admin sees both fixture teams and disabled publication/decision controls.
- Ava’s map list contained two Team Alpha Published assignments and no Dan Rowan/Jebel Ali content.
- Ben’s map cannot contain Team Alpha records.
- Cora and Dan have no map navigation, map data, reports, audit, or management-note access.
- Admin leave selectors remove private reasons; employee selectors return only the employee’s own leave.
- Discussion selection requires a participant ID; management-private note selection requires the note author.

## Interactive map architecture

`leaflet` and `react-leaflet` are loaded only through a `next/dynamic` client boundary in `preview-app.tsx` (`ssr: false`). `interactive-planning-map.tsx` uses a local typed map selector, Leaflet `divIcon` markers, `MapContainer`, `TileLayer`, `Marker`, `Popup`, and `Polyline` connections. It uses no geocoding, routing, GPS, browser geolocation, API key, business-data fetch, or persistence mechanism.

OpenStreetMap raster tiles are the sole external map request and include visible OpenStreetMap attribution. The map exposes mouse/touch pan, Leaflet zoom controls, fit-visible-markers, reset, date, employee, skill, client, and availability filters, selected marker/list synchronization, a legend, and a responsive alternative list/details panel. Only valid Published assignments on the selected date create markers or connections. Role scope is applied in the selector before any marker, popup, line, list item, or count is built.

The non-live notice is always rendered: `Planning status for [selected date] — based on the Published schedule, not live tracking.` It also explains approximate fictional planning areas, no GPS, no current movement, no history, and no saving. A tile-error handler displays a concise basemap-unavailable message while keeping filters and the fixture list usable; it does not cache or download tiles.

## Verification

- `npm run typecheck` — passed.
- `npm run test:preview` — passed, 6 tests. Covers uniqueness, referential links, safe contacts, coordinate bounds/links, Published map derivation, counters, route coverage, scope, privacy, and no active persistence bootstrap.
- `npm run lint` — passed.
- `npm run build` with every PostgreSQL, Neon, Blob, and historical bootstrap variable absent — passed.
- `git diff --check` — pending final reviewed diff check before commit.
- Searches of the Preview route/runtime tree found no database, repository, persistence-service, Neon, Blob, geocoding, browser-geolocation, or business-data-fetch use. The only map provider string is the public OpenStreetMap tile URL.

## Browser QA evidence

Local desktop (`1440 × 900`) and mobile (`390 × 844`) QA covered Nora, Ava, Ben, Cora, and Dan. On the map, OpenStreetMap tiles and attribution rendered; employee/worksite marker icons rendered; popup-capable markers, pan, zoom, fit, reset, date switch, filters, list selection, and dark theme all worked. The selected assignment’s list row updated the details panel. Desktop and mobile had no horizontal overflow, and the browser console recorded zero errors. The responsive viewport override was restored after testing.

The basemap-unavailable view is an intentionally local tile-error fallback path: it retains the source-filtered planning list and does not claim live data. It does not depend on a database, storage, or a replacement map provider.

## Boundaries and limitations

No Production deployment, Vercel Production configuration, production credential, Neon project, Blob store, migration, seed, or production resource was accessed or changed. No tracking or location permission is requested. The existing Vercel Preview deployment protection/SSO remains untouched. This is a static frontend demonstration: persona choice is presentational, tiles require normal public OSM availability, refresh resets temporary presentation state, and disabled controls do not store results.
