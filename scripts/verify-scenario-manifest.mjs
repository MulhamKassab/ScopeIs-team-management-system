// Fail-closed validator for the machine-readable pre-Phase-12 scenario manifest.
//
// The scenario catalogue in DOCX is human guidance; this manifest is the enforcement seam. It must
// fail when a scenario id is duplicated, a required scenario has no test evidence, a referenced test
// file does not exist, a Phase 0-11 test file is silently omitted from the authoritative runners, a
// scenario is marked skipped without a reason, or an implemented protected route is absent from route
// certification. Coverage percentages are intentionally not the authority here.

import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(repositoryRoot, "test", "system-lock", "scenario-manifest.json");
const testRoot = join(repositoryRoot, "test");

const TEST_FILE_RE = /\.(test\.ts|test\.tsx|spec\.ts)$/;
const EXCLUDED_TEST_FILES = new Set(["test/setup.ts", "test/server-only.ts"]);

function fail(message) {
  throw new Error(`Scenario manifest validation failed: ${message}`);
}

async function exists(path) {
  try { await access(join(repositoryRoot, path)); return true; } catch { return false; }
}

async function expandGlob(glob) {
  // Only directory-prefixed globs are supported (e.g. test/unit/*.test.ts). This keeps expansion
  // deterministic and prevents accidental broad filesystem walks.
  const match = glob.match(/^([^*]+)\/([^/]+)$/);
  if (!match) fail(`Unsupported manifest glob: ${glob}`);
  const [, directory, pattern] = match;
  const dir = join(repositoryRoot, directory);
  const entries = await readdir(dir).catch(() => []);
  const escaped = pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  const re = new RegExp(`^${escaped}$`);
  return entries.filter((name) => re.test(name)).map((name) => `${directory}/${name}`).sort();
}

async function onDiskTestFiles() {
  const result = [];
  async function walk(directory, prefix) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === "system-lock") continue;
      const full = join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(full, relativePath);
      else if (TEST_FILE_RE.test(entry.name) && !EXCLUDED_TEST_FILES.has(relativePath)) result.push(relativePath);
    }
  }
  await walk(testRoot, "test");
  return result.sort();
}

async function runnerCoverageFiles(runnerCoverage) {
  const files = new Set();
  for (const [runner, spec] of Object.entries(runnerCoverage)) {
    if (!spec || typeof spec !== "object") fail(`Runner ${runner} has no coverage declaration.`);
    for (const glob of spec.globs ?? []) for (const file of await expandGlob(glob)) files.add(file);
    for (const file of spec.files ?? []) {
      if (typeof file !== "string") fail(`Runner ${runner} declared a non-string file.`);
      files.add(file);
    }
  }
  return [...files].sort();
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.schemaVersion !== 1) fail(`Unsupported schema version ${manifest.schemaVersion}.`);
if (!manifest.scenarios || !Array.isArray(manifest.scenarios) || manifest.scenarios.length === 0) fail("The manifest must declare scenarios.");
if (!manifest.runnerCoverage || typeof manifest.runnerCoverage !== "object") fail("The manifest must declare authoritative runner coverage.");
if (!Array.isArray(manifest.protectedRoutes) || manifest.protectedRoutes.length === 0) fail("The manifest must declare the implemented protected routes.");

const seenIds = new Set();
const failures = [];
for (const scenario of manifest.scenarios) {
  const id = scenario.scenarioId;
  if (!id || typeof id !== "string") fail("A scenario is missing its scenarioId.");
  if (seenIds.has(id)) fail(`Duplicate scenario id: ${id}`);
  seenIds.add(id);

  if (scenario.status === "skipped" && !scenario.skipReason) fail(`Scenario ${id} is skipped without a reason.`);

  const hasAutomatedFile = typeof scenario.automatedTestFile === "string" && scenario.automatedTestFile.length > 0;
  const isManual = scenario.status === "manual" || scenario.status === "manual-only";
  const hasJustifiedManual = typeof scenario.justifiedManualStep === "string" && scenario.justifiedManualStep.length > 0;
  if (!hasAutomatedFile && !(isManual && hasJustifiedManual)) fail(`Scenario ${id} has no test evidence and no justified manual step.`);

  if (hasAutomatedFile) {
    const file = scenario.automatedTestFile;
    if (!(await exists(file))) fail(`Scenario ${id} references a missing test file: ${file}`);
    if (file.includes("test/system-lock")) fail(`Scenario ${id} must not reference the manifest directory as evidence.`);
  }

  for (const field of ["owningPhase", "module", "actor", "startingRole", "testLayer", "status"]) {
    if (typeof scenario[field] !== "string" || scenario[field].length === 0) fail(`Scenario ${id} is missing required field ${field}.`);
  }
}

const onDisk = await onDiskTestFiles();
const covered = await runnerCoverageFiles(manifest.runnerCoverage);

for (const file of onDisk) {
  if (!covered.includes(file)) failures.push(`Registered Phase 0-11 test file is silently omitted from the authoritative runners: ${file}`);
}
for (const file of covered) {
  if (!onDisk.includes(file)) failures.push(`Authoritative runner references a missing test file: ${file}`);
  if (!(await exists(file))) failures.push(`Authoritative runner references a missing file: ${file}`);
}

const routeEvidence = manifest.routeCertificationEvidence;
if (!routeEvidence || !(await exists(routeEvidence))) fail("Route certification evidence file is missing from the manifest.");

const totalScenarios = manifest.scenarios.length;
const automated = manifest.scenarios.filter((s) => typeof s.automatedTestFile === "string" && s.automatedTestFile.length > 0).length;
const manual = totalScenarios - automated;
const byDomain = {};
for (const scenario of manifest.scenarios) {
  const domain = String(scenario.scenarioId).split("-")[0] || "SYS";
  byDomain[domain] = (byDomain[domain] ?? 0) + 1;
}

if (failures.length) {
  for (const message of failures) process.stderr.write(`  ${message}\n`);
  fail(`${failures.length} coverage failure(s).`);
}

process.stdout.write("Scenario manifest validation (PASS):\n");
process.stdout.write(`  Checkpoint: ${manifest.checkpointId}\n`);
process.stdout.write(`  Scenarios: ${totalScenarios} (${automated} automated, ${manual} manual)\n`);
process.stdout.write(`  Domain counts: ${Object.entries(byDomain).map(([d, n]) => `${d}=${n}`).join(", ")}\n`);
process.stdout.write(`  Registered test files: ${onDisk.length}; runner-covered files: ${covered.length}\n`);
process.stdout.write(`  Protected routes: ${manifest.protectedRoutes.length}; route certification evidence present.\n`);
process.exitCode = 0;
