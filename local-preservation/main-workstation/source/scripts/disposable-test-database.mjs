import { spawn } from "node:child_process";
import { createHmac, randomBytes, randomUUID, scrypt } from "node:crypto";
import pg from "pg";
import { inspectMigrationState, reconcileMigrationState } from "./phase2-migration-core.mjs";
import { assertPhase1TestDatabaseSafety, fictionalTestPassword, fictionalTestPasswordPepper, loadPhase1TestConfiguration, phase1TestProcessEnvironment } from "./phase1-test-environment.mjs";

const ownedDatabases = new Set();
let created = 0; let dropped = 0;
const personaIds = ["mock-super-admin-nora", "mock-admin-ava", "mock-admin-ben", "mock-employee-cora", "mock-employee-dan"];

const credentialAccounts = [
  ["mock-super-admin-nora", "nora", "nora@example.test"], ["mock-admin-ava", "ava", "ava@example.test"],
  ["mock-admin-ben", "ben", "ben@example.test"], ["mock-employee-cora", "cora", "cora@example.test"],
  ["mock-employee-dan", "dan", "dan@example.test"],
];

async function hashFictional(password) {
  const salt = randomBytes(16);
  const input = createHmac("sha256", fictionalTestPasswordPepper).update(password, "utf8").digest();
  const derived = await new Promise((resolve, reject) => scrypt(input, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 48 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
  return `scrypt$v1$32768$8$1$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function loopback(value) { return value === "::1" || String(value).includes("127.0.0.1"); }
export function assertDisposableName(name) {
  if (!/^[a-z0-9_]+$/i.test(name) || !/(test|temp|disposable)/i.test(name) || /(prod|production|live)/i.test(name) || name.length > 63) throw new Error("Unsafe disposable database name.");
}
export function disposableStats() { return { created, dropped, owned: [...ownedDatabases] }; }

async function readonlySummary(connectionString) {
  const client = new pg.Client({ connectionString }); await client.connect();
  try {
    const migration = await inspectMigrationState(client);
    const counts = {};
    for (const table of ["users", "admin_scope_grants", "sessions", "audit_events", "notifications"]) {
      counts[table] = Number((await client.query(`select count(*)::int as count from "${table}"`)).rows[0].count);
    }
    const personas = await client.query("select id, role::text as role from users where id = any($1::text[]) order by id", [personaIds]);
    const scopes = await client.query("select user_id, scope_type::text as scope_type, scope_reference from admin_scope_grants where user_id in ('mock-admin-ava','mock-admin-ben') and active=true order by user_id, scope_reference");
    return { state: migration.state, ledger: migration.ledger.rows.map((row) => ({ hash: row.hash, createdAt: row.created_at })), fingerprint: migration.fingerprint.hash, tables: migration.fingerprint.tables, counts, personas: personas.rows, scopes: scopes.rows };
  } finally { await client.end(); }
}

export async function persistentTestDatabaseBaseline() {
  const configuration = await loadPhase1TestConfiguration(); await assertPhase1TestDatabaseSafety(configuration);
  return readonlySummary(configuration.databaseUrl);
}

async function seedFixtures(url, { credentials = true } = {}) {
  const client = new pg.Client({ connectionString: url }); await client.connect();
  try {
    await client.query("begin");
    const rows = [
      ["mock-super-admin-nora", "Nora Albright", "SUPER_ADMIN"], ["mock-admin-ava", "Ava Mercer", "ADMIN"], ["mock-admin-ben", "Ben Iqbal", "ADMIN"],
      ["mock-employee-cora", "Cora Bell", "EMPLOYEE"], ["mock-employee-dan", "Dan Rowan", "EMPLOYEE"],
    ];
    for (const [id, displayName, role] of rows) await client.query("insert into users (id, display_name, role) values ($1,$2,$3::system_role) on conflict (id) do nothing", [id, displayName, role]);
    for (const [userId, reference] of [["mock-admin-ava", "team:alpha"], ["mock-admin-ben", "team:bravo"]]) {
      await client.query("insert into admin_scope_grants (user_id, scope_type, scope_reference) values ($1,'TEAM',$2) on conflict (user_id,scope_type,scope_reference) do nothing", [userId, reference]);
    }
    if (credentials) {
      for (const [userId, username, email] of credentialAccounts) {
        await client.query(
          "insert into user_credentials (user_id, username, normalized_username, email, normalized_email, password_hash) values ($1,$2,$3,$4,$5,$6) on conflict (user_id) do nothing",
          [userId, username, username, email, email, await hashFictional(fictionalTestPassword)],
        );
      }
    }
    await client.query("commit");
    const fixtureCount = await client.query("select count(*)::int as count from users where id=any($1::text[])", [personaIds]);
    const scopeCount = await client.query("select count(*)::int as count from admin_scope_grants where active=true and user_id in ('mock-admin-ava','mock-admin-ben') and scope_reference in ('team:alpha','team:bravo')");
    if (fixtureCount.rows[0].count !== 5 || scopeCount.rows[0].count !== 2) throw new Error("Disposable fixture verification failed.");
    if (credentials) {
      const credentialCount = await client.query("select count(*)::int as count from user_credentials where user_id=any($1::text[])", [personaIds]);
      if (credentialCount.rows[0].count !== 5) throw new Error("Disposable credential fixture verification failed.");
    }
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}

/**
 * Completes the Phase 1 fictional fixture contract for gates that exercise real protected pages.
 * Phases 2-8 implemented routes such as `/profile` that require a real `employee_profiles` row, so a
 * users-and-grants-only database is no longer enough for route certification. Fictional data only.
 */
async function seedPhase1EmployeeProfiles(url) {
  const client = new pg.Client({ connectionString: url }); await client.connect();
  try {
    await client.query("begin");
    const designation = await client.query("insert into designations (name, sort_order) values ('Field Engineer', 1) returning id");
    await client.query(
      `insert into employee_profiles (user_id, employee_code, work_email, work_phone, professional_summary, designation_id, team, manager_user_id, default_work_location, working_pattern)
       values ('mock-super-admin-nora','P1C-SA-001','nora@example.test','555-0100','Fictional team manager',$1,'team:alpha',null,'Fictional Alpha office','Office weekdays'),
              ('mock-admin-ava','P1C-ADM-A','ava@example.test','555-0101','Fictional scoped Admin',$1,'team:alpha','mock-super-admin-nora','Fictional Alpha office','Office weekdays'),
              ('mock-admin-ben','P1C-ADM-B','ben@example.test','555-0102','Fictional scoped Admin',$1,'team:bravo','mock-super-admin-nora','Fictional Bravo office','Office weekdays'),
              ('mock-employee-cora','P1C-EMP-C','cora@example.test','555-0103','Fictional Employee',$1,'team:alpha','mock-admin-ava','Fictional Alpha office','Hybrid weekdays'),
              ('mock-employee-dan','P1C-EMP-D','dan@example.test','555-0104','Fictional Employee',$1,'team:bravo','mock-admin-ava','Fictional Bravo office','Hybrid weekdays')`,
      [designation.rows[0].id],
    );
    await client.query("commit");
    const profileCount = await client.query("select count(*)::int as count from employee_profiles where user_id = any($1::text[])", [personaIds]);
    if (profileCount.rows[0].count !== 5) throw new Error("Disposable Phase 1 profile fixture verification failed.");
  } catch (error) { await client.query("rollback"); throw error; } finally { await client.end(); }
}

async function createDatabase(configuration, name) {
  const client = new pg.Client({ connectionString: configuration.databaseUrl }); await client.connect();
  try {
    const row = (await client.query("select current_database() as database_name, inet_server_addr()::text as server_address, inet_client_addr()::text as client_address")).rows[0];
    if (!row || row.database_name !== configuration.databaseName || !loopback(row.server_address) || !loopback(row.client_address)) throw new Error("Persistent test database safety verification failed.");
    await client.query(`create database "${name}"`); ownedDatabases.add(name); created += 1;
  } finally { await client.end(); }
}
async function dropDatabase(configuration, name) {
  assertDisposableName(name); if (!ownedDatabases.has(name)) throw new Error("Cleanup refused an unowned disposable database.");
  const client = new pg.Client({ connectionString: configuration.databaseUrl }); await client.connect();
  try {
    await client.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()", [name]);
    await client.query(`drop database "${name}"`); ownedDatabases.delete(name); dropped += 1;
  } finally { await client.end(); }
}

export async function withDisposableTestDatabase(label, callback, options = {}) {
  const configuration = await loadPhase1TestConfiguration(); await assertPhase1TestDatabaseSafety(configuration);
  const name = `scopeis_${label}_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 10)}_test`.toLowerCase(); assertDisposableName(name);
  const url = new URL(configuration.databaseUrl); url.pathname = `/${name}`;
  if (name === configuration.databaseName) throw new Error("Disposable runner refused the persistent configured test database.");
  try {
    await createDatabase(configuration, name);
    const migration = await reconcileMigrationState(url.toString(), { allowDisposableTest: true, apply: true });
    if (migration.after?.state !== "D" || migration.after.pending.length !== 0) throw new Error("Disposable database migration did not reach State D.");
    await seedFixtures(url.toString(), options);
    if (options.phase1EmployeeProfiles) await seedPhase1EmployeeProfiles(url.toString());
    return await callback({ databaseName: name, databaseUrl: url.toString(), env: phase1TestProcessEnvironment({ ...configuration, databaseUrl: url.toString() }), migration });
  } finally { if (ownedDatabases.has(name)) await dropDatabase(configuration, name); }
}

export async function runChild(command, args, options) {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: "inherit" });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM"); }, timeoutMs);
  try {
    const exitCode = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code) => resolve(code ?? 1)); });
    return { exitCode, timedOut };
  } finally { clearTimeout(timer); }
}
