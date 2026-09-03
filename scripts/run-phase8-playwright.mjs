import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
import { seedPhase8MapJourney } from "./phase8-test-fixtures.mjs";
let exitCode = 1; try { await withDisposableTestDatabase("phase8_browser", async ({ databaseUrl, env }) => { await seedPhase4Journey(databaseUrl); await seedPhase8MapJourney(databaseUrl); const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.phase8.config.ts"], { cwd: repositoryRoot, env: { ...env, SCOPEIS_PHASE8_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: "4318" }, timeoutMs: 240_000 }); exitCode = result.exitCode; }); } finally { process.stdout.write("Phase 8 browser disposable database cleanup complete.\n"); } process.exitCode = exitCode;
