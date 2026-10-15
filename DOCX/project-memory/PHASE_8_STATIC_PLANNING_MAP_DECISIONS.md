# Phase 8 Static Planning Map decisions

## Confirmed Cover and access amendment — 2026-10-15

The owner authorized the [consolidated Cover workspace and access amendment](COVER_WORKSPACE_AND_ACCESS_AMENDMENT_2026_10_15.md). It supersedes older statements permitting Admin unpublished timetable/team-leave/report reads or project creation. Super Admin alone holds those capabilities; Employee own vacation self-service remains. Cover unifies timetable selection, creation, versioned editing/cancellation and direct decisions, with separate publication. The main timetable exposes assignment creation and the map gains place labels and selected-work controls. Existing scope, privacy, conflict, accessibility and RTL rules remain.

## Authorized coordinate controls — 2026-10-14

The employee-detail page provides Super Admin-only manual create, correct and clear controls for the existing employee planning coordinate. Latitude/longitude must be finite and within geographic bounds. Writes recheck current active Super Admin authority and session version inside the transaction, serialize the target coordinate and check both profile and coordinate versions. Clearing and recreating cannot reuse stale form authority. Each change records safe audit fields/version without raw coordinates. Default work location text remains separate from this coordinate and assignment worksites. Admin keeps the existing authorized coarse map projection; Employee has no coordinate editor or exact-coordinate disclosure. No GPS, geocoding, tracking, provider change or automatic movement is introduced. See [the local implementation report](../phase-reports/SCOPEIS_FRONTEND_BACKEND_GAP_FIXES_2026_10_14.md).

The management map is a selected `Asia/Dubai` date projection of current Published assignments only. It is not a live map and does not track anyone.

- Super Admin receives stored exact planning coordinates when they exist. Scoped Admin receives only a deterministic 0.025-degree grid centre (about 2–3 km around Dubai), never raw address, exact coordinate, or reverse-geocoded area label. An employee without stored coordinates is omitted from the map marker.
- The server applies the strict intersection of explicit TEAM employee visibility and Client/Project/Location operational visibility before emitting assignments, markers, associations, filter options, counts, coverage facts, or last-publication timestamp. Employee clients receive no map projection and have no map navigation.
- OSM raster tiles are browser-only, through a provider-neutral adapter boundary, with attribution and a list fallback. The browser’s tile requests can reveal viewed area to the tile provider; ScopeIs sends it no employee identifier or planning data. The server makes no map-provider request.
- Lines are labelled static planned associations only, never routes, directions, or movement trails. No GPS, live location, history, geocoding, reverse geocoding, distance/travel calculation, attendance, ticket work, deployment, production access, or automated staffing/replacement is introduced.

## 2026-10-05 — Approved planning-map usability refinement

The user authorized a more useful, responsive map as part of the existing application's UI refinement. The source, authority and privacy decisions above remain canonical.

- Keep the selected Dubai date prominent, with Previous, Next and Today navigation. Secondary Client, Project, Location, Employee and skill filters are disclosed on demand and open automatically when a server filter is active.
- Fit all authorized coordinates inside the available canvas with padding, including narrow workspaces and longitude wrap. Fit all and Focus selected are explicit actions; resizing responds to the actual canvas size.
- Group exactly coincident markers across the already authorized assignments. A count and repeated selection make every associated assignment reachable. This grouping never combines or exposes records outside the projection.
- Offer All assignments, Coverage gaps and Approved unavailable views, searchable authorized assignments, and Employee, Worksite and Association layer toggles. Lines continue to mean planned associations only.
- Selected-assignment details show its existing authorized time range, Client, Project, Location, recorded skills, coverage facts and coordinate precision. `schedulePeriodId`, `startTime` and `endTime` are added to the projection from that same Published row solely to support real schedule and coverage links. No new query authority, privacy field, database schema or planning verdict is introduced.
- Mouse and keyboard pan/zoom remain available. Touch defaults to page scrolling; explicit interaction enables one-finger map pan and two-pointer pinch, and a lock action restores page scrolling. Marker buttons remain named and at least 44px.
- Tile failure keeps the assignment list and detail actions usable, with an accessible failure notice and retry. Attribution stays visible; the provider/privacy disclosure explains browser tile requests and exact versus coarse planning markers.

The [experience review](../phase-reports/SCOPEIS_UI_EXPERIENCE_AND_PLANNING_MAP_2026_10_05.md) contains desktop/mobile evidence, grouping/geometry tests and scoped-role verification. Phase 8's historical report remains unchanged.
