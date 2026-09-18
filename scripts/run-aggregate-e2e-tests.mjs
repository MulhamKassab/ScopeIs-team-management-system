// Authoritative aggregate E2E gate.
//
// Every phase journey keeps its own guarded runner so each one receives the correct fictional
// fixture set and its own fresh loopback-only disposable database on a runner-allocated port:
//
//   Phase 1  foundation shell/persona/scope journey  (base personas + scope grants)
//   Phase 2  employee directory journey              (directory profiles + designation)
//   Phase 3  client/project/location journey         (Phase 3 operational fixtures)
//   Phase 4  scheduling publication journey          (Phase 4 fixtures)
//   Phase 5  leave journey                           (Phase 4 fixtures)
//   Phase 6  skills journey                          (Phase 4 fixtures)
//   Phase 7  coverage/replacement journey            (Phase 4 fixtures)
//   Phase 8  static planning map journey             (Phase 4 + Phase 8 fixtures)
//   Phase 9  capability evidence journey             (Phase 3 + Phase 4 fixtures, private local storage)
//   Phase 10 collaboration/governance journey        (Phase 3 + Phase 4 fixtures, participant request)
//   Phase 11 dashboards, reports and exports         (Phase 11 reporting fixtures, published + planning)
//
// The phase specs carry `test.skip(<guard>)` statements. Invoking them individually is what keeps
// those guards satisfied, so no journey is silently skipped, and no journey runs against another
// phase's seed data (for example, the employee directory must never run on Phase 1-only fixtures).

import { spawn } from "node:child_process";
import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";

const suites = [
  { name: "Phase 1 foundation shell, personas, and scope", script: "run-phase1-playwright.mjs" },
  { name: "Phase 2 employee directory", script: "run-phase2-playwright.mjs" },
  { name: "Phase 3 client/project/location", script: "run-phase3-playwright.mjs" },
  { name: "Phase 4 scheduling publication", script: "run-phase4-playwright.mjs" },
  { name: "Phase 5 leave and availability", script: "run-phase5-playwright.mjs" },
  { name: "Phase 6 skills and capabilities", script: "run-phase6-playwright.mjs" },
  { name: "Phase 7 coverage and replacement", script: "run-phase7-playwright.mjs" },
  { name: "Phase 8 static planning map", script: "run-phase8-playwright.mjs" },
  { name: "Phase 9 capability evidence", script: "run-phase9-playwright.mjs" },
  { name: "Phase 10 collaboration and governance", script: "run-phase10-playwright.mjs" },
  { name: "Phase 11 dashboards, reports and exports", script: "run-phase11-playwright.mjs" },
  { name: "Credential authentication login", script: "run-credential-e2e.mjs" },
  { name: "Super Admin account administration", script: "run-account-e2e.mjs" },
];

function runSuite(script) {
  const child = spawn(process.execPath, [join(repositoryRoot, "scripts", script)], { cwd: repositoryRoot, stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ exitCode: code ?? (signal ? 1 : 0), signal }));
  });
}

const results = [];
let failed = 0;
for (const suite of suites) {
  process.stdout.write(`\n=== ${suite.name} :: node scripts/${suite.script} (own disposable database + allocated port) ===\n`);
  let exitCode = 1;
  let failure;
  try {
    const result = await runSuite(suite.script);
    exitCode = result.exitCode;
    if (result.signal) failure = `terminated by ${result.signal}`;
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  if (exitCode !== 0) failed += 1;
  results.push({ name: suite.name, exitCode, failure });
  process.stdout.write(`--- ${suite.name}: ${exitCode === 0 ? "PASS" : "FAIL"} ---\n`);
}

process.stdout.write("\nAggregate E2E summary (each phase runner isolated on its own disposable database and port):\n");
for (const result of results) process.stdout.write(`  ${result.exitCode === 0 ? "PASS" : "FAIL"}  ${result.name}${result.failure ? ` — ${result.failure}` : ""}\n`);
process.stdout.write(`  Overall: ${results.length - failed}/${results.length} suites passed\n`);
process.exitCode = failed === 0 ? 0 : 1;
