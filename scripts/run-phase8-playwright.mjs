import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { runBrowserWithOwnedBuild } from "./owned-browser-build.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
import { seedPhase8MapJourney } from "./phase8-test-fixtures.mjs";
const port = await allocateLoopbackPort();
let exitCode = 1; try { await withDisposableTestDatabase("phase8_browser", async ({ databaseUrl, env }) => { await seedPhase4Journey(databaseUrl); await seedPhase8MapJourney(databaseUrl); const result = await runBrowserWithOwnedBuild(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.phase8.config.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env: { ...env, SCOPEIS_PHASE8_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 840_000 }); exitCode = result.exitCode; if (result.timedOut) throw new Error("Phase 8 browser journey timed out."); }); } finally { process.stdout.write("Phase 8 browser disposable database cleanup complete.\n"); } process.exitCode = exitCode;
