import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase11Journey } from "./phase11-test-fixtures.mjs";

const port = await allocateLoopbackPort();
let exitCode = 1;
try {
  await withDisposableTestDatabase("phase11_browser", async ({ databaseUrl, env }) => {
    await seedPhase11Journey(databaseUrl);
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.phase11.config.ts"], { cwd: repositoryRoot, env: { ...env, SCOPEIS_PHASE11_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 420_000 });
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Phase 11 reporting journey timed out.");
  });
} finally { process.stdout.write("Phase 11 browser disposable database cleanup complete.\n"); }
process.exitCode = exitCode;
