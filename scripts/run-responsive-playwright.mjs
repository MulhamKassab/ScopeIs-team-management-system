import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { disposableStats, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase11Journey } from "./phase11-test-fixtures.mjs";
import { seedPhase8MapJourney } from "./phase8-test-fixtures.mjs";
import { seedResponsiveEdgeCases } from "./responsive-test-fixtures.mjs";
import { OwnedResponsiveProcesses, ResponsiveCancellation } from "./owned-responsive-processes.mjs";

// Register cancellation before allocating a directory, database or child process.
const owned = new OwnedResponsiveProcesses();
const deadline = Date.now() + 2_700_000;
let storageRoot;
let buildRoot;
let exitCode = 1;
try {
  const port = await allocateLoopbackPort();
  owned.throwIfCancelled();
  storageRoot = await mkdtemp(join(tmpdir(), "scopeis-responsive-browser-files-"));
  owned.throwIfCancelled();
  buildRoot = await mkdtemp(join(tmpdir(), "scopeis-phase2-safe-build-"));
  owned.throwIfCancelled();
  await withDisposableTestDatabase("responsive_browser", async ({ databaseUrl, env }) => {
    owned.throwIfCancelled();
    await seedPhase11Journey(databaseUrl);
    owned.throwIfCancelled();
    await seedPhase8MapJourney(databaseUrl);
    owned.throwIfCancelled();
    await seedResponsiveEdgeCases(databaseUrl);
    const environment = { ...env, SCOPEIS_DEMO_WORKSPACE: process.env.SCOPEIS_DEMO_WORKSPACE === "true" ? "true" : "false", SCOPEIS_RESPONSIVE_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port), EVIDENCE_STORAGE_MODE: "local", SCOPEIS_TEST_EVIDENCE_DIRECTORY: storageRoot, SCOPEIS_SAFE_BUILD_DIRECTORY: buildRoot };
    owned.spawn("server", process.execPath, [join(repositoryRoot, "scripts", "run-phase2-safe-build.mjs"), "--serve-port", String(port)], { cwd: repositoryRoot, env: environment, stdio: "inherit" });
    try {
      await owned.waitForServer(`http://127.0.0.1:${port}/login`, deadline);
      owned.spawn("browser", process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.responsive.config.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env: environment, stdio: "inherit" });
      exitCode = await owned.waitForExit("browser", deadline);
    } finally {
      // Stop both sibling roots before withDisposableTestDatabase drops its DB.
      await owned.stopAll();
    }
  });
} catch (error) {
  if (!(error instanceof ResponsiveCancellation)) throw error;
  process.stderr.write(`${error.message}\n`);
  exitCode = error.exitCode;
} finally {
  await owned.stopAll();
  if (storageRoot) await rm(storageRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  if (buildRoot) await rm(buildRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  const stats = disposableStats();
  process.stdout.write(`Responsive browser cleanup complete: ${stats.created} databases created, ${stats.dropped} dropped, ${stats.owned.length} retained; owned process trees stopped, build checkout and private fictional file directory removed.\n`);
  exitCode = owned.cancellationExitCode ?? exitCode;
  if (stats.created !== stats.dropped || stats.owned.length !== 0) exitCode = 1;
  owned.dispose();
  if (process.connected) process.disconnect();
}
process.exitCode = exitCode;
