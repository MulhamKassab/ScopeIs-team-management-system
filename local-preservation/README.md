# Local workstation preservation — 7 October 2026

This archive is incomplete as a full raw-workstation backup: 12 main scripts and 4 preview source files remain unreadable iCloud placeholders after repeated download attempts. Their paths are listed in the manifests; their committed GitHub versions have been included using original Git index blobs that match the live branch and recorded byte sizes. Their index metadata is recorded in `git-index-provenance.json`; these 16 entries explicitly record that the raw original bytes remain unverified. Keep both original folders until those raw file bytes and the initial inventory difference are resolved. See `verification-limits.json`.

The `codex/local-preservation-20261007` branch preserves the ScopeIs main and preview workstations before removing their original local folders. The application `main` and `preview` branches are unchanged.

Each workstation directory contains:

- `source/`: byte-preserved source, documentation, design files, assets and other non-generated local files, including previously untracked files.
- `manifest.json`: original relative paths, SHA-256 content hashes and preservation locations. Symlink targets are recorded in the manifest.
- `private-backup.aesgcm`: authenticated encryption of local configuration, credentials, database files and other sensitive files when present.

Dependency folders, Git metadata directories, build outputs and caches are excluded; Git history remains in this repository. The main workstation includes `prototype/full-frontend-r1/` and `scripts/remediate-r2-persistent-test-incident.mjs`. The preview includes the five previously untracked duplicate source files.

The encryption recovery key is intentionally stored outside GitHub at the local preservation run's `private-backup/recovery-key.hex`. Keep that key with the preservation run at `/Users/mulhamkassab/.codex/project-preservation/20261007T153451Z`; it is required to restore encrypted configuration and data. Never commit it or decrypted backup content.

Encrypted bundle format: ASCII `CODEX-PRESERVE-AESGCM-1\n`, two-byte big-endian AAD length, UTF-8 AAD label, twelve-byte nonce, then AES-256-GCM ciphertext including authentication tag. Decrypted payload is a gzip-compressed tar archive. Use the original manifest to verify every restored file.
