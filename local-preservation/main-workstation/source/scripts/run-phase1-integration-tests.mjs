// Phase 1-scoped integration runner: the Phase 1 PostgreSQL foundation file only.
// The repository-wide aggregate gate is `npm run test:integration`
// (scripts/run-aggregate-integration-tests.mjs), which gives every integration file its own
// disposable database.
import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";

let exitCode = 1;
await withDisposableTestDatabase("phase1_integration", async ({ env }) => {
  const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/integration/foundation-postgres.test.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env });
  exitCode = result.exitCode;
  if (result.timedOut) throw new Error("Phase 1 integration suite timed out.");
});
process.stdout.write("Phase 1 integration disposable database cleanup complete.\n");
process.exitCode = exitCode;
