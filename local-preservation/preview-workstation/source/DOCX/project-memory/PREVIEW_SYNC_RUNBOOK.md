# Preview synchronization runbook

## Purpose

`main` is the authoritative, persistent application. `preview` is a separate, database-free frontend demonstration using only TypeScript fixtures. This runbook does not change any real implementation phase status.

## After an approved main development checkpoint

1. In the isolated Preview worktree, fetch `origin`.
2. Record the current `preview`, `origin/preview`, and `origin/main` commits plus worktree status.
3. Merge `origin/main` into `preview` without rewriting either history.
4. Keep confirmed product terms, role/privacy rules, and domain changes from `main`.
5. Keep `src/preview/` as the sole runtime data source and preserve the fixture-only route layer.
6. Update fixture relationships, labels, and scope presentation for any changed main-domain rule.
7. Run Preview fixture tests, lint, typecheck, and a build with database/storage variables absent.
8. Perform desktop and mobile role QA, then commit and push only `preview`.

## Boundaries

- Never merge Preview fixtures, presentation-only personas, or non-persistent interaction behavior back into `main` automatically.
- Move an approved frontend component to `main` only in a separate reviewed task.
- Never attach Preview to Neon, Blob, a production environment, or a substitute persistence provider.
- Historical database bootstrap evidence remains in `SCOPEIS_PREVIEW_DATABASE_BOOTSTRAP_R1.md`; it is superseded for runtime by the database-free conversion report.
