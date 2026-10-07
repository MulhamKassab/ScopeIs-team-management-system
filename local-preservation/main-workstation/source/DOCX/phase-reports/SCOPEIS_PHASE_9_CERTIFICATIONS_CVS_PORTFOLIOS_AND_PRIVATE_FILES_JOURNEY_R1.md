# Phase 9 — Certifications, CVs, portfolios, and private files journey R1

**Classification:** `SCOPEIS_PHASE_9_COMPLETED_AND_PUSHED`

**Phase ID:** `SCOPEIS_PHASE_9_CERTIFICATIONS_CVS_PORTFOLIOS_AND_PRIVATE_FILES_JOURNEY_R1`

## 1. Journey delivered

`Employee submits capability evidence → evidence saves immediately → Super Admin is notified → Super Admin reviews or verifies the item → the owner sees the resulting state → the owner may update, replace a file, or archive the item`

An employee maintains certifications (issuer, issue date, optional expiry date, optional related skill, optional private supporting file), portfolio links and files, project examples, one active CV, and supporting capability documents from `/profile`. Every submission saves immediately, is flagged new or updated, and transactionally notifies every active Super Admin. Super Admin reviews and optionally verifies from the employee detail page and may remove verification or reset the review state. Nothing gates saving or owner visibility.

## 2. Locked privacy matrix (implemented and tested)

| Actor | Own evidence | Another employee's evidence | Files |
| --- | --- | --- | --- |
| Employee (owner) | Full create, update, archive, view, download | Non-enumerating 404 | Own files only |
| Super Admin | Own as owner | Full metadata for review; verification controls | Authorized read for review, audited as `evidence.file_read_by_reviewer` |
| Scoped Admin (TEAM scope match) | Own as owner | **Certification summary only**: title, issuer, issue/expiry dates, related skill, verification state | None. CVs, supporting documents, portfolio links/files, project-example detail, previews, and downloads are withheld |
| Scoped Admin (out of scope) | Own as owner | Non-enumerating 404 | None |
| Other employee | n/a | Non-enumerating 404 | None |

Navigation hiding is never the control: every read, upload, review, and download is authorized server-side, and a foreign, archived, malformed, or nonexistent identifier returns the same refusal.

## 3. Data model and migration

Additive migration `0010_phase_9_evidence_files.sql` (journal index 10, `when` 1788843600000) extends the existing Phase 2 tables and adds no new table (the schema remains 29 tables).

| Change | Purpose |
| --- | --- |
| `employee_evidence.last_submitted_at` | Explicit owner-submission marker; review actions never touch it |
| `employee_evidence.submission_key` + partial unique index `(owner_user_id, submission_key) where submission_key is not null` | Tested create idempotency |
| `employee_evidence.verified_by_user_id`, `verified_at` | Separate verification provenance |
| `employee_evidence.details` | Narrative for project examples and supporting context |
| Partial unique index `(owner_user_id) where kind = 'cv' and archived_at is null` | Database-enforced one active CV per owner |
| Index `employee_evidence_review_idx` (`review_state`, `last_submitted_at`) | Review queue |
| `employee_files.uploader_user_id`, `version` + check `version > 0` | Uploader provenance and immutable file versions |
| Partial unique index `(evidence_id, version) where archived_at is null` | One active file per version |
| Index `employee_files_evidence_active_idx` | Authorized file lookup |

Existing foreign keys, unique constraints, the expiry ordering check, and both enums (`evidence_kind`, `evidence_review_state`) are unchanged. Migration ledger, journal, adoption manifest (`phase9EvidenceFiles` state), the migration-count state map, and the Drizzle↔SQL parity check were all updated together; `npm run test:migration` passes 8/8 including the schema-drift test that compares a migrated database with a `drizzle-kit export` of the TypeScript schema.

## 4. Lifecycle, review, and expiry

- Lifecycle: create, update, archive. No hard delete. Archived items leave active lists but retain history and remain readable by owner and Super Admin.
- One active CV per owner; creating a replacement archives the previous CV atomically inside the same transaction (advisory owner lock plus the partial unique index).
- File replacement archives the prior file row and creates the next version.
- Review lifecycle `unreviewed → reviewed → verified`, `verified ⇒ reviewed`, with verification removal and reset to unreviewed allowed. Each transition records actor and timestamp, clears the now-inapplicable provenance, writes an audit event, and notifies the owner (never self-notifying).
- An owner edit sets `last_submitted_at`, so the item is new/updated again. Review state stays Super Admin authority and is never changed by an owner edit.
- Expiry is derived at read time from the `Asia/Dubai` business date: `no_expiry`, `valid`, or `expired`. No expired flag is persisted and no expiring-soon threshold exists.

## 5. Private storage

One authoritative provider-neutral interface (`put`/`read`/`remove`) in `src/server/providers/evidence-storage.ts`, resolved by `EVIDENCE_STORAGE_MODE`:

- `local` outside production (the default): an owned OS temporary directory outside the repository, created per process.
- `vercel`: the preserved Vercel Blob helper, encapsulated behind the interface as the production adapter candidate (a byte-oriented `putBytes`/`readBytes` was added to it; its existing exports are intact).
- `unconfigured`: fails closed with `PROVIDER_NOT_CONFIGURED`; this is the default in production, and `local` is additionally refused in production.

Object keys are server-generated (`evidence/<ownerId>/<uuid>.<validated extension>`). User filenames never appear in keys, storage keys are never returned to a client, and no public or signed public URL exists. No new runtime dependency was added, and `@vercel/blob` is never reached by tests.

## 6. File validation and delivery

- Allowlist: PDF, JPEG, PNG, DOCX. Size 1 byte through 5 MiB.
- Real signature checks: `%PDF-`, JPEG SOI, PNG signature, and ZIP-based Office structure (`PK\x03\x04` plus `[Content_Types].xml` and `word/` members) for DOCX. A declared type that does not match the bytes is rejected.
- Filenames: path separators, traversal shapes, control characters, leading dots, double extensions, empty names, and over-long names are rejected; the stored extension is derived from the validated type.
- Delivery resolves by database file id, never by a client-supplied path. Responses carry a sanitized display filename, `Content-Disposition` (`inline` for JPEG/PNG/PDF, `attachment` for DOCX), the byte length, `Cache-Control: private, no-store, max-age=0`, and `X-Content-Type-Options: nosniff`.
- A malware-assessment boundary reports `scanned: false` honestly; no scanner is implemented and no misleading "scanned" state is persisted.

## 7. Notifications, audit, concurrency, and rollback

- Notifications: `evidence.created` and `evidence.updated` to every active Super Admin (excluding the owner), review/verification events to the owner, `relatedRecordType: "employee_evidence"`, written inside the source transaction. No title, issuer, filename, URL, or other content is included.
- Audit: `evidence.created`, `evidence.updated`, `evidence.archived`, `evidence.file_attached`, `evidence.file_replaced`, `evidence.reviewed`, `evidence.verified`, `evidence.verification_removed`, `evidence.review_reset`, and authorized Super Admin reads (`evidence.file_read_by_reviewer`). Metadata is limited to ids, kind, counts, state transitions, booleans, and safe file facts.
- Concurrency: `pg_advisory_xact_lock` on the owner plus row locks, optimistic `version` guards on evidence updates and file replacement, and database-enforced active-CV and active-file-version uniqueness.
- Rollback: bytes are written before commit; a database, audit, or notification failure removes the object (verified by a tracking-storage compensation test), and a storage failure leaves no committed row.

## 8. Coverage separation

Phase 9 does not change Phase 7. `employee_skills.verified` and `employee_skills.coverage_eligible` are untouched, the evidence module imports no Phase 7 service, and a regression test proves `coverageService.gaps` output is byte-identical before and after a certification is created and verified. The `9.9 optional configurable connection to coverage` sub-phase remains `DEFERRED` pending a product decision.

## 9. Information architecture

Evidence lives inside the employee's own profile and the authorized employee detail experience; no top-level Certifications navigation item was added. Each item carries `id="evidence-<evidenceId>"` so a Phase 9 notification can deep-link to `/employees/<userId>#evidence-<evidenceId>`. The Phase 10 notification centre remains unbuilt; Phase 9 only creates the required transaction records and related-record references.

## 10. Verification evidence

All databases were freshly created disposable loopback PostgreSQL databases with fictional data; all files were fictional bytes written to an owned temporary directory outside the repository.

| Gate | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run test:unit` | 15 files, 56/56 |
| `npm run test:component` | 11 files, 23/23, database-free |
| `npm run test:integration` | 9/9 suites including Phase 9 |
| Phase 2–9 focused service suites | 13, 7, 5, 3, 3, 5, 1, 10 |
| `npm run test:migration` | 8/8 including schema-drift parity |
| `npm run test:e2e` | 9/9 suites, 64/64, zero skipped |
| `npm run test:route-certification` | 12/12 (Phase 9 evidence routes added) |
| `npm run lint` | Pass |
| `npm run build:safe` | Pass |
| `npm run test:seed-smoke` | Pass, including fictional evidence and an opaque private file object |
| `npm run test:isolation` | 9/9 |
| `git diff --check` / `--cached --check` | Pass |

Phase 9 focused tests cover validation, HTTPS-only links, file signatures, expiry derivation, the review lifecycle, the full privacy matrix (owner, Super Admin, in-scope Admin, cross-team Admin, other employee), non-enumerating refusals, authorized delivery headers, storage round-trip and cleanup, create idempotency, active-CV uniqueness (including concurrent creation), stale-write rejection, storage/notification/audit failure rollback and compensation, archive semantics, and the unchanged Phase 7 coverage result. Desktop and mobile Playwright journeys cover the employee submission with a real private upload and header assertions, Super Admin review and verification, the owner observing the verified state, and archiving with preserved history.

## 11. Deferred, non-goals, and known debt

**Deferred by product decision:** whether verification affects coverage or replacement eligibility (`9.9`).

**Non-goals honoured:** no notification centre or audit interface (Phase 10), no reports/dashboards/exports (Phase 11), no Ticket attachments (Phase 12), no production provider configuration or credentials, no retention/purge automation, no malware-scanning service, no OCR/CV parsing, no AI or external certificate validation, no digital signatures, no public portfolios or public file URLs, no external notifications, no automatic coverage eligibility, and no top-level Certifications navigation item.

**Non-blocking debt:** the two isolated safe-build runners and the other pre-existing items recorded by the checkpoint remain; the archive success message is transient because the archived row immediately leaves the active list; a verified item whose details are later edited stays verified and is only flagged new/updated for Super Admin attention rather than being automatically demoted; retention and malware scanning remain boundaries rather than implementations.

## 12. Custody

Started from `e5920d8b1c1e9277f3c55e269a00719c401a9ece` (`docs: close post-phase-8 checkpoint`) on `main` at `0/0`. `prototype/full-frontend-r1/`, `scripts/remediate-r2-persistent-test-incident.mjs`, every `.env*` file, and the separate Preview worktree were preserved untouched. The commit and push result are recorded in the delivery message; Phase 10 was not started.
