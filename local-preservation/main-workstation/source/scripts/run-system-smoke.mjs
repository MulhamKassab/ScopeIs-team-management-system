// Fresh-system smoke: migrate a disposable database from zero, run the real fictional seed twice to
// prove idempotency, start the application on a runner-allocated loopback port, sign in every
// fictional persona, exercise permitted and forbidden top-level routes, verify resulting audit and
// notification records, run the sanctioned isolated build, and leave no process, port, database,
// generated file, or temporary credential behind. Fictional data and loopback resources only.

import { spawn } from "node:child_process";
import { join } from "node:path";
import pg from "pg";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { inspectMigrationState } from "./phase2-migration-core.mjs";

const tsx = join(repositoryRoot, "node_modules", "tsx", "dist", "cli.mjs");
const seedEntry = join(repositoryRoot, "src", "db", "seed", "index.ts");

const moduleKeys = ["dashboard", "employees", "accounts", "skills", "clients", "projects", "locations", "schedule", "map", "leave", "coverage", "replacements", "notifications", "reports", "audit", "settings", "profile", "requests"];
const superAdminModules = [...moduleKeys];
const adminModules = ["dashboard", "employees", "skills", "clients", "projects", "locations", "schedule", "map", "leave", "coverage", "replacements", "notifications", "reports", "profile"];
const employeeModules = ["dashboard", "skills", "schedule", "leave", "profile", "notifications", "requests"];

const personas = [
  { id: "mock-super-admin-nora", name: "Nora Albright", role: "SUPER_ADMIN", allowed: superAdminModules, refusal: [], alpha: 200, bravo: 200 },
  { id: "mock-admin-ava", name: "Ava Mercer", role: "ADMIN", allowed: adminModules, refusal: [], alpha: 200, bravo: 403 },
  { id: "mock-admin-ben", name: "Ben Iqbal", role: "ADMIN", allowed: adminModules, refusal: [], alpha: 403, bravo: 200 },
  { id: "mock-employee-cora", name: "Cora Bell", role: "EMPLOYEE", allowed: employeeModules, refusal: ["coverage", "replacements"], alpha: 403, bravo: 403 },
  { id: "mock-employee-dan", name: "Dan Rowan", role: "EMPLOYEE", allowed: employeeModules, refusal: ["coverage", "replacements"], alpha: 403, bravo: 403 },
];

async function request(base, path, options = {}) {
  return fetch(`${base}${path}`, { redirect: "manual", ...options });
}

async function login(base, personaId) {
  const response = await request(base, "/api/auth/mock-login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ personaId }),
  });
  if (response.status !== 200) throw new Error(`Mock login for ${personaId} returned ${response.status}.`);
  const setCookie = response.headers.get("set-cookie") ?? "";
  const token = setCookie.match(/scopeis_session=([^;]+)/)?.[1];
  if (!token) throw new Error(`Mock login for ${personaId} did not set a session cookie.`);
  return { cookie: `scopeis_session=${token}`, token };
}

async function logout(base, cookie) {
  const response = await request(base, "/api/auth/logout", { method: "POST", headers: { Cookie: cookie, Origin: base } });
  if (response.status !== 200) throw new Error("Logout did not return 200.");
}

let exitCode = 1;
const port = await allocateLoopbackPort();
const base = `http://127.0.0.1:${port}`;

await withDisposableTestDatabase("system_smoke", async ({ databaseUrl, env }) => {
  // Step 3: verify migration fingerprints and ledgers are at State D with no pending transitions.
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const migrationState = await inspectMigrationState(client);
    if (migrationState.state !== "D") throw new Error(`System smoke expected migration State D, got ${migrationState.state}.`);
    if (!migrationState.fingerprint || !Array.isArray(migrationState.fingerprint.tables)) throw new Error("System smoke could not read the migration fingerprint.");
    process.stdout.write("System smoke verified migration State D and fingerprint tables.\n");
  } finally { await client.end(); }

  // Steps 4-5: run the real fictional seed twice and prove idempotency.
  for (const pass of [1, 2]) {
    const result = await runChild(process.execPath, [tsx, seedEntry], { cwd: repositoryRoot, env, timeoutMs: 90_000 });
    if (result.exitCode !== 0) throw new Error(`Fictional seed pass ${pass} failed.`);
    process.stdout.write(`System smoke seed pass ${pass} completed.\n`);
  }

  // Steps 6-11: start the application and exercise persona navigation and record verification.
  const server = spawn(process.execPath, [join(repositoryRoot, "scripts", "start-phase1-test-server.mjs"), "--port", String(port)], { cwd: repositoryRoot, env, stdio: "inherit" });
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
  try {
    const deadline = Date.now() + 60_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (server.exitCode !== null) throw new Error(`System smoke server exited before readiness (${server.exitCode}).`);
      try {
        const response = await request(base, "/login");
        if (response.status === 200) { ready = true; break; }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error("System smoke server did not become ready within 60 seconds.");
    process.stdout.write("System smoke server ready on loopback port.\n");

    // Unauthenticated enforcement.
    const anonDashboard = await request(base, "/dashboard");
    if (![303, 307, 308].includes(anonDashboard.status) || anonDashboard.headers.get("location") !== "/login") throw new Error("Anonymous /dashboard was not redirected to /login.");
    if ((await request(base, "/api/foundation/scope/team:alpha")).status !== 401) throw new Error("Anonymous scope API was not refused.");
    process.stdout.write("System smoke verified anonymous enforcement.\n");

    const audit = new pg.Client({ connectionString: databaseUrl });
    await audit.connect();
    try {
      for (const persona of personas) {
        const session = await login(base, persona.id);
        const dashboard = await request(base, "/dashboard", { headers: { Cookie: session.cookie } });
        if (dashboard.status !== 200) throw new Error(`${persona.name} /dashboard returned ${dashboard.status}.`);
        const html = await dashboard.text();
        if (!html.includes(persona.name)) throw new Error(`${persona.name} dashboard did not render the signed-in name.`);

        for (const moduleKey of moduleKeys) {
          const allowed = persona.allowed.includes(moduleKey);
          const refusal = persona.refusal.includes(moduleKey);
          const page = await request(base, `/${moduleKey}`, { headers: { Cookie: session.cookie } });
          const expected = allowed || refusal ? 200 : 404;
          if (page.status !== expected) throw new Error(`${persona.id} /${moduleKey} returned ${page.status}, expected ${expected}.`);
          if (refusal && !(await page.text()).includes("management-only")) throw new Error(`${persona.id} /${moduleKey} refusal did not state management-only.`);
        }

        const alpha = await request(base, "/api/foundation/scope/team:alpha", { headers: { Cookie: session.cookie } });
        const bravo = await request(base, "/api/foundation/scope/team:bravo", { headers: { Cookie: session.cookie } });
        if (alpha.status !== persona.alpha || bravo.status !== persona.bravo) throw new Error(`${persona.id} scope statuses were ${alpha.status}/${bravo.status}, expected ${persona.alpha}/${persona.bravo}.`);

        const signIn = await audit.query("select count(*)::int as count from audit_events where actor_user_id=$1 and action='auth.mock_session.started'", [persona.id]);
        if (signIn.rows[0].count < 1) throw new Error(`${persona.id} produced no auth.mock_session.started audit event.`);
        await logout(base, session.cookie);
      }
      process.stdout.write("System smoke verified all five persona route and scope contracts plus sign-in audit events.\n");

      // Notification round-trip: prove the centre can hold a recipient row without leaking anything.
      await audit.query("begin");
      await audit.query("insert into notifications (recipient_user_id, event_type, related_record_type, related_record_id) values ('mock-super-admin-nora','evidence.created','employee_evidence',null)");
      const notification = await audit.query("select count(*)::int as count from notifications where recipient_user_id='mock-super-admin-nora' and event_type='evidence.created' and related_record_id is null");
      if (notification.rows[0].count !== 1) throw new Error("Notification round-trip verification failed.");
      await audit.query("delete from notifications where recipient_user_id='mock-super-admin-nora' and event_type='evidence.created' and related_record_id is null");
      await audit.query("commit");
      process.stdout.write("System smoke verified a recipient notification round-trip.\n");
    } finally { await audit.end(); }
  } finally { await stopServer(); }
}, { phase1EmployeeProfiles: true });

// Step 12: run the sanctioned isolated build.
const build = await runChild(process.execPath, [join(repositoryRoot, "scripts", "run-phase2-safe-build.mjs")], { cwd: repositoryRoot, timeoutMs: 180_000 });
if (build.exitCode !== 0 || build.timedOut) throw new Error("System smoke safe build failed.");
process.stdout.write("System smoke safe build completed.\n");

exitCode = 0;
process.stdout.write("System smoke disposable environment cleanup complete (PASS).\n");
process.exitCode = exitCode;
