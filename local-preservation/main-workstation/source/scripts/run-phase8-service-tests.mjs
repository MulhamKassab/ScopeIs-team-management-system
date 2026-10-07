import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
import { seedPhase8MapJourney } from "./phase8-test-fixtures.mjs";
let exitCode = 1; try { await withDisposableTestDatabase("phase8_map", async ({ databaseUrl, env }) => { await seedPhase4Journey(databaseUrl); await seedPhase8MapJourney(databaseUrl); const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/integration/phase8-planning-map-service.test.ts"], { cwd: repositoryRoot, env, timeoutMs: 240_000 }); exitCode = result.exitCode; }); } finally { process.stdout.write("Phase 8 planning-map disposable database cleanup complete.\n"); } process.exitCode = exitCode;
