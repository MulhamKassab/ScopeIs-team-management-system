import { join } from "node:path";
import {
  allocateLoopbackPort,
  repositoryRoot,
} from "./phase1-test-environment.mjs";
import { withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { runBrowserWithOwnedBuild } from "./owned-browser-build.mjs";
const port = await allocateLoopbackPort();

let exitCode = 1;
await withDisposableTestDatabase("phase1_playwright", async ({ env }) => {
  const result = await runBrowserWithOwnedBuild(process.execPath, [join(repositoryRoot, "node_modules", "@playwright", "test", "cli.js"), "test", ...process.argv.slice(2)], {
    cwd: repositoryRoot, env: { ...env, SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 720_000,
  }, { phase1: true });
  exitCode = result.exitCode;
  if (result.timedOut) throw new Error("Phase 1 Playwright suite timed out.");
});
process.exitCode = exitCode;
