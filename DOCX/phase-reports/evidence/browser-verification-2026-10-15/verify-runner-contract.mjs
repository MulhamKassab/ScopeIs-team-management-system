// Controlled process checks of the real runner source, with no database,
// browser, build, credential or production connection. Run from repository root.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, lstat, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = process.cwd();
const baseline = "48e3e7cb5b7312a103fe1dbdfa88263605a6231b";
const directory = await mkdtemp(join(tmpdir(), "scopeis-runner-contract-"));
const checks = [];
try {
  await writeFile(join(directory, "phase1-test-environment.mjs"), `export const repositoryRoot = ${JSON.stringify(directory)}; export async function allocateLoopbackPort() { return 12345; }`);
  await writeFile(join(directory, "disposable-test-database.mjs"), `import { writeFile } from "node:fs/promises"; export async function withDisposableTestDatabase(label, callback) { try { await callback({ databaseUrl: "fictional-test-only", env: {} }); } finally { await writeFile(process.env.SCOPEIS_FAULT_CLEANUP, "cleaned"); } }`);
  await writeFile(join(directory, "owned-browser-build.mjs"), `import { writeFile } from "node:fs/promises"; export async function runBrowserWithOwnedBuild(command, args) { await writeFile(process.env.SCOPEIS_FAULT_ARGS, JSON.stringify(args)); return { exitCode: 0, timedOut: true }; }`);
  await writeFile(join(directory, "cover-workspace-test-fixtures.mjs"), "export async function seedCoverWorkspace() {}");
  for (const [phase, name] of [[4, "seedPhase4Journey"], [8, "seedPhase8MapJourney"], [10, "seedPhase10Journey"], [11, "seedPhase11Journey"]]) {
    await writeFile(join(directory, `phase${phase}-test-fixtures.mjs`), `export async function ${name}() {}`);
  }
  for (const variant of ["baseline", "working"]) for (const phase of [5, 6, 7, 8, 10, 11]) {
    const sourcePath = join("scripts", `run-phase${phase}-playwright.mjs`);
    const historical = variant === "baseline" ? spawnSync("git", ["show", `${baseline}:${sourcePath.replaceAll("\\", "/")}`], { cwd: repositoryRoot, timeout: 15_000, windowsHide: true }) : null;
    if (historical && (historical.status !== 0 || historical.error)) throw new Error("Could not read the pinned regression-control source.");
    const source = historical ? historical.stdout : await readFile(join(repositoryRoot, sourcePath));
    const entrypoint = join(directory, basename(sourcePath));
    await writeFile(entrypoint, source);
    const argsPath = join(directory, `args-${variant}-${phase}.json`);
    const cleanupPath = join(directory, `cleanup-${variant}-${phase}.txt`);
    const output = join(directory, "fictional diagnostic output", String(phase));
    const result = spawnSync(process.execPath, [entrypoint, "--output", output], {
      cwd: directory, encoding: "utf8", timeout: 15_000, windowsHide: true,
      env: {
        PATH: process.env.PATH, TEMP: tmpdir(), TMP: tmpdir(),
        ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
        SCOPEIS_FAULT_ARGS: argsPath, SCOPEIS_FAULT_CLEANUP: cleanupPath,
      },
    });
    const forwarded = JSON.parse(await readFile(argsPath, "utf8"));
    const cleaned = await readFile(cleanupPath, "utf8") === "cleaned";
    const rejectsExpiredZeroExit = result.status === 1 && !result.signal && !result.error && result.stderr.includes("timed out.");
    const forwardsOutput = forwarded.at(-2) === "--output" && forwarded.at(-1) === output;
    checks.push({
      variant, phase, sourcePath, sha256: createHash("sha256").update(source).digest("hex"),
      rejectsExpiredZeroExit, forwardsOutput, cleanupReached: cleaned,
      passed: rejectsExpiredZeroExit && forwardsOutput && cleaned,
    });
  }
} finally {
  const entry = await lstat(directory);
  const actual = await realpath(directory);
  if (entry.isSymbolicLink() || dirname(actual) !== await realpath(tmpdir()) || !basename(actual).startsWith("scopeis-runner-contract-")) throw new Error("Refused an unowned cleanup path.");
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
let removed = false;
try { await access(directory); } catch (error) { if (error.code !== "ENOENT") throw error; removed = true; }
const current = checks.filter((check) => check.variant === "working");
const controls = checks.filter((check) => check.variant === "baseline");
const receipt = { verifiedAt: new Date().toISOString(), baseline, injection: { exitCode: 0, timedOut: true }, checks, temporaryDirectoryRemoved: removed };
await writeFile(join(dirname(fileURLToPath(import.meta.url)), "runner-contract.json"), JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(`${current.filter((check) => check.passed).length}/${current.length} repaired runner checks passed; ${controls.filter((check) => !check.passed).length}/${controls.length} pinned baseline controls failed as expected; temporary directory removed: ${removed}.\n`);
process.exitCode = current.length === 6 && current.every((check) => check.passed) && controls.length === 6 && controls.every((check) => !check.passed) && removed ? 0 : 1;
