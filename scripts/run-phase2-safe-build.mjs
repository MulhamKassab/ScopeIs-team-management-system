import { spawn } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { assertPhase1TestDatabaseSafety, loadPhase1TestConfiguration, repositoryRoot } from "./phase1-test-environment.mjs";

const COPY_ALLOWLIST = ["src", "public", "next.config.ts", "tsconfig.json", "next-env.d.ts", "package.json", "package-lock.json"];
const EXCLUDED_NAMES = new Set([".git", ".next", "test-results", "playwright-report", "logs", "backups"]);
const SAFE_BUILD_DATABASE_URL = "postgresql://scopeis_safe_build@127.0.0.1:1/scopeis_phase2_safe_build_test";
const serveIndex = process.argv.indexOf("--serve-port");
const servePort = serveIndex >= 0 ? Number(process.argv[serveIndex + 1]) : null;
if (serveIndex >= 0 && (!Number.isInteger(servePort) || servePort < 1024 || servePort > 65_535)) throw new Error("Safe build server mode requires a valid loopback port.");

function excluded(name) { return name.startsWith(".env") || EXCLUDED_NAMES.has(name); }

async function copySafe(source, destination) {
  const sourceName = basename(source);
  if (excluded(sourceName)) throw new Error(`Safe build refused excluded path name: ${sourceName}`);
  const entry = await lstat(source);
  if (entry.isSymbolicLink()) throw new Error(`Safe build refused symbolic link: ${sourceName}`);
  if (!entry.isDirectory()) {
    await cp(source, destination);
    return;
  }
  await mkdir(destination, { recursive: true });
  for (const child of await readdir(source)) {
    if (excluded(child)) continue;
    await copySafe(join(source, child), join(destination, child));
  }
}

async function assertNoEnvironmentFiles(directory) {
  for (const child of await readdir(directory)) {
    if (child.startsWith(".env")) throw new Error("Safe build copy contains an environment file.");
    const path = join(directory, child);
    const entry = await lstat(path);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await assertNoEnvironmentFiles(path);
  }
}

function safeBuildEnvironment(configuration) {
  const inherited = Object.fromEntries(
    ["PATH", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "SHELL", "HOME", "USER", "LOGNAME"]
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]]),
  );
  return {
    ...inherited,
    APP_ENV: "test",
    DATABASE_URL: servePort !== null ? configuration.databaseUrl : SAFE_BUILD_DATABASE_URL,
    MOCK_AUTH_ENABLED: "true",
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_ENV: "production",
    SCOPEIS_DISPOSABLE_TEST_DATABASE: "true",
    SCOPEIS_E2E_TEST: "true",
    SESSION_TTL_HOURS: configuration.sessionTtlHours,
  };
}

async function run(command, args, temporaryApplication, environment) {
  const child = spawn(command, args, {
    cwd: temporaryApplication, env: environment, stdio: "inherit",
  });
  activeChild = child;
  try {
    return await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code) => resolve(code ?? 1));
    });
  } finally {
    if (activeChild === child) activeChild = null;
  }
}

const configuration = await loadPhase1TestConfiguration();
if (servePort !== null) await assertPhase1TestDatabaseSafety(configuration);
const temporaryApplication = await mkdtemp(join(tmpdir(), "scopeis-phase2-safe-build-"));
let exitCode = 1;
let activeChild = null;
let terminationRequested = false;
function stopActiveChild() {
  terminationRequested = true;
  if (activeChild && activeChild.exitCode === null && activeChild.signalCode === null) activeChild.kill("SIGTERM");
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, stopActiveChild);
try {
  for (const path of COPY_ALLOWLIST) await copySafe(join(repositoryRoot, path), join(temporaryApplication, path));
  await symlink(join(repositoryRoot, "node_modules"), join(temporaryApplication, "node_modules"), "dir");
  await assertNoEnvironmentFiles(temporaryApplication);
  process.stdout.write("Phase 2 safe build preflight passed: isolated copy contains no .env* files.\n");
  const environment = safeBuildEnvironment(configuration);
  const typecheckExitCode = await run(process.execPath, [join(repositoryRoot, "node_modules", "typescript", "bin", "tsc"), "--noEmit"], temporaryApplication, environment);
  if (terminationRequested) exitCode = 0;
  else if (typecheckExitCode !== 0) exitCode = typecheckExitCode;
  else {
    process.stdout.write("Phase 2 isolated typecheck passed.\n");
    exitCode = await run(process.execPath, [join(repositoryRoot, "node_modules", "next", "dist", "bin", "next"), "build", "--webpack"], temporaryApplication, environment);
    if (terminationRequested) exitCode = 0;
    else if (exitCode === 0 && servePort !== null) {
      exitCode = await run(process.execPath, [join(repositoryRoot, "node_modules", "next", "dist", "bin", "next"), "start", "--hostname", "127.0.0.1", "--port", String(servePort)], temporaryApplication, environment);
      if (terminationRequested) exitCode = 0;
    }
  }
} finally {
  await rm(temporaryApplication, { recursive: true, force: true });
  process.stdout.write("Phase 2 isolated safe build cleanup complete.\n");
}
process.exitCode = exitCode;
