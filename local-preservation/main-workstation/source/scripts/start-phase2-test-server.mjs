import { spawn } from "node:child_process";
import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertPhase1FictionalFixtures,
  assertPhase1TestDatabaseSafety,
  loadPhase1TestConfiguration,
  phase1TestProcessEnvironment,
  repositoryRoot,
} from "./phase1-test-environment.mjs";

const portArgument = process.argv.indexOf("--port");
const port = portArgument >= 0 ? Number(process.argv[portArgument + 1]) : 3000;
if (!Number.isInteger(port) || port < 1024 || port > 65_535) throw new Error("A valid non-privileged test port is required.");

const configuration = await loadPhase1TestConfiguration();
await assertPhase1TestDatabaseSafety(configuration);
await assertPhase1FictionalFixtures(configuration);

const temporaryApplication = await mkdtemp(join(tmpdir(), "scopeis-phase2-directory-server-"));
for (const path of ["src", "public", "next.config.ts", "tsconfig.json", "next-env.d.ts", "package.json", "package-lock.json"]) {
  await cp(join(repositoryRoot, path), join(temporaryApplication, path), { recursive: true });
}
await symlink(join(repositoryRoot, "node_modules"), join(temporaryApplication, "node_modules"), "dir");

const nextBinary = join(repositoryRoot, "node_modules", "next", "dist", "bin", "next");
const safeEnvironment = phase1TestProcessEnvironment(configuration);
const build = spawn(process.execPath, [nextBinary, "build", "--webpack"], { cwd: temporaryApplication, env: safeEnvironment, stdio: "inherit" });
const buildExitCode = await new Promise((resolve, reject) => { build.once("error", reject); build.once("exit", (code) => resolve(code ?? 1)); });
if (buildExitCode !== 0) {
  await rm(temporaryApplication, { recursive: true, force: true });
  process.exit(buildExitCode);
}

const child = spawn(process.execPath, [nextBinary, "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: temporaryApplication, env: safeEnvironment, stdio: "inherit" });
let stopping = false;
async function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  await new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    const timer = setTimeout(() => { child.kill("SIGKILL"); }, 5_000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
  });
  await rm(temporaryApplication, { recursive: true, force: true });
  process.stdout.write("Phase 2 directory test server cleanup complete.\n");
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, async () => { await stop(signal === "SIGINT" ? "SIGINT" : "SIGTERM"); process.exit(0); });
child.once("exit", async (code, signal) => {
  if (stopping) return;
  await rm(temporaryApplication, { recursive: true, force: true });
  process.exitCode = code ?? (signal ? 1 : 0);
});
