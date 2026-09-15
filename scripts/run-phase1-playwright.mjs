import { join } from "node:path";
import {
  allocateLoopbackPort,
  repositoryRoot,
} from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
const port = await allocateLoopbackPort();

let exitCode = 1;
await withDisposableTestDatabase("phase1_playwright", async ({ env }) => {
  const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "@playwright", "test", "cli.js"), "test", ...process.argv.slice(2)], {
    cwd: repositoryRoot, env: { ...env, SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 120_000,
  });
  exitCode = result.exitCode;
  if (result.timedOut) throw new Error("Phase 1 Playwright suite timed out.");
});
process.exitCode = exitCode;
