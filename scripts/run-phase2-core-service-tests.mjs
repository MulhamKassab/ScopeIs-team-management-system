import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";

let exitCode = 1;
try {
  await withDisposableTestDatabase("phase2_core", async ({ env }) => {
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/integration/phase2-core-service.test.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env });
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Phase 2 core service suite timed out.");
  });
} finally {
  process.stdout.write("Phase 2 core service disposable database cleanup complete.\n");
}
process.exitCode = exitCode;
