import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { runBrowserWithOwnedBuild } from "./owned-browser-build.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
import { seedPhase8MapJourney } from "./phase8-test-fixtures.mjs";
import { assertUsabilityStoredTextPreserved, seedUsabilityReview } from "./usability-review-test-fixtures.mjs";
const port = await allocateLoopbackPort(); let exitCode = 1;
try {
  await withDisposableTestDatabase("usability_review_browser", async ({ databaseUrl, env }) => {
    await seedPhase4Journey(databaseUrl); await seedPhase8MapJourney(databaseUrl); await seedUsabilityReview(databaseUrl);
    const result = await runBrowserWithOwnedBuild(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.usability.config.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env: { ...env, SCOPEIS_USABILITY_E2E: "true", SCOPEIS_PHASE5_E2E: "true", SCOPEIS_PHASE8_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 1_200_000 });
    await assertUsabilityStoredTextPreserved(databaseUrl);
    exitCode = result.exitCode; if (result.timedOut) throw new Error("Usability review browser checks timed out.");
  });
} finally { process.stdout.write("Usability review disposable database/build cleanup complete.\n"); }
process.exitCode = exitCode;
