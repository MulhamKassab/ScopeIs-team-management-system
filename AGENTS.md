# ScopeIs Team Management System

- Documentation-first decisions in this repository are canonical.
- Read `PROJECT_CONTEXT.md` and `DOCX/INDEX.md` before making changes.
- Read `DOCX/project-memory/SYSTEM_ARCHITECTURE_DECISIONS.md` before scaffolding, creating database schemas, selecting providers, implementing authentication or scheduling, adding background services, or integrating the Ticket System.
- Preserve the confirmed Super Admin, Admin, and Employee role boundaries.
- Keep system roles separate from job designations and assignment arrangements.
- Do not treat the existing Ticket System as this product's foundation; integration is Phase 9.
- Do not implement unresolved decisions as assumptions.
- Update the relevant project-memory documents whenever confirmed requirements change.
- For approved UI implementation work, use `DOCX/project-memory/UI_UX_FOUNDATION.md` as the canonical Phase 1 design foundation; later-phase UX must preserve its accessibility, responsive, role-boundary, and RTL principles.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
