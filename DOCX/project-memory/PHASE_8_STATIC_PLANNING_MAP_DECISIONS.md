# Phase 8 Static Planning Map decisions

The management map is a selected `Asia/Dubai` date projection of current Published assignments only. It is not a live map and does not track anyone.

- Super Admin receives stored exact planning coordinates when they exist. Scoped Admin receives only a deterministic 0.025-degree grid centre (about 2–3 km around Dubai), never raw address, exact coordinate, or reverse-geocoded area label. An employee without stored coordinates is omitted from the map marker.
- The server applies the strict intersection of explicit TEAM employee visibility and Client/Project/Location operational visibility before emitting assignments, markers, associations, filter options, counts, coverage facts, or last-publication timestamp. Employee clients receive no map projection and have no map navigation.
- OSM raster tiles are browser-only, through a provider-neutral adapter boundary, with attribution and a list fallback. The browser’s tile requests can reveal viewed area to the tile provider; ScopeIs sends it no employee identifier or planning data. The server makes no map-provider request.
- Lines are labelled static planned associations only, never routes, directions, or movement trails. No GPS, live location, history, geocoding, reverse geocoding, distance/travel calculation, attendance, ticket work, deployment, production access, or automated staffing/replacement is introduced.
