# System Architecture Decisions

## Status

**APPROVED PHASE 1 ARCHITECTURE — IMPLEMENTED AND CERTIFIED FOR THE MOCK-ACCOUNT PROTOTYPE**

This file records the approved technical direction that governed Phase 1. Its earlier statement that implementation had not begun is historical and superseded by the 2026-08-29 Phase 1 certification report. The architecture is certified only for the local mock-account prototype; it has not been production-tested, and production identity, deployment, database, and provider readiness remain outside that certification.

The Phase 2 database foundation was reconciled on 2026-08-29. The TypeScript Drizzle schema is the authoritative runtime model; committed SQL migrations are immutable transitions; `_journal.json` defines ordering; and database adoption is permitted only after exact schema and installed-format ledger verification. Migration `0001` remains byte-for-byte unchanged. State E drift is fail-closed and never repaired automatically.

The confirmed product requirements and permissions remain authoritative. Read this file with:

- [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md)
- [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md)
- [`ROLE_AND_PERMISSION_MODEL.md`](ROLE_AND_PERMISSION_MODEL.md)
- [`SYSTEM_HIERARCHY_AND_RELATIONSHIPS.md`](SYSTEM_HIERARCHY_AND_RELATIONSHIPS.md)
- [`WORKFLOWS.md`](WORKFLOWS.md)
- [`DECISIONS_AND_CONSTRAINTS.md`](DECISIONS_AND_CONSTRAINTS.md)
- [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md)

## Executive decision

ScopeIs Team Management System will begin as a modular full-stack Next.js application using TypeScript and PostgreSQL. It will be designed as a modular monolith. A separate dedicated backend is not required for the initial system.

“No dedicated backend” does not mean “no backend.” Next.js provides the initial server-side application layer through Server Components, Route Handlers, Server Actions where appropriate, server-side services, server-side authorization, database repositories, and transactional application operations.

The browser must never directly perform privileged database operations. Hiding buttons or adding frontend-only permission checks is useful for interface clarity but is never the security boundary.

## Product invariants preserved

Architecture must implement, not reinterpret, these canonical product decisions:

- All employees are internal; “outsourced” is an assignment arrangement, never an employment type.
- Assignment-arrangement labels are descriptive and do not themselves determine availability, coverage, leave, conflicts, or permissions.
- Super Admin is the only schedule publisher and leave decision-maker.
- Admin is scope-limited and cannot publish schedules, approve/reject leave, or recommend leave outcomes.
- Employee sees Published schedule entries only and cannot access the management planning map.
- Employee-management notes are private to author or shared upward; the subject cannot see them.
- Project/client notes remain shared with all authenticated users.
- Assignment/request discussions remain participant-only.
- The static map remains non-live and introduces no GPS or movement tracking.
- Replacement ranking remains advisory; Super Admin retains final authority.
- Ticket System integration remains the bounded Phase 12 feature, not the product foundation.

## Current technology direction

| Concern | Current recommendation |
|---|---|
| Main framework | Next.js App Router |
| Language | TypeScript |
| Architecture style | Modular monolith |
| Structured database | PostgreSQL |
| Database toolkit | Drizzle ORM |
| Schema migrations | Version-controlled SQL/Drizzle migrations |
| Boundary validation | Zod |
| Version 1 authentication | Mock authentication provider using normal server sessions |
| Future authentication | Replaceable Microsoft, Google, or company identity provider |
| File contents | Private object storage through a storage adapter |
| File metadata | PostgreSQL |
| Map integration | Provider-neutral map adapter |
| Testing | Vitest, React Testing Library, and Playwright |
| Dedicated backend | Not initially |
| Background worker | Add only when a real workload requires it |
| Ticket System | Phase 12 bounded feature |

This table is a technical direction, not an instruction to install packages during the documentation phase. No package versions are pinned here.

## Why this architecture fits

The expected initial population is approximately 15–20 internal employees with reasonable growth. The product's primary complexity is policy and relational integrity:

- Three system roles and Admin scopes
- Sensitive employee, leave, location, note, file, and audit information
- Draft, Proposed, and Published schedule states
- Scheduling conflicts and authoritative publication
- Leave decisions and coverage validation
- Replacement requests and advisory candidate ranking
- In-application notifications and audit history
- Client, project, location, employee, skill, and assignment relationships

Its confirmed complexity does not come from massive public traffic, high-frequency streaming, live GPS, real-time movement monitoring, multiple independent consumer applications, heavy scientific computation, a public API product, or continuous WebSocket communication.

Splitting the frontend and backend into separate applications now would add deployment, authentication, API-contract, typing, and operational overhead without solving a confirmed business need. A single deployable application also keeps transactional workflows close to PostgreSQL while the team establishes the domain model.

## Modular-monolith principle

One deployable application must still have strict internal boundaries. Modules own their terminology, domain rules, application services, persistence contracts, and tests. Cross-module changes occur through explicit services or contracts rather than arbitrary database access from UI code.

Recommended conceptual structure:

```text
src/
├── app/
│   ├── pages-and-layouts/
│   └── api-route-handlers/
├── modules/
│   ├── auth/
│   ├── employees/
│   ├── designations/
│   ├── skills/
│   ├── certifications/
│   ├── portfolio/
│   ├── clients/
│   ├── projects/
│   ├── locations/
│   ├── scheduling/
│   ├── leave/
│   ├── coverage/
│   ├── replacements/
│   ├── maps/
│   ├── notes/
│   ├── discussions/
│   ├── notifications/
│   ├── audit/
│   ├── reports/
│   └── tickets/             # Phase 12 only
├── server/
│   ├── authorization/
│   ├── services/
│   ├── repositories/
│   ├── transactions/
│   └── jobs/
├── db/
│   ├── schema/
│   ├── migrations/
│   └── client/
└── shared/
    ├── validation/
    ├── types/
    ├── dates/
    └── utilities/
```

This is conceptual. Exact folder names may change during Phase 1 if the same dependency direction, ownership, and security boundaries are preserved.

## Dependency direction

```text
UI / Route Handler
        ↓
Application Service
        ↓
Domain Rules
        ↓
Repository Interface
        ↓
PostgreSQL / External Adapter
```

Rules:

1. React components must not contain authoritative business rules.
2. Route Handlers remain thin: validate, authenticate, authorize, invoke a service, and format a response.
3. Application services coordinate use cases, module interactions, and transactions.
4. Domain services contain reusable scheduling, leave, coverage, replacement, and visibility rules.
5. Repositories contain persistence queries and expose purpose-specific operations.
6. External providers are hidden behind adapters.
7. Lower layers must not import UI or framework rendering concerns.
8. Business rules remain reusable if a dedicated API or worker is introduced later.

## Business-logic placement

The following rules must have server-side implementations and tests; they must not exist only in React components or page code:

- Role and Admin-scope checks
- Schedule-publication authority
- Leave-approval authority
- Employee-record visibility
- Leave-reason and home-location privacy
- Employee-management-note visibility
- Participant-only discussion visibility
- Schedule conflict checks
- Coverage validation
- Advisory replacement ranking
- Override validation
- Audit-event creation
- Notification creation

The interface may hide unavailable actions for usability. Every protected read and mutation still requires server-side authentication, authorization, and scope filtering.

## PostgreSQL as authoritative structured store

PostgreSQL is the authoritative structured-data store because the product requires relational consistency, foreign keys, check and unique constraints, transactions, indexes, date/timestamp support, filtered queries, audit relationships, reporting, and concurrent-user safety. PostgreSQL time ranges and exclusion constraints are potential tools for scheduling integrity.

The application must not use one large JSON document as its authoritative production data model. JSON columns may support bounded, justified attributes, but they must not replace independently queryable workforce, schedule, permission, audit, and relationship records.

The future Ticket System's historical JSON model must not control the new workforce-system architecture.

## Drizzle and migration workflow

Drizzle ORM is the current recommendation because it works naturally with TypeScript, stays close to SQL, supports version-controlled migrations, permits PostgreSQL-specific features, and gives sufficient control over constraints and indexes. It may also align with selected Phase 12 reuse after review.

Prisma would be technically viable, but mixing multiple ORMs is not recommended. Phase 1 must select one authoritative schema and migration workflow. Raw, reviewed SQL migrations may be used when a PostgreSQL feature cannot be represented cleanly by the selected ORM.

Every schema change must be captured in version control, reviewed, repeatable, and testable against a clean database and an upgrade path. This document does not define tables or create migrations.

## Boundary validation with Zod

Zod is the current recommendation for validating untrusted input and explicit contracts at application boundaries. Validation includes route input, Server Action input, file metadata, search/filter parameters, and external-adapter responses where appropriate.

Validation does not replace authorization, database constraints, or domain rules. A syntactically valid request can still be forbidden, out of scope, stale, or inconsistent with business policy.

## Schedule storage and conflict protection

1. Schedule planning sets or records have Draft, Proposed, or Published state.
2. Drafts may temporarily contain unresolved warnings while authorized managers prepare them.
3. Draft validation clearly reports conflicts and their severity.
4. Publication reruns authoritative validation against current data.
5. Only Super Admin can publish or modify a Published schedule.
6. Employees receive Published entries only.
7. Published changes are audited and notify affected employees.
8. PostgreSQL constraints may protect Published assignments from invalid overlaps.
9. A blanket non-overlap constraint must not prevent authorized Draft preparation.
10. Conflict policy and warning severity remain aligned with confirmed product decisions.

PostgreSQL range and exclusion constraints may be used selectively for invariants that the database can enforce without contradicting Draft behavior or authorized overrides. The exact overlap-constraint design remains open.

## Transaction boundaries

Critical workflows must be atomic. The application service owns the use-case transaction and coordinates the main record, related state, audit events, and notifications.

### Schedule-publication transaction

1. Authenticate the actor.
2. Confirm Super Admin authority.
3. Load the latest Proposed schedule/version.
4. Re-run authoritative validation against current data.
5. Verify conflicts and any authorized overrides.
6. Publish the schedule.
7. Record publication state and history.
8. Write audit events.
9. Create affected-employee notifications.
10. Commit all required changes together.

If a required step fails, no partial publication is committed.

### Leave-decision transaction

1. Authenticate the actor.
2. Confirm Super Admin authority.
3. Reload current leave, schedule, availability, and coverage data.
4. Recalculate coverage.
5. Record approval, rejection, or an authorized override.
6. Update derived availability or applicable schedule effects.
7. Write the audit event.
8. Create the employee notification.
9. Commit together.

Admin does not approve, reject, or recommend the leave outcome.

### Replacement-decision transaction

1. Reload the current replacement request and candidate availability.
2. Confirm Super Admin authority.
3. Validate skill, schedule, leave, publication-state, and scope conditions.
4. Approve, change, or reject the request.
5. Update the applicable Draft or Published schedule according to publication rules.
6. Audit the decision.
7. Notify relevant users.
8. Commit atomically.

Replacement ranking remains advisory and never makes the final decision.

## Concurrency strategy

Multiple Admins or Super Admin may edit related records. Critical records should therefore use record versions, update timestamps, or another explicit optimistic-concurrency mechanism.

The application must provide:

- Optimistic concurrency checks
- Transactional publication and decision operations
- Clear stale-data/conflict responses
- No silent last-write-wins behavior for critical records
- Reload-and-retry guidance when data changes

Potential versioned records include schedule planning sets, assignments, leave requests, replacement requests, employees, clients, projects, locations, coverage rules, and management notes. Exact versioning design remains an implementation decision.

## Authentication design

Version 1 uses mock accounts, but mock authentication must use the same business-authorization path intended for future identity providers.

```text
Authentication Provider
├── Mock provider — development and testing
├── Microsoft provider — future
├── Google provider — future
└── Company identity provider — future
```

Mock authentication establishes a normal server session containing information such as stable user ID, system role, assigned scope, session version, and authentication mode.

Safeguards:

- Mock accounts do not bypass server authorization.
- Mock mode is clearly labeled.
- Real passwords are not written into documentation.
- Production cannot accidentally start with insecure mock authentication enabled.
- Replacing the provider does not require rewriting business authorization rules.

The exact session library, cookie strategy, and future identity provider remain open.

## Authorization design

Authorization uses more than role alone. Inputs may include system role, Admin scope, record ownership, record participation, schedule state, data sensitivity, operational relationships, note visibility, and discussion participation.

Confirmed restrictions:

- Admin cannot publish schedules.
- Admin cannot approve or reject leave.
- Admin does not recommend leave decisions.
- Admin has no out-of-scope access.
- Employee sees Published schedules only.
- Employee cannot access the management planning map.
- Employee cannot see employee-management notes.
- The subject of an employee-management note cannot see it.
- Project/client notes are shared with all authenticated users.
- Assignment/request discussions are participant-only.

Authorization policy should be centralized and testable. Server Components, Server Actions, Route Handlers, repositories, and background jobs must not invent conflicting permission rules.

## Sensitive-data boundaries

Sensitive information must not be returned automatically with ordinary employee or operational data. Sensitive data includes precise home addresses and coordinates, private leave reasons, management notes, private request discussions, certification/portfolio files, and audit details containing sensitive changes.

Separate general-profile queries from protected-detail queries. For example:

- Admin may receive `Unavailable` without the leave reason.
- Employee listings do not automatically return precise home coordinates.
- Map queries apply role and Admin-scope filters before returning data.
- Participant-only discussions are filtered server-side.
- Sensitive fields do not appear in logs or generic errors.

Address precision and any additional precise-address permission remain open product decisions.

## Time and date model

- Store actual instants as timezone-aware timestamps.
- Use UTC for persisted instants where appropriate.
- Store the relevant business timezone for locations and schedules.
- Treat full-day leave as business dates, not ambiguous timestamps.
- Do not treat browser-local time as authoritative.
- Generate recurring schedules in the applicable business timezone.
- Display dates/times using the user or location context selected by later policy.

Shift, weekend, holiday, leave-year, and half-day rules remain open and are not finalized by this architecture.

## File-storage architecture

Certification, portfolio, CV, and supporting-file bytes should not be stored as large PostgreSQL binary values.

```text
PostgreSQL
- File metadata
- Ownership
- Related employee/record
- Storage key
- Content type
- Size
- Upload time
- Uploader
- Visibility
- Review/verification state

Private object storage
- Actual file bytes
```

A provider-neutral storage adapter protects domain and authorization logic from a specific service. Development may use isolated local storage. Production should use private object storage. Every upload, preview, and download is authorized; permanent public URLs are not required for private employee files.

The storage provider, retention rules, malware-scanning policy, and encryption details remain open.

## Notifications and audit

Version 1 uses an in-application notification centre backed by PostgreSQL. For confirmed workflows, the main record, audit event, and in-app notification should be written in the same transaction where practical.

Confirmed notification events include certification/portfolio addition or update, leave submission, leave decision, replacement request, replacement decision, schedule publication, Published schedule change, and private discussion message.

A separate email or notification worker is not required initially because external channels are deferred. If external delivery is added, a transactional-outbox pattern is preferred so committing a business event does not depend on immediate external-provider delivery.

## Static-map architecture

The static planning map does not require live tracking, GPS ingestion, WebSockets, a dedicated backend, PostGIS in Version 1, or route-history storage.

Version 1 may store latitude, longitude, address or approximate area, location label, data precision, and related employee/client/project/location identifiers. The map query combines stored workforce locations, stored worksite coordinates, Published schedules, selected date/period, active filters, role, and Admin scope.

For the expected data size, ordinary PostgreSQL coordinates and application-level distance calculations are sufficient. PostGIS may be reconsidered only for large geographic datasets, spatial indexing, complex radius or containment searches, or large-scale nearest-neighbor queries.

The map provider, geocoder, address precision, route calculation, and travel-time provider remain open. The map remains a selected-date planning visualization and never represents live movement.

## Scheduling and coverage engines

Schedule-conflict and coverage logic should be independently testable domain services. They must not depend directly on React, page components, map libraries, a specific identity provider, a hosting platform, or an external-notification provider.

The scheduling engine accepts normalized data and returns explicit findings such as conflict code, severity, affected employee and assignment, time period, explanation, override possibility, and required override authority.

The coverage engine returns the applicable rule, required skill/count, qualified available employees, missing count, affected client/project/location, candidate replacements, and reasons for candidate inclusion or exclusion.

Replacement ranking is advisory. It never makes the final staffing or leave decision automatically.

## Server Components, Server Actions, and Route Handlers

- Server Components may read data through server-side application services.
- Server Actions may support straightforward UI-bound mutations.
- Route Handlers are preferred when an explicit HTTP contract is beneficial.
- Critical business rules live below both mechanisms in reusable services.
- Server Actions and Route Handlers must not contain contradictory rule implementations.
- Every public or client-callable endpoint validates and authorizes each request.

Server Actions are an interface mechanism, not the only home of domain logic.

## Deployment direction

Deployment remains portable. The application should be capable of running as a managed Next.js deployment, a normal Node.js server, or a Docker container. This amendment does not select Vercel or any other provider.

```text
Next.js application
        ↓
Managed PostgreSQL
        ↓
Private object storage
```

Serverless platforms may impose execution-time limits, ephemeral filesystems, no durable in-process memory, restrictions on persistent WebSockets, and database-connection considerations. The architecture must not rely on local server memory or local production-filesystem persistence.

The final hosting, database, storage, networking, backup, monitoring, and recovery choices remain open.

## When a dedicated backend becomes justified

Next.js remains sufficient unless the system later gains one or more of these needs:

- Multiple independent frontend applications
- A native mobile application requiring a large stable API
- External API consumers or a public API product
- Long-running optimization or heavy document/media processing
- High-volume external notifications or continuous background processing
- Persistent WebSocket connections or real-time data streams
- Live GPS or another explicitly approved streaming feature
- Independently scaled technical services
- Separate backend-team ownership
- Regulatory or network isolation requiring separate services

If a real need appears, add a dedicated worker, queue, separately deployed API, or specialized service. The modular domain, service, repository, and adapter boundaries should allow incremental extraction rather than an entire rewrite.

## Background-worker boundary

No dedicated worker is required for the currently confirmed Version 1 scope. A separate process may later be justified for external email delivery, scheduled reminders, large report/PDF generation, file conversion or malware scanning, bulk imports, recurring-assignment materialization, heavy geographic calculations, ticket attachment processing, or another long-running workload.

A worker should share stable domain contracts where appropriate but must independently authenticate its system identity, enforce authorization or trusted-operation boundaries, create audit records, and use idempotent jobs. The exact queue or job provider remains open.

## Testing strategy

### Unit tests

Cover role/permission policies, Admin scope, schedule conflicts, coverage rules, advisory replacement ranking, leave validation, note visibility, and date/time logic.

### Integration tests

Cover PostgreSQL repositories, transactions, migrations, authentication/session behavior, authorization enforcement, audit and notification creation, and file-metadata coordination.

### Component tests

Cover the schedule board, employee forms, leave forms, map filters, notifications, and permission-sensitive interface states.

### End-to-end tests

Cover mock login personas, Super Admin workflows, Admin and Employee restrictions, schedule Draft/Proposed/Published flow, leave decisions, coverage conflicts, replacement requests, certification-upload notifications, static-map access, and private-discussion access.

Negative permission tests are mandatory. A hidden interface control is not sufficient proof of authorization.

## Ticket System boundary

The existing Ticket System is not the architectural foundation and must not be inspected or modified during this amendment. Ticket functionality is introduced only in Phase 12 after Phases 1–11 are stable.

Selected ticket functionality may later use the workforce system's PostgreSQL, authorization, audit, file-storage, and notification foundations after review. Workforce roles and scopes remain authoritative. Ticket, Assignment, Schedule, Project, Client, and Work Log remain distinct. Ticket-specific storage or permission restrictions are not imported automatically.

## Architecture decision register

| ID | Decision | Status |
|---|---|---|
| ADR-001 | Next.js App Router and TypeScript | Current recommendation |
| ADR-002 | Modular monolith | Current recommendation |
| ADR-003 | PostgreSQL authoritative store | Current recommendation |
| ADR-004 | Drizzle and versioned migrations | Current recommendation |
| ADR-005 | No dedicated backend initially | Current recommendation |
| ADR-006 | Server-side authorization | Confirmed constraint |
| ADR-007 | Mock authentication adapter | Confirmed Version 1 direction |
| ADR-008 | Provider-neutral object storage | Current recommendation |
| ADR-009 | Provider-neutral static map | Confirmed boundary |
| ADR-010 | Transactional audit and notifications | Current recommendation |
| ADR-011 | Independently testable scheduling and coverage engines | Current recommendation |
| ADR-012 | UTC instants and explicit business timezone/date handling | Current recommendation |
| ADR-013 | Optimistic concurrency for critical records | Current recommendation |
| ADR-014 | Dedicated workers/services only when justified | Current recommendation |
| ADR-015 | Ticket System remains Phase 12 | Confirmed constraint |

## Decision records

### ADR-001 — Next.js App Router and TypeScript

- **Context:** Version 1 is one responsive internal web application with substantial server-side policy.
- **Decision:** Use Next.js App Router with TypeScript as the initial full-stack framework.
- **Reason:** It supports typed UI and server code in one deployable system while keeping server-only boundaries.
- **Consequences:** Framework entry points remain thin; domain logic cannot depend on React.
- **Alternatives considered:** Separate SPA/API, another full-stack web framework.
- **Reconsider when:** Multiple independent clients or framework constraints create a demonstrated limitation.

### ADR-002 — Modular monolith

- **Context:** Domain complexity is high, but operational scale and team size do not justify distributed services.
- **Decision:** Use one deployable application with explicit module, service, repository, and adapter boundaries.
- **Reason:** It minimizes operational overhead without sacrificing separation of concerns.
- **Consequences:** Cross-module access requires deliberate contracts; extraction remains possible.
- **Alternatives considered:** Layerless monolith, microservices from inception.
- **Reconsider when:** A module needs independent scale, ownership, release cadence, or isolation.

### ADR-003 — PostgreSQL authoritative store

- **Context:** Workforce planning relies on relationships, constraints, transactions, concurrency, and reporting.
- **Decision:** Store authoritative structured data in PostgreSQL.
- **Reason:** Relational integrity and transactional tools match the domain.
- **Consequences:** Schema and migrations are first-class; one-large-JSON storage is rejected.
- **Alternatives considered:** Document database, file/JSON persistence.
- **Reconsider when:** A bounded workload has proven non-relational needs; PostgreSQL remains authoritative for core records.

### ADR-004 — Drizzle and versioned migrations

- **Context:** TypeScript code needs controlled SQL-oriented access to PostgreSQL.
- **Decision:** Use Drizzle ORM with one version-controlled migration workflow; allow reviewed SQL for unsupported PostgreSQL features.
- **Reason:** It preserves SQL visibility and constraint/index control.
- **Consequences:** Do not mix ORMs; schema changes require repeatable migrations.
- **Alternatives considered:** Prisma, handwritten SQL only.
- **Reconsider when:** Implementation validation shows a material capability or maintenance gap.

### ADR-005 — No dedicated backend initially

- **Context:** One internal web client and modest scale do not require a separately deployed API.
- **Decision:** Use the Next.js server layer for initial backend responsibilities.
- **Reason:** It avoids premature API, deployment, and authentication duplication.
- **Consequences:** Server code must still use clean services, repositories, transactions, and authorization.
- **Alternatives considered:** Separate Node API from Phase 1.
- **Reconsider when:** Independent clients, public APIs, persistent streaming, isolation, or separate scaling becomes real.

### ADR-006 — Server-side authorization

- **Context:** The system contains scope-limited and sensitive data with strict role boundaries.
- **Decision:** Enforce every protected read and mutation on the server using role plus contextual policy.
- **Reason:** Frontend visibility is not a security boundary.
- **Consequences:** Negative permission and out-of-scope tests are mandatory.
- **Alternatives considered:** UI-only checks, role-only checks.
- **Reconsider when:** Never for protected operations; implementation mechanisms may change, not the constraint.

### ADR-007 — Mock authentication adapter

- **Context:** Version 1 requires mock personas while future enterprise identity remains open.
- **Decision:** Use a replaceable mock provider that establishes normal server sessions and flows through standard authorization.
- **Reason:** Phase 1 can test real access boundaries without coupling domain rules to an identity vendor.
- **Consequences:** Mock mode is labeled and cannot be enabled accidentally in production.
- **Alternatives considered:** Hard-coded UI identity, selecting enterprise identity immediately.
- **Reconsider when:** A final production identity provider is selected.

### ADR-008 — Provider-neutral object storage

- **Context:** Private certification, portfolio, CV, and supporting files require protected storage.
- **Decision:** Keep file metadata in PostgreSQL and bytes in private object storage behind an adapter.
- **Reason:** It supports authorization and provider replacement without large database binaries or permanent public URLs.
- **Consequences:** Upload, preview, and download require authorization; provider and retention remain open.
- **Alternatives considered:** PostgreSQL binary storage, public URLs, production local disk.
- **Reconsider when:** Security, compliance, volume, or provider constraints require a specialized design.

### ADR-009 — Provider-neutral static map

- **Context:** The map visualizes stored data and Published plans, not live movement.
- **Decision:** Use a provider-neutral adapter and ordinary coordinates initially; do not require PostGIS.
- **Reason:** The expected dataset and queries are small, while provider and privacy rules remain open.
- **Consequences:** Role/scope filtering occurs before data return; no GPS ingestion or route history exists.
- **Alternatives considered:** Provider-coupled map logic, PostGIS from inception, live tracking.
- **Reconsider when:** Large-scale spatial queries or a confirmed feature requires advanced geospatial support.

### ADR-010 — Transactional audit and notifications

- **Context:** Schedule, leave, and replacement changes must not be partially recorded.
- **Decision:** Write the primary state change, audit event, and in-app notification in one transaction where practical.
- **Reason:** Atomicity keeps operational state, governance history, and user awareness consistent.
- **Consequences:** External delivery later uses a transactional outbox rather than direct provider calls in the main transaction.
- **Alternatives considered:** Best-effort audit/notification writes after commit.
- **Reconsider when:** External event volume justifies a dedicated event pipeline while preserving delivery guarantees.

### ADR-011 — Independently testable scheduling and coverage engines

- **Context:** Conflict, coverage, and replacement rules are the central business complexity.
- **Decision:** Implement them as normalized, framework-independent domain services with explicit findings.
- **Reason:** Rules remain testable, reusable, explainable, and extractable.
- **Consequences:** React, map, identity, hosting, and notification libraries cannot be dependencies of the engines.
- **Alternatives considered:** Logic embedded in schedule UI or database queries alone.
- **Reconsider when:** Engine boundaries need refinement; independence remains required.

### ADR-012 — UTC instants and explicit business timezone/date handling

- **Context:** Assignments, recurring work, locations, and full-day leave have different time semantics.
- **Decision:** Persist instants with timezone awareness, use UTC where appropriate, retain business timezone, and model full-day leave as dates.
- **Reason:** It avoids browser-local ambiguity and recurrence errors.
- **Consequences:** Date/time conversion is centralized and tested; open work/holiday policies stay unresolved.
- **Alternatives considered:** Browser-local timestamps, timezone-free storage.
- **Reconsider when:** Final business-time policy adds requirements without weakening explicit semantics.

### ADR-013 — Optimistic concurrency for critical records

- **Context:** Multiple authorized managers may edit related planning and operational records.
- **Decision:** Detect stale critical updates using versions/timestamps and transactional checks.
- **Reason:** Silent last-write-wins could lose schedule, leave, scope, or note changes.
- **Consequences:** Users receive explicit conflicts and reload/retry guidance.
- **Alternatives considered:** Unconditional overwrites, pessimistic locks for every edit.
- **Reconsider when:** Contention data shows selected workflows need stronger locking.

### ADR-014 — Dedicated workers/services only when justified

- **Context:** Confirmed Version 1 workflows are request/response and modest in scale.
- **Decision:** Do not add a worker, queue, or separate service until a measured workload requires it.
- **Reason:** It avoids premature infrastructure while preserving extraction boundaries.
- **Consequences:** Long-running or external-delivery work must be identified before it harms request latency or reliability.
- **Alternatives considered:** Queue and workers from Phase 1.
- **Reconsider when:** Scheduled, heavy, high-volume, persistent, or independently scaled processing appears.

### ADR-015 — Ticket System remains Phase 12

- **Context:** Existing ticket functionality may contain reuse candidates but is not the workforce foundation.
- **Decision:** Inspect and integrate selected ticket capabilities only after Phases 1–11 are stable.
- **Reason:** Workforce roles, scopes, domains, storage, and privacy must remain authoritative.
- **Consequences:** Ticket, Assignment, Schedule, Project, Client, and Work Log remain distinct.
- **Alternatives considered:** Starting from or immediately merging the Ticket System.
- **Reconsider when:** The roadmap is explicitly re-approved and all canonical product-memory files are updated; the foundation constraint remains.

## Open technical decisions

The following are not finalized and do not block creation of this architecture memory:

- Final hosting provider
- Final PostgreSQL provider
- Development database approach
- Final object-storage provider
- Final map provider
- Final geocoding provider
- Final authentication provider
- Exact session implementation
- Exact UI component system
- Exact calendar/scheduler UI library
- Exact recurring-schedule representation
- Exact PostgreSQL overlap-constraint design
- Exact schema and table design
- Exact encryption approach for sensitive fields
- Exact backup and recovery policy
- Exact external-job or queue provider if later needed
- Repository strategy for Phase 12 Ticket integration
- Exact package versions at implementation time

Product-policy decisions—including address precision, Admin scope dimensions, work patterns, leave calendars, certification verification, warning severities, note-edit rights, and travel-time policy—remain governed by [`DECISIONS_AND_CONSTRAINTS.md`](DECISIONS_AND_CONSTRAINTS.md).

## Architecture change conditions

An architecture recommendation changes only when evidence shows a current constraint or workload is no longer met. Relevant evidence includes security or compliance requirements, measured concurrency/load, independent client/API demand, operational reliability, deployment limits, team ownership, persistent background processing, or a confirmed product change.

Any change must:

1. Preserve confirmed product role, privacy, scheduling, leave, communication, map, and Ticket boundaries.
2. Record the new context, decision, consequences, migration path, and replaced ADR status.
3. Update this file and the related canonical memory files.
4. Add or update tests for the affected boundary.
5. Avoid presenting an implementation convenience as a product requirement.

## Phase 1 architecture acceptance checks

Before Phase 1 architecture is considered established, implementation evidence must show:

- Server-side authorization and Admin-scope enforcement for protected paths
- Mock sessions using the standard authorization path
- Clear module/service/repository boundaries
- One authoritative PostgreSQL schema and migration workflow
- No browser-to-database privileged access
- Transaction patterns for critical state, audit, and notifications
- Optimistic-concurrency handling for selected critical records
- Provider adapters for identity, storage, and map boundaries
- Unit, integration, component, end-to-end, and negative-permission test foundations
- No dependency on Ticket functionality before Phase 12

These checks describe future implementation acceptance. They do not claim that implementation has occurred.
