import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";

const port = await allocateLoopbackPort(); let exitCode = 1;
await withDisposableTestDatabase("phase4_playwright", async ({ databaseUrl, env }) => { await seedPhase4Journey(databaseUrl); const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "@playwright", "test", "cli.js"), "test", "--config=playwright.phase4.config.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env: { ...env, SCOPEIS_PHASE4_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 360_000 }); exitCode = result.exitCode; if (result.timedOut) throw new Error("Phase 4 Playwright suite timed out."); });
process.exitCode = exitCode;
