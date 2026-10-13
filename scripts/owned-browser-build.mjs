import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { runChild } from "./disposable-test-database.mjs";

// Playwright force-stops its webServer tree on Windows, bypassing the inner
// build worker's finally. The outer caller therefore retains the exact checkout.
export async function withOwnedBrowserBuild(callback, { phase1 = false } = {}) {
  const temporaryRoot = resolve(tmpdir());
  const prefix = phase1 ? "scopeis-phase1-server-" : "scopeis-phase2-safe-build-";
  const directory = resolve(await mkdtemp(join(temporaryRoot, prefix)));
  function assertOwnedDirectory(path) {
    if (dirname(path) !== temporaryRoot || !basename(path).startsWith(prefix)) throw new Error("Browser build cleanup refused a path outside its owned direct temporary-directory child.");
  }
  assertOwnedDirectory(directory);
  process.stdout.write(`${JSON.stringify({ event: "browser_build_directory_allocated", ownerPid: process.pid, directory })}\n`);
  const env = { [phase1 ? "SCOPEIS_PHASE1_SERVER_DIRECTORY" : "SCOPEIS_SAFE_BUILD_DIRECTORY"]: directory };
  try {
    return await callback({ directory, env });
  } finally {
    assertOwnedDirectory(directory);
    const entry = await lstat(directory).catch((error) => { if (error.code === "ENOENT") return null; throw error; });
    if (entry) {
      if (entry.isSymbolicLink()) throw new Error("Browser build cleanup refused a replaced checkout symlink.");
      const actualRoot = await realpath(temporaryRoot);
      const actualDirectory = await realpath(directory);
      if (dirname(actualDirectory) !== actualRoot || !basename(actualDirectory).startsWith(prefix)) throw new Error("Browser build cleanup refused a resolved path outside its owned temporary directory.");
      await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
    process.stdout.write(`${JSON.stringify({ event: "browser_build_directory_cleanup_complete", ownerPid: process.pid, directory })}\n`);
  }
}

export async function runBrowserWithOwnedBuild(command, args, options, buildOptions) {
  return withOwnedBrowserBuild(({ env }) => runChild(command, args, { ...options, env: { ...options.env, ...env } }), buildOptions);
}
