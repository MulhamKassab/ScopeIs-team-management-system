import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
let exitCode = 1; try { await withDisposableTestDatabase("phase5_browser", async ({ databaseUrl, env }) => { await seedPhase4Journey(databaseUrl); const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.phase5.config.ts"], { cwd: repositoryRoot, env: { ...env, SCOPEIS_PHASE5_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: "4315" }, timeoutMs: 240_000 }); exitCode = result.exitCode; }); } finally { process.stdout.write("Phase 5 browser disposable database cleanup complete.\n"); } process.exitCode = exitCode;
