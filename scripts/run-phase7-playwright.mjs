import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
const port = await allocateLoopbackPort();
let exitCode = 1; try { await withDisposableTestDatabase("phase7_browser", async ({ databaseUrl, env }) => { await seedPhase4Journey(databaseUrl); const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.phase7.config.ts"], { cwd: repositoryRoot, env: { ...env, SCOPEIS_PHASE7_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 240_000 }); exitCode = result.exitCode; }); } finally { process.stdout.write("Phase 7 browser disposable database cleanup complete.\n"); } process.exitCode = exitCode;
