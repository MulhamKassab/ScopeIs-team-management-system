# Phase 3 Operational Domain Decisions

## Status and scope

`SCOPEIS_PHASE_3_CLIENT_PROJECT_LOCATION_JOURNEY_R1` is the authorized Phase 3 implementation. It delivers the bounded operational journey: Super Admin creates a Client; an authorized manager creates a Project; the manager deliberately creates or reuses a same-client Location; the resulting structure is queryable by later scheduling work. Phase 4 scheduling and every later journey remain excluded.

## Selected normalized model

The existing PostgreSQL, Drizzle, service, transaction, audit, optimistic-concurrency, and explicit `admin_scope_grants` foundations remain authoritative. One additive migration introduces:

- `clients`, including optional Account Manager, service summary, service dates, lifecycle, and version;
- `projects`, including owning Client, optional Responsible Admin, dates, operational status, and version;
- `locations`, including owning Client, address, optional manual coordinate pair, site/access/visit text, lifecycle, and version;
- an explicit archived/versioned `project_locations` join so a same-client Location can be deliberately reused without merging records;
- independently queryable operational contacts, staffing requirements, employee associations, and shared operational notes, each attached to exactly one Client, Project, or Location;
- no schedule, assignment, shift, coverage, availability, map-provider, geocoding, GPS, or Ticket record.

Account Manager, Responsible Admin, operational employee association, TEAM membership, designation, and reporting hierarchy remain descriptive relationships only. They never grant authorization and never create staffing or schedule assignments.

## Authorization decision

The existing generic `admin_scope_grants` table is extended by repository-backed target validation rather than duplicated. `TEAM` behavior remains unchanged.

- Super Admin is global for Phase 3 and is the only role that creates Clients or manages operational scope grants.
- Active `CLIENT` manage scope authorizes that Client and its descendant Projects and Locations.
- Active `PROJECT` scope authorizes only the target Project and its permitted direct relationships; it never climbs to Client or sibling Projects.
- Active `LOCATION` scope authorizes only the target Location and its permitted direct details; it never climbs to Project or Client.
- Project and Location creation require Client-level manage authority. Creating a record never bootstraps authority.
- Employee receives no Phase 3 management projection or operational-record browsing.

The service layer reloads the current actor role, target grant, target lifecycle, and Client ownership for each read and mutation. UI visibility is only a usability aid.

## Lifecycle, privacy, and governance

Operational records and relationships are archived, never hard-deleted. A Client cannot be archived while a Project is not `COMPLETED` or `ARCHIVED`. Archived records cannot receive new active relationships, requirements, contacts, employee associations, or notes. Project/Location links require the same owning Client. Coordinates are manual, optional, range-validated, and accepted only as a complete pair. Project and service date ranges must be ordered.

Shared operational notes are the narrow Phase 3 source-record workflow required by the roadmap; Phase 10 still owns the future central notes interface. Authorized managers may read and create notes on records they can manage. Authors may edit their own active notes. Super Admin may archive any active note with a required reason. Employees receive no Phase 3 notes. Note content, contact details, full addresses, access instructions, coordinates, and other sensitive values never enter audit metadata.

Every multi-record mutation owns one PostgreSQL transaction containing the business change and audit event. Audit failure rolls back the business change. Mutations use positive integer versions and reject stale writes. Phase 3 creates no notification event because the confirmed `NOT-002` event list does not include client/project/location setup.
