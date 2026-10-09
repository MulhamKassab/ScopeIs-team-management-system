import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";

const port = await allocateLoopbackPort();
const temporaryApplication = await mkdtemp(join(tmpdir(), "scopeis-phase1-server-"));

let server;

let serverStopped = false;
async function stopServer() {
  if (serverStopped || !server) return;
  serverStopped = true;
  if (process.platform === "win32" && server.exitCode === null && server.signalCode === null) {
    const killer = spawn(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"), ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    await new Promise((resolve, reject) => { killer.once("error", reject); killer.once("exit", resolve); });
  }
  if (server.exitCode === null && server.signalCode === null) server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null || server.signalCode !== null) return resolve();
    const timer = setTimeout(() => server.kill("SIGKILL"), 7_000);
    server.once("exit", () => { clearTimeout(timer); resolve(); });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Phase 1 test server exited before readiness with code ${server.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/login`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Phase 1 isolated build and test server did not become ready within 600 seconds.");
}

let exitCode = 1;
// `phase1EmployeeProfiles` completes the fictional Phase 1 fixture contract: implemented Phase 2+
// routes such as `/profile` need a real employee profile row, not just a user and scope grants.
try { await withDisposableTestDatabase("phase1_route", async ({ env }) => {
  server = spawn(process.execPath, [join(repositoryRoot, "scripts", "start-phase1-test-server.mjs"), "--port", String(port)], { cwd: repositoryRoot, env: { ...env, SCOPEIS_PHASE1_SERVER_DIRECTORY: temporaryApplication }, stdio: "inherit" });
  try {
    await waitForServer();
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/route-certification/phase1-http.test.ts"], { cwd: repositoryRoot, env: { ...env, SCOPEIS_ROUTE_BASE_URL: `http://127.0.0.1:${port}` }, timeoutMs: 240_000 });
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Phase 1 route certification timed out.");
  } finally { await stopServer(); }
}, { phase1EmployeeProfiles: true }); }
finally {
  await stopServer();
  await rm(temporaryApplication, { recursive: true, force: true });
  process.stdout.write("Phase 1 route certification runner cleanup complete.\n");
}
process.exitCode = exitCode;
