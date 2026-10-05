import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase11Journey } from "./phase11-test-fixtures.mjs";
import { seedPhase8MapJourney } from "./phase8-test-fixtures.mjs";
import { seedResponsiveEdgeCases } from "./responsive-test-fixtures.mjs";

const port = await allocateLoopbackPort();
let exitCode = 1;
try {
  await withDisposableTestDatabase("responsive_browser", async ({ databaseUrl, env }) => {
    await seedPhase11Journey(databaseUrl);
    await seedPhase8MapJourney(databaseUrl);
    await seedResponsiveEdgeCases(databaseUrl);
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.responsive.config.ts", ...process.argv.slice(2)], {
      cwd: repositoryRoot,
      env: { ...env, SCOPEIS_RESPONSIVE_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port) },
      timeoutMs: 900_000,
    });
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Responsive browser checks timed out.");
  });
} finally {
  process.stdout.write("Responsive browser disposable database cleanup complete.\n");
}
process.exitCode = exitCode;
