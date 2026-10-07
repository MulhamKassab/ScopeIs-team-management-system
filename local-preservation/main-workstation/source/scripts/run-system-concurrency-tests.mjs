// Repeatability lock for concurrency- and rollback-sensitive service suites.
//
// Runs the focused integration files that exercise simultaneous writes, stale optimistic versions,
// and multi-record transaction rollback three consecutive times, each pass in its own disposable
// loopback database. Any nondeterministic failure is a blocker and is surfaced, never dismissed.

import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
import { seedPhase9Journey } from "./phase9-test-fixtures.mjs";
import { seedPhase10Journey } from "./phase10-test-fixtures.mjs";

const vitest = join(repositoryRoot, "node_modules", "vitest", "vitest.mjs");
const passes = 3;

const suites = [
  { label: "phase1_foundation", name: "foundation transaction/rollback", files: ["test/integration/foundation-postgres.test.ts"] },
  { label: "phase2_core", name: "employee concurrency and rollback", files: ["test/integration/phase2-core-service.test.ts"] },
  { label: "phase4_scheduling", name: "scheduling overlap and rollback", files: ["test/integration/phase4-scheduling-service.test.ts"], seed: seedPhase4Journey },
  { label: "phase5_leave", name: "leave concurrent approval", files: ["test/integration/phase5-leave-service.test.ts"], seed: seedPhase4Journey },
  { label: "phase7_coverage", name: "coverage notification rollback", files: ["test/integration/phase7-coverage-service.test.ts"], seed: seedPhase4Journey },
  { label: "phase9_evidence", name: "evidence compensation", files: ["test/integration/phase9-evidence-service.test.ts"], seed: seedPhase9Journey },
  { label: "phase10_collaboration", name: "discussion concurrency and rollback", files: ["test/integration/phase10-collaboration-service.test.ts"], seed: seedPhase10Journey },
];

const results = [];
let failed = 0;
for (let pass = 1; pass <= passes; pass += 1) {
  process.stdout.write(`\n=== Concurrency/rollback repeat pass ${pass}/${passes} ===\n`);
  for (const suite of suites) {
    const key = `pass ${pass} ${suite.name}`;
    let exitCode = 1;
    let failure;
    try {
      await withDisposableTestDatabase(`${suite.label}_repeat${pass}`, async ({ databaseUrl, env }) => {
        if (suite.seed) await suite.seed(databaseUrl);
        const result = await runChild(process.execPath, [vitest, "run", ...suite.files], { cwd: repositoryRoot, env, timeoutMs: 300_000 });
        exitCode = result.exitCode;
        if (result.timedOut) throw new Error(`${key} timed out.`);
      });
    } catch (error) {
      exitCode = 1;
      failure = error instanceof Error ? error.message : String(error);
    }
    if (exitCode !== 0) failed += 1;
    results.push({ key, exitCode, failure });
    process.stdout.write(`--- ${key}: ${exitCode === 0 ? "PASS" : "FAIL"}${failure ? ` (${failure})` : ""} ---\n`);
  }
}

process.stdout.write("\nConcurrency/rollback repeatability summary:\n");
for (const result of results) process.stdout.write(`  ${result.exitCode === 0 ? "PASS" : "FAIL"}  ${result.key}${result.failure ? ` - ${result.failure}` : ""}\n`);
process.stdout.write(`  Overall: ${results.length - failed}/${results.length} runs passed (${passes} passes x ${suites.length} suites)\n`);
process.exitCode = failed === 0 ? 0 : 1;
