import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase9Journey } from "./phase9-test-fixtures.mjs";

const port = await allocateLoopbackPort();
let exitCode = 1; try { await withDisposableTestDatabase("phase9_browser", async ({ databaseUrl, env }) => { await seedPhase9Journey(databaseUrl); const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.phase9.config.ts"], { cwd: repositoryRoot, env: { ...env, SCOPEIS_PHASE9_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 300_000 }); exitCode = result.exitCode; if (result.timedOut) throw new Error("Phase 9 evidence journey timed out."); }); } finally { process.stdout.write("Phase 9 browser disposable database cleanup complete.\n"); } process.exitCode = exitCode;
