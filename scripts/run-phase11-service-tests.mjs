import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase11Journey } from "./phase11-test-fixtures.mjs";

let exitCode = 1;
try {
  await withDisposableTestDatabase("phase11_reporting", async ({ databaseUrl, env }) => {
    await seedPhase11Journey(databaseUrl);
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/integration/phase11-reporting-service.test.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env, timeoutMs: 300_000 });
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Phase 11 reporting service suite timed out.");
  });
} finally { process.stdout.write("Phase 11 reporting service disposable database cleanup complete.\n"); }
process.exitCode = exitCode;
