import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
let exitCode = 1; try { await withDisposableTestDatabase("phase7_coverage", async ({ databaseUrl, env }) => { await seedPhase4Journey(databaseUrl); const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/unit/phase7-coverage-validation.test.ts", "test/integration/phase7-coverage-service.test.ts"], { cwd: repositoryRoot, env, timeoutMs: 240_000 }); exitCode = result.exitCode; }); } finally { process.stdout.write("Phase 7 coverage disposable database cleanup complete.\n"); } process.exitCode = exitCode;
