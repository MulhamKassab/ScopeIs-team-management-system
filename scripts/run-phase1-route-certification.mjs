import { spawn } from "node:child_process";
import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";

const port = await allocateLoopbackPort();

let server;

let serverStopped = false;
async function stopServer() {
  if (serverStopped || !server) return;
  serverStopped = true;
  if (server.exitCode === null && server.signalCode === null) server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null || server.signalCode !== null) return resolve();
    const timer = setTimeout(() => server.kill("SIGKILL"), 7_000);
    server.once("exit", () => { clearTimeout(timer); resolve(); });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Phase 1 test server exited before readiness with code ${server.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/login`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Phase 1 test server did not become ready within 30 seconds.");
}

let exitCode = 1;
// `phase1EmployeeProfiles` completes the fictional Phase 1 fixture contract: implemented Phase 2+
// routes such as `/profile` need a real employee profile row, not just a user and scope grants.
await withDisposableTestDatabase("phase1_route", async ({ env }) => {
  server = spawn(process.execPath, [join(repositoryRoot, "scripts", "start-phase1-test-server.mjs"), "--port", String(port)], { cwd: repositoryRoot, env, stdio: "inherit" });
  try {
    await waitForServer();
    const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/route-certification/phase1-http.test.ts"], { cwd: repositoryRoot, env: { ...env, SCOPEIS_ROUTE_BASE_URL: `http://127.0.0.1:${port}` } });
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Phase 1 route certification timed out.");
  } finally { await stopServer(); }
}, { phase1EmployeeProfiles: true });
process.stdout.write("Phase 1 route certification runner cleanup complete.\n");
process.exitCode = exitCode;
