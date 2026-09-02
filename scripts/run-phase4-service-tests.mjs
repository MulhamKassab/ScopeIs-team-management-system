import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";

let exitCode = 1;
try {
  await withDisposableTestDatabase("phase4_scheduling", async ({ databaseUrl, env }) => {
    await seedPhase4Journey(databaseUrl);
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/integration/phase4-scheduling-service.test.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env, timeoutMs: 240_000 });
    exitCode = result.exitCode; if (result.timedOut) throw new Error("Phase 4 scheduling service suite timed out.");
  });
} finally { process.stdout.write("Phase 4 scheduling service disposable database cleanup complete.\n"); }
process.exitCode = exitCode;
