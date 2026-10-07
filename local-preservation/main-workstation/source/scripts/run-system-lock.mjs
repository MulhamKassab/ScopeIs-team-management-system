// Authoritative fail-closed pre-Phase-12 system lock.
//
// Orchestrates the complete verification contract in a deterministic order and aggregates failures
// so no result is hidden. Every step owns disposable loopback resources and never reads
// .env.production. A non-zero exit means the baseline is not green and must not be committed.

import { spawn } from "node:child_process";
import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";

const steps = [
  { name: "scenario-manifest", label: "Scenario manifest validation", command: process.execPath, args: [join(repositoryRoot, "scripts", "verify-scenario-manifest.mjs")], timeoutMs: 60_000 },
  { name: "typecheck", label: "Typecheck", command: process.execPath, args: [join(repositoryRoot, "node_modules", "typescript", "bin", "tsc"), "--noEmit"], timeoutMs: 180_000 },
  { name: "lint", label: "Lint", command: process.execPath, args: [join(repositoryRoot, "node_modules", "eslint", "bin", "eslint.js"), ".", "--max-warnings=0"], timeoutMs: 180_000 },
  { name: "unit", label: "Unit tests", command: process.execPath, args: [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/unit"], timeoutMs: 180_000 },
  { name: "component", label: "Component tests", command: process.execPath, args: [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/component"], timeoutMs: 180_000 },
  { name: "integration", label: "Aggregate integration tests", command: process.execPath, args: [join(repositoryRoot, "scripts", "run-aggregate-integration-tests.mjs")], timeoutMs: 900_000 },
  { name: "migration", label: "Migration tests", command: process.execPath, args: [join(repositoryRoot, "scripts", "run-phase2-migration-tests.mjs")], timeoutMs: 180_000 },
  { name: "route-certification", label: "Route certification", command: process.execPath, args: [join(repositoryRoot, "scripts", "run-phase1-route-certification.mjs")], timeoutMs: 300_000 },
  { name: "isolation", label: "Isolation tests", command: process.execPath, args: [join(repositoryRoot, "scripts", "verify-isolation.mjs")], timeoutMs: 180_000 },
  { name: "seed-smoke", label: "Seed smoke", command: process.execPath, args: [join(repositoryRoot, "scripts", "run-seed-smoke.mjs")], timeoutMs: 180_000 },
  { name: "system-smoke", label: "Fresh-system smoke", command: process.execPath, args: [join(repositoryRoot, "scripts", "run-system-smoke.mjs")], timeoutMs: 420_000 },
  { name: "e2e", label: "Aggregate E2E", command: process.execPath, args: [join(repositoryRoot, "scripts", "run-aggregate-e2e-tests.mjs")], timeoutMs: 1_500_000 },
  { name: "safe-build", label: "Safe build", command: process.execPath, args: [join(repositoryRoot, "scripts", "run-phase2-safe-build.mjs")], timeoutMs: 300_000 },
  { name: "diff-check", label: "Diff whitespace check", command: "git", args: ["diff", "--check"], timeoutMs: 60_000 },
];

function runStep(step) {
  const child = spawn(step.command, step.args, { cwd: repositoryRoot, stdio: "inherit" });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM"); }, step.timeoutMs);
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? (signal ? 1 : 0), signal, timedOut });
    });
  });
}

const results = [];
let failed = 0;
let interrupted = 0;
for (const step of steps) {
  process.stdout.write(`\n===== SYSTEM LOCK :: ${step.label} =====\n`);
  let exitCode = 1;
  let failure;
  try {
    const result = await runStep(step);
    exitCode = result.exitCode;
    if (result.signal) { interrupted += 1; failure = `terminated by ${result.signal}`; }
    else if (result.timedOut) { failure = "timed out"; }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  if (exitCode !== 0) failed += 1;
  results.push({ name: step.name, label: step.label, exitCode, failure });
  process.stdout.write(`----- ${step.label}: ${exitCode === 0 ? "PASS" : "FAIL"}${failure ? ` (${failure})` : ""} -----\n`);
}

process.stdout.write("\nSystem-lock summary (fail-closed):\n");
for (const result of results) {
  process.stdout.write(`  ${result.exitCode === 0 ? "PASS" : "FAIL"}  ${result.label}${result.failure ? ` - ${result.failure}` : ""}\n`);
}
process.stdout.write(`  Overall: ${results.length - failed}/${results.length} steps passed; ${interrupted} interruption(s).\n`);
process.stdout.write(failed === 0 ? "  SYSTEM LOCK: GREEN\n" : "  SYSTEM LOCK: RED (do not commit or push)\n");
process.exitCode = failed === 0 ? 0 : 1;
