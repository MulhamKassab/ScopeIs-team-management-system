# Persistent company demo workspace

Confirmed 2026-10-06: the product owner approved a separate persistent fictional company demo and asked that its data reflect the current application features.

The existing production workspace, local company simulation, prototype, Preview checkout and recovery branch are preserved. The hosted demo uses a separate named PostgreSQL database (`scopeis_company_demo`) and dedicated application database role (`scopeis_company_demo_owner`) with privileges on the demo schema, plus a separate Vercel project. It uses the canonical schema and password authentication; it never enables hosted mock authentication. A visible Demo workspace label identifies fictional data.

The dataset contains 18 workforce profiles with independent system roles, job designations and recorded skills; six clients, twelve projects, six planning locations; current and previous Published months and upcoming Draft/Proposed work; independent staffing and assignment requirements; annual leave states; pending replacement/coverage decisions; evidence review and expiry states; shared notes and superseded versions; management notes; replacement discussions, notifications and safe audit events. Coordinates describe fictional planning sites, never employee homes. No attendance, tracking, certification eligibility, arrangement-based availability, ranking, overrides or Ticket behavior is inferred.

Nora remains Super Admin; Ava and Ben remain separately scoped Admins; Cora and Dan remain Employees. Only the five established demonstration identities receive initial login credentials. Inactive workforce records remain visible to Super Admin and are excluded from scheduling. Demonstration evidence is explicitly fictional; no nonexistent file object is represented as a downloadable attachment.

Initialization is explicit, transactionally atomic and restricted to an empty dedicated demo target with the complete immutable migration ledger. Dry runs roll back. A safe audit marker records the dataset version and base date. Re-running preserves subsequent edits, credentials and historical records. Builds, page requests and redeployments never reseed. Tests may use only named disposable loopback databases, whose creation and cleanup are separately guarded.

The initial base date is 2026-10-06 in the approved Asia/Dubai planning timezone. Future updates are deliberate business-data maintenance, not automatic regeneration. Existing production settings and data are never copied into or changed by demo initialization.
