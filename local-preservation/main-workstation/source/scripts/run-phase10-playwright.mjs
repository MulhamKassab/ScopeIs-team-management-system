import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase10Journey } from "./phase10-test-fixtures.mjs";

const port = await allocateLoopbackPort();
let exitCode = 1;
try {
  await withDisposableTestDatabase("phase10_browser", async ({ databaseUrl, env }) => {
    await seedPhase10Journey(databaseUrl);
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.phase10.config.ts"], { cwd: repositoryRoot, env: { ...env, SCOPEIS_PHASE10_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 420_000 });
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Phase 10 collaboration journey timed out.");
  });
} finally { process.stdout.write("Phase 10 browser disposable database cleanup complete.\n"); }
process.exitCode = exitCode;
