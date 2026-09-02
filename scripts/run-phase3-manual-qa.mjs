import { spawn } from "node:child_process";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { phase3Ids, seedPhase3Journey } from "./phase3-test-fixtures.mjs";

const smoke = process.argv.includes("--smoke"); const port = await allocateLoopbackPort(); const url = `http://127.0.0.1:${port}`; let child = null; let stopping = false;
async function waitFor() { const deadline = Date.now() + 120_000; while (Date.now() < deadline) { if (stopping) return false; try { if ((await fetch(`${url}/login`, { redirect: "manual" })).status < 500) return true; } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); } throw new Error("Phase 3 manual QA server did not become ready."); }
function childExit() { if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve(); return new Promise((resolve) => child.once("exit", resolve)); }
async function stop() { if (stopping) return; stopping = true; if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGTERM"); await childExit(); }
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => { void stop(); process.exitCode = 0; });
async function login(personaId) { const response = await fetch(`${url}/api/auth/mock-login`, { method: "POST", headers: { Origin: url, "content-type": "application/json" }, body: JSON.stringify({ personaId }), redirect: "manual" }); const cookie = response.headers.get("set-cookie"); if (!cookie) throw new Error("Phase 3 smoke login failed."); return cookie.split(";")[0]; }
async function smokeRoutes() { const nora = await login("mock-super-admin-nora"); const clients = await fetch(`${url}/clients`, { headers: { cookie: nora } }); const clientHtml = await clients.text(); if (clients.status !== 200 || !clientHtml.includes("Create Client") || !clientHtml.includes("Alpha Facilities")) throw new Error("Phase 3 Client smoke failed."); const project = await fetch(`${url}/projects/${phase3Ids.alphaProjectOne}`, { headers: { cookie: nora } }); const projectHtml = await project.text(); if (project.status !== 200 || !projectHtml.includes("Project Locations") || !projectHtml.includes("Operational details")) throw new Error("Phase 3 Project smoke failed."); const cora = await login("mock-employee-cora"); if ((await fetch(`${url}/clients`, { headers: { cookie: cora } })).status !== 404) throw new Error("Phase 3 Employee denial smoke failed."); }

await withDisposableTestDatabase("phase3_manual_qa", async ({ databaseUrl, env }) => {
  await seedPhase3Journey(databaseUrl);
  process.stdout.write(`Phase 3 manual QA uses one owned disposable loopback PostgreSQL database.\nOpen ${url}\n`);
  process.stdout.write("Nora Albright: global Super Admin journey and grants. Ava Mercer: team:alpha plus CLIENT Alpha scope. Ben Iqbal: team:bravo plus distinct PROJECT Bravo and LOCATION Gamma scopes. Dan Unscoped: relationship-only Admin with no operational grants. Cora Bell: Employee denial.\n");
  process.stdout.write("Intent: create Client → Project → new Location, deliberately reuse it, inspect supporting details, verify scope isolation and archive safeguards. Ctrl+C drops only this owned database.\n");
  child = spawn(process.execPath, ["scripts/run-phase2-safe-build.mjs", "--serve-port", String(port)], { cwd: repositoryRoot, env, stdio: "inherit" }); child.once("error", (error) => { throw error; });
  if (!(await waitFor())) return; if (smoke) { await smokeRoutes(); process.stdout.write("Phase 3 manual QA smoke passed.\n"); await stop(); return; } await childExit();
});
