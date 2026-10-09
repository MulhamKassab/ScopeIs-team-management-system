import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { disposableStats, withDisposableTestDatabase } from "./disposable-test-database.mjs";

const port = await allocateLoopbackPort();
const storageRoot = await mkdtemp(join(tmpdir(), "scopeis-ticket-browser-files-"));
const buildRoot = await mkdtemp(join(tmpdir(), "scopeis-phase2-safe-build-"));
let server;

async function stopOwnedProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    const killer = spawn(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"), ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    await new Promise((resolve, reject) => { killer.once("error", reject); killer.once("exit", resolve); });
  }
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  await new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    const timer = setTimeout(() => child.kill("SIGKILL"), 7_000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) throw new Error("Company ticket test server exited before readiness.");
    try {
      const response = await fetch(`http://127.0.0.1:${port}/login`, { redirect: "manual", signal: AbortSignal.timeout(1000) });
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Company ticket isolated build and server did not become ready within 600 seconds.");
}

async function runBrowser(environment) {
  const child = spawn(process.execPath, [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.tickets.config.ts", ...process.argv.slice(2)], { cwd: repositoryRoot, env: environment, stdio: "inherit", windowsHide: true });
  let timedOut = false;
  let termination;
  const timer = setTimeout(() => { timedOut = true; termination = stopOwnedProcess(child); }, 900_000);
  try {
    const exitCode = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code) => resolve(code ?? 1)); });
    if (termination) await termination;
    if (timedOut) throw new Error("Company ticket browser journey timed out.");
    return exitCode;
  } finally { clearTimeout(timer); await stopOwnedProcess(child); }
}

let exitCode = 1;
try {
  await withDisposableTestDatabase("ticket_browser", async ({ env }) => {
    const environment = { ...env, SCOPEIS_TICKETS_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port), EVIDENCE_STORAGE_MODE: "local", SCOPEIS_TEST_EVIDENCE_DIRECTORY: storageRoot, SCOPEIS_SAFE_BUILD_DIRECTORY: buildRoot };
    server = spawn(process.execPath, [join(repositoryRoot, "scripts", "run-phase2-safe-build.mjs"), "--serve-port", String(port)], { cwd: repositoryRoot, env: environment, stdio: "inherit", windowsHide: true });
    try {
      await waitForServer();
      exitCode = await runBrowser(environment);
    } finally { await stopOwnedProcess(server); }
  }, { phase1EmployeeProfiles: true });
} finally {
  await stopOwnedProcess(server);
  await rm(storageRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  await rm(buildRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  const stats = disposableStats();
  process.stdout.write(`Company ticket browser cleanup complete: ${stats.created} databases created, ${stats.dropped} dropped, ${stats.owned.length} retained; owned server stopped, build checkout and private fictional file directory removed.\n`);
  if (stats.created !== stats.dropped || stats.owned.length !== 0) exitCode = 1;
}
process.exitCode = exitCode;
