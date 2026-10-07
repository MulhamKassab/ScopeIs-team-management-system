# ScopeIs Team Management System

Phase 1 foundation for a responsive internal workforce-planning application. This repository contains Phase 1 only; employee management, scheduling, planning maps, leave, coverage, replacements, reporting, and Ticket System integration are intentionally not implemented.

## Architecture

- Next.js App Router and TypeScript
- PostgreSQL with Drizzle migrations
- Development/test mock server sessions
- Centralized Super Admin, Admin, and Employee role/scope authorization

## Local setup

Prerequisites: Node.js 22+, npm, and PostgreSQL.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Use only a local development database in `.env`. The supplied mock personas are fictional and mock authentication is restricted to development/test; it must never be enabled for production use.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Do not commit credentials, real employee data, or local environment files.

## Documentation

See `DOCX/INDEX.md` for canonical requirements and design references, and `DOCX/phase-reports/PHASE_1_FOUNDATION_IMPLEMENTATION_REPORT.md` for Phase 1 implementation evidence.
