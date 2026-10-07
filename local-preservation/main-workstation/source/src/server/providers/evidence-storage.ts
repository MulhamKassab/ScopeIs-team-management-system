import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { env } from "@/server/env";
import { errors } from "@/shared/errors/app-error";
import { validatePrivateUpload, vercelBlobPrivateStorage } from "@/server/providers/vercel-blob-provider";

/**
 * Authoritative provider-neutral private evidence storage boundary.
 * Callers never see a provider, a public URL, or a user-supplied key: the service generates opaque
 * keys, and every read is authorized in the application before this interface is reached.
 */
export interface EvidenceStorage {
  put(input: { storageKey: string; bytes: Uint8Array; contentType: string }): Promise<void>;
  read(storageKey: string): Promise<Uint8Array | null>;
  remove(storageKey: string): Promise<void>;
}

/** Object keys are server-generated and never contain a user filename. */
export function evidenceObjectKey(input: { ownerUserId: string; extension: string }) {
  const owner = input.ownerUserId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "unknown";
  return `evidence/${owner}/${randomUUID()}.${input.extension}`;
}

function resolveWithinRoot(root: string, storageKey: string) {
  const target = resolve(root, storageKey);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw errors.validation();
  return target;
}

export function createLocalEvidenceStorage(root: string): EvidenceStorage {
  const base = resolve(root);
  return {
    async put({ storageKey, bytes }) {
      const target = resolveWithinRoot(base, storageKey);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
    },
    async read(storageKey) {
      try { return new Uint8Array(await readFile(resolveWithinRoot(base, storageKey))); }
      catch (error) { if (error instanceof Error && "code" in error && (error as { code?: string }).code === "ENOENT") return null; throw error; }
    },
    async remove(storageKey) { await rm(resolveWithinRoot(base, storageKey), { force: true }); },
  };
}

/**
 * The preserved Vercel Blob helper is encapsulated here as the production adapter candidate. It is
 * never selected in tests; the SDK is unreachable from the test process.
 */
export const vercelEvidenceStorage: EvidenceStorage = {
  async put({ storageKey, bytes, contentType }) {
    validatePrivateUpload({ type: contentType, size: bytes.byteLength, name: storageKey });
    await vercelBlobPrivateStorage.putBytes(storageKey, bytes, contentType);
  },
  async read(storageKey) { return vercelBlobPrivateStorage.readBytes(storageKey); },
  async remove(storageKey) { await vercelBlobPrivateStorage.archive(storageKey); },
};

export const unconfiguredEvidenceStorage: EvidenceStorage = {
  async put() { throw errors.providerNotConfigured(); },
  async read() { throw errors.providerNotConfigured(); },
  async remove() { throw errors.providerNotConfigured(); },
};

export function defaultLocalEvidenceRoot() { return join(tmpdir(), `scopeis-evidence-${process.pid}`); }

let cached: EvidenceStorage | undefined;

/** Resolves the configured adapter. Production fails closed unless a real adapter is selected. */
export function evidenceStorage(): EvidenceStorage {
  if (cached) return cached;
  const configuration = env();
  if (configuration.EVIDENCE_STORAGE_MODE === "local") {
    if (configuration.APP_ENV === "production") throw errors.providerNotConfigured();
    cached = createLocalEvidenceStorage(defaultLocalEvidenceRoot());
    return cached;
  }
  if (configuration.EVIDENCE_STORAGE_MODE === "vercel") { cached = vercelEvidenceStorage; return cached; }
  throw errors.providerNotConfigured();
}

/** Test seam so suites can point the resolver at an owned temporary directory. */
export function setEvidenceStorageForTesting(storage: EvidenceStorage | undefined) { cached = storage; }
