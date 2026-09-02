import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";

let exitCode = 1;
try {
  await withDisposableTestDatabase("phase3_operations", async ({ env }) => {
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/integration/phase3-operational-service.test.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env, timeoutMs: 180_000 });
    exitCode = result.exitCode; if (result.timedOut) throw new Error("Phase 3 operational service suite timed out.");
  });
} finally { process.stdout.write("Phase 3 operational service disposable database cleanup complete.\n"); }
process.exitCode = exitCode;
