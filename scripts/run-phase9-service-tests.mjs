import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase9Journey } from "./phase9-test-fixtures.mjs";

let exitCode = 1;
try {
  await withDisposableTestDatabase("phase9_evidence", async ({ databaseUrl, env }) => {
    await seedPhase9Journey(databaseUrl);
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/integration/phase9-evidence-service.test.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env, timeoutMs: 240_000 });
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Phase 9 evidence service suite timed out.");
  });
} finally { process.stdout.write("Phase 9 evidence service disposable database cleanup complete.\n"); }
process.exitCode = exitCode;
