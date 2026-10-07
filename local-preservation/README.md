# Local workstation preservation — 7 October 2026

All 1,130 files currently present in the two original workstations have been read and verified. The final download pass recovered the 16 previously unreadable iCloud files with hashes matching their archived content; see `final-recovery-pass.json`. Two tracked main-workstation test files that explain the original 1,132 versus current 1,130 inventory difference are now absent from disk: `test/e2e/account-administration.spec.ts` and `test/e2e/phase11-reporting.spec.ts`. Their original Git index versions match live GitHub and have been included with explicit missing-original provenance. Their raw original working-tree bytes remain unavailable because the paths are already absent. This is recorded as a historical warning; every current original file is included and byte verified. See `verification-limits.json`. When restoring the current raw working-tree state, omit the two entries marked `original_path_missing`; their archived content is a separate historical recovery copy.

The `codex/local-preservation-20261007` branch preserves the ScopeIs main and preview workstations before removing their original local folders. The application `main` and `preview` branches are unchanged.

Each workstation directory contains:

- `source/`: byte-preserved source, documentation, design files, assets and other non-generated local files, including previously untracked files.
- `manifest.json`: original relative paths, SHA-256 content hashes and preservation locations. Symlink targets are recorded in the manifest.
- `private-backup.aesgcm`: authenticated encryption of local configuration, credentials, database files and other sensitive files when present.

Dependency folders, Git metadata directories, build outputs and caches are excluded; Git history remains in this repository. The main workstation includes `prototype/full-frontend-r1/` and `scripts/remediate-r2-persistent-test-incident.mjs`. The preview includes the five previously untracked duplicate source files.

The encryption recovery key is intentionally stored outside GitHub at the local preservation run's `private-backup/recovery-key.hex`. Keep that key with the preservation run at `/Users/mulhamkassab/.codex/project-preservation/20261007T153451Z`; it is required to restore encrypted configuration and data. Never commit it or decrypted backup content.

Encrypted bundle format: ASCII `CODEX-PRESERVE-AESGCM-1\n`, two-byte big-endian AAD length, UTF-8 AAD label, twelve-byte nonce, then AES-256-GCM ciphertext including authentication tag. Decrypted payload is a gzip-compressed tar archive. Use the original manifest to verify every restored file.
