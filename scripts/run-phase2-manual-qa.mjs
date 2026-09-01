import { spawn } from "node:child_process";
import pg from "pg";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { withDisposableTestDatabase } from "./disposable-test-database.mjs";

const smoke = process.argv.includes("--smoke");

async function seedManualJourney(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin");
    const designation = await client.query("insert into designations (name, sort_order) values ('Field Engineer', 1) returning id");
    const designationId = designation.rows[0].id;
    await client.query(`insert into employee_profiles (user_id, employee_code, work_email, work_phone, professional_summary, designation_id, team, manager_user_id, default_work_location, working_pattern)
      values ('mock-super-admin-nora','SA-001','nora@example.test','001','Fictional Super Admin',$1,'team:alpha',null,'Head Office','Hybrid weekdays'),
             ('mock-admin-ava','ADM-ALPHA-001','ava@example.test','010','Fictional scoped Admin',$1,'team:alpha','mock-super-admin-nora','Alpha office','Office weekdays'),
             ('mock-admin-ben','ADM-BRAVO-001','ben@example.test','020','Fictional scoped Admin',$1,'team:bravo','mock-super-admin-nora','Bravo office','Remote weekdays'),
             ('mock-employee-cora','EMP-ALPHA-001','cora@example.test','100','Alpha profile',$1,'team:alpha','mock-admin-ava','Private Alpha location','Hybrid weekdays'),
             ('mock-employee-dan','EMP-BRAVO-001','dan@example.test','200','Bravo profile',$1,'team:bravo','mock-admin-ben','Private Bravo location','Remote weekdays')`, [designationId]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}

async function waitFor(url) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (stopping) return false;
    try { if ((await fetch(`${url}/login`, { redirect: "manual" })).status < 500) return true; } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Manual QA server did not become ready.");
}

async function smokeRoutes(url) {
  async function session(personaId) {
    const response = await fetch(`${url}/api/auth/mock-login`, { method: "POST", headers: { Origin: url, "content-type": "application/json" }, body: JSON.stringify({ personaId }), redirect: "manual" });
    const cookie = response.headers.get("set-cookie");
    if (!cookie) throw new Error("Manual QA smoke login did not set a session.");
    return cookie.split(";")[0];
  }
  const nora = await session("mock-super-admin-nora");
  const employees = await fetch(`${url}/employees`, { headers: { cookie: nora } });
  if (employees.status !== 200 || !(await employees.text()).includes("Employee directory")) throw new Error("Manual QA smoke failed for /employees.");
  const cora = await session("mock-employee-cora");
  const profile = await fetch(`${url}/profile`, { headers: { cookie: cora } });
  if (profile.status !== 200 || !(await profile.text()).includes("My professional profile")) throw new Error("Manual QA smoke failed for /profile.");
}

const port = await allocateLoopbackPort();
const url = `http://127.0.0.1:${port}`;
let child = null;
let stopping = false;
function waitForChildExit() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", resolve));
}
async function stop() {
  if (stopping) return;
  stopping = true;
  if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  await waitForChildExit();
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => { void stop(); process.exitCode = 0; });

await withDisposableTestDatabase("phase2_manual_qa", async ({ databaseUrl, env }) => {
  await seedManualJourney(databaseUrl);
  process.stdout.write(`Phase 2 manual QA uses an owned disposable loopback database.\nOpen ${url}\n`);
  process.stdout.write("At /login choose Nora Albright (Super Admin), Ava Mercer (TEAM alpha Admin), Ben Iqbal (TEAM bravo Admin), or Cora Bell (Employee self-service). Press Ctrl+C to clean up.\n");
  child = spawn(process.execPath, ["scripts/run-phase2-safe-build.mjs", "--serve-port", String(port)], { cwd: repositoryRoot, env: { ...env }, stdio: "inherit" });
  child.once("error", (error) => { throw error; });
  if (!(await waitFor(url))) return;
  if (smoke) { await smokeRoutes(url); process.stdout.write("Phase 2 manual QA smoke passed: /employees and /profile loaded.\n"); await stop(); return; }
  await waitForChildExit();
});
