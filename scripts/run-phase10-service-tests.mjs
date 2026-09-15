import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase10Journey } from "./phase10-test-fixtures.mjs";

let exitCode = 1;
try {
  await withDisposableTestDatabase("phase10_collaboration", async ({ databaseUrl, env }) => {
    await seedPhase10Journey(databaseUrl);
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/integration/phase10-collaboration-service.test.ts", "test/integration/phase10-management-note-authorization.test.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env, timeoutMs: 300_000 });
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Phase 10 collaboration service suite timed out.");
  });
} finally { process.stdout.write("Phase 10 collaboration service disposable database cleanup complete.\n"); }
process.exitCode = exitCode;
