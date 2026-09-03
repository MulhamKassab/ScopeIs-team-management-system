# SCOPEIS_PHASE_8_STATIC_PLANNING_MAP_JOURNEY_R1

## Outcome

Phase 8 delivers `/map`, a protected management-only planning view. It is a selected-`Asia/Dubai`-date, PostgreSQL-backed projection of only current `PUBLISHED` assignments. The server makes the projection before the browser receives it, so a scoped Admin receives only the strict intersection of existing TEAM employee visibility and existing Client, Project, and Location operational visibility. Employees have neither navigation to nor a server-authorized projection for the route.

The visible planning status always says: “Planning status for [selected date] — based on the Published schedule, not live tracking.” A connection is explicitly a labelled **static planned association** for an authorized Published assignment. It is not a route, journey, direction, trail, or movement indication.

## Delivered boundary

- The additive `0009_phase_8_static_planning_map.sql` migration creates the protected employee planning-coordinate store. It contains an exact coordinate pair only: no address, geocoder result, GPS sample, or history.
- Super Admin receives the stored exact marker when it exists, without displaying raw coordinate strings or an address by default. A scoped Admin receives a deterministic `0.025°` grid centre (about 2–3 km in Dubai), never the exact value, raw address, or reverse-geocoded label. An employee without approved stored coordinates is omitted.
- Current Published assignments use the established schedule overlap and Dubai-date semantics. Draft and Proposed records do not affect markers, list rows, filters, counts, association lines, coverage display, or relevant last-publication time.
- Filters and their option lists are derived from that same authorized projection. Invalid, stale, and hidden identifiers fail safely rather than enumerating employees, skills, Clients, Projects, Locations, leave, or schedule activity.
- Approved leave appears only as an unavailable status. Coverage display is limited to the already-authorized gap fact and authorized work context. No leave reason/balance/response, candidate list/ranking, replacement-request detail, notes, address, or raw coordinate is projected.
- A provider-neutral browser adapter uses OpenStreetMap raster tiles with attribution and no key. The server does not call a map provider. Browser tile requests can reveal the viewed geographic area to the tile provider, but no employee identifier or ScopeIs planning data is sent. A visible tile-load failure state and the synchronized accessible non-map list expose the same authorized facts without relying on tiles, hover, canvas, or color.
- The map supports keyboard marker selection, selection/list synchronization, zoom, and pointer/touch drag-pan; associations render only where both authorized endpoints are visible.

## Verification evidence

All Phase 8 data tests used disposable local loopback PostgreSQL and explicit fictional records/personas.

| Gate | Result |
| --- | --- |
| Migration, journal, schema/manifest fingerprint reconciliation | Passed — `npm run test:migration` (8 tests) |
| Dubai-date, Published-only, coarsening, no-coordinate, timestamp, filter/no-external-path unit/component tests | Passed — 4 focused tests |
| PostgreSQL projection/service and route-authority evidence | Passed — `node scripts/run-phase8-service-tests.mjs`; asserts Super Admin exact data, scoped coarse data, TEAM/operational intersection, hidden-filter rejection, leave privacy, Draft/Proposed omission, and Employee denial |
| Guarded Playwright | Passed — `node scripts/run-phase8-playwright.mjs`, 4 desktop/mobile tests: Super Admin exact-marker/association/disclaimer/zoom/drag/tile fallback; scoped Admin coarse/intersection/hidden-line suppression; Employee HTTP denial |
| Targeted lint | Passed — focused map, test, runner, and configuration files with zero warnings |
| Typecheck | Passed — `npm run typecheck` |
| Safe build | Passed — `npm run build`; `/map` remains a dynamic protected route |
| Seed and development smoke | Passed — fictional test seed and guarded local development/browser run |
| Whitespace/error scan | Passed — `git diff --check` |

The repository-wide lint command was deliberately not represented as passing: preserved user-owned `prototype/` and legacy Phase 1 work remain outside this Phase 8 allowlist and have unrelated inherited failures.

## Manual fictional-persona QA record

With only fictional loopback data, a reviewer confirmed the selected date and persistent non-tracking statement; Super Admin exact marker behaviour without raw address/coordinate display; scoped Admin coarse-only marker precision; TEAM × operational scope intersection and suppressed hidden associations; Published-only date results; approved-unavailable status without a reason; authorized coverage-gap fact without candidates or request detail; keyboard/list synchronization; mobile responsiveness; and the visible tile-failure/list fallback. The workflow includes no current-location control, GPS permission, route arrow, travel estimate, distance ranking, geocoding field, ticket action, production connection, or deployment action.

## Changed-file allowlist and custody

The Phase 8 delivery allowlist is limited to the map route/module/styles/navigation, one additive migration with its schema/journal/fingerprint/verification support, Phase 8 fixtures/runners/tests/Playwright configuration, and the Phase 8 documentation/tracker/context records. Every file is inspected before staging individually. Existing user-owned dirty work—including `prototype/`, Phase 1 runners, route-certification work, authentication/session/seed changes, and the separate Preview worktree’s Leaflet demonstration—remains untouched and unstaged. The Preview demonstration was neither copied, merged, modified, nor treated as production implementation.

Starting custody was `main` at `c60ca60ed5fe518867f6b4c70e5c951ac46eb4bc`, aligned `0/0` with `origin/main`; final commit and upstream alignment are recorded in the delivery message after the reviewed allowlist is committed and pushed.

## Deliberate non-goals and limitations

Maps do not track anyone. No GPS, browser location permission, live location, movement history, attendance, geocoding/reverse geocoding, routes, travel-time/distance calculation or ranking, ticket work, production access, deployment, automatic staffing, or replacement decision was introduced. Tiles require browser network access; when they fail, no location detail is lost because the safe accessible list remains available.
