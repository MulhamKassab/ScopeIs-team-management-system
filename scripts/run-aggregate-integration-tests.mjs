// Authoritative aggregate integration gate.
//
// Every integration file runs in its own freshly created loopback-only disposable PostgreSQL
// database, so no suite can observe another suite's rows. The previous single-database aggregate
// run produced duplicate `employee_profiles`/`schedule_periods`, empty scope grants, NOT_FOUND
// fixture Clients, and order-dependent failures.
//
// Each suite owns its fixtures and its database; databases are created and dropped by the owned
// harness in `disposable-test-database.mjs`. Nothing here can target the persistent `.env.test`
// database and no `.env.production` value is read.

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
import { seedPhase8MapJourney } from "./phase8-test-fixtures.mjs";

const vitest = join(repositoryRoot, "node_modules", "vitest", "vitest.mjs");

const suites = [
  { name: "Phase 1 PostgreSQL foundation", label: "phase1_foundation", files: ["test/integration/foundation-postgres.test.ts"] },
  { name: "Phase 2 employee core service", label: "phase2_core", files: ["test/integration/phase2-core-service.test.ts"] },
  { name: "Phase 3 operational service", label: "phase3_operations", files: ["test/integration/phase3-operational-service.test.ts"], timeoutMs: 180_000 },
  { name: "Phase 4 scheduling service", label: "phase4_scheduling", files: ["test/integration/phase4-scheduling-service.test.ts"], seed: seedPhase4Journey, timeoutMs: 240_000 },
  { name: "Phase 5 leave service", label: "phase5_leave", files: ["test/integration/phase5-leave-service.test.ts"], seed: seedPhase4Journey, timeoutMs: 240_000 },
  { name: "Phase 6 capabilities service", label: "phase6_capabilities", files: ["test/integration/phase6-capabilities-service.test.ts"], seed: seedPhase4Journey, timeoutMs: 240_000 },
  { name: "Phase 7 coverage service", label: "phase7_coverage", files: ["test/integration/phase7-coverage-service.test.ts"], seed: seedPhase4Journey, timeoutMs: 240_000 },
  { name: "Phase 8 planning map service", label: "phase8_map", files: ["test/integration/phase8-planning-map-service.test.ts"], seed: async (databaseUrl) => { await seedPhase4Journey(databaseUrl); await seedPhase8MapJourney(databaseUrl); }, timeoutMs: 240_000 },
];

// Guard against silently ignoring a newly added integration file.
const onDisk = (await readdir(join(repositoryRoot, "test", "integration"))).filter((name) => name.endsWith(".test.ts")).map((name) => `test/integration/${name}`).sort();
const scheduled = suites.flatMap((suite) => suite.files).sort();
if (JSON.stringify(onDisk) !== JSON.stringify(scheduled)) {
  throw new Error(`Aggregate integration suites do not match test/integration:\non disk: ${onDisk.join(", ")}\nscheduled: ${scheduled.join(", ")}`);
}

const results = [];
let failed = 0;
for (const suite of suites) {
  process.stdout.write(`\n=== ${suite.name} :: ${suite.files.join(", ")} (isolated disposable database) ===\n`);
  let exitCode = 1;
  let failure;
  try {
    await withDisposableTestDatabase(suite.label, async ({ databaseUrl, env }) => {
      if (suite.seed) await suite.seed(databaseUrl);
      const result = await runChild(process.execPath, [vitest, "run", ...suite.files, ...process.argv.slice(2)], { cwd: repositoryRoot, env, timeoutMs: suite.timeoutMs });
      exitCode = result.exitCode;
      if (result.timedOut) throw new Error(`${suite.name} timed out.`);
    });
  } catch (error) {
    exitCode = 1;
    failure = error instanceof Error ? error.message : String(error);
  }
  if (exitCode !== 0) failed += 1;
  results.push({ name: suite.name, exitCode, failure });
  process.stdout.write(`--- ${suite.name}: ${exitCode === 0 ? "PASS" : "FAIL"} ---\n`);
}

process.stdout.write("\nAggregate integration summary (each suite in its own disposable database):\n");
for (const result of results) process.stdout.write(`  ${result.exitCode === 0 ? "PASS" : "FAIL"}  ${result.name}${result.failure ? ` — ${result.failure}` : ""}\n`);
process.stdout.write(`  Overall: ${results.length - failed}/${results.length} suites passed\n`);
process.exitCode = failed === 0 ? 0 : 1;
