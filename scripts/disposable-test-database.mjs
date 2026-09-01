import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { inspectMigrationState, reconcileMigrationState } from "./phase2-migration-core.mjs";
import { assertPhase1TestDatabaseSafety, loadPhase1TestConfiguration, phase1TestProcessEnvironment } from "./phase1-test-environment.mjs";

const ownedDatabases = new Set();
let created = 0; let dropped = 0;
const personaIds = ["mock-super-admin-nora", "mock-admin-ava", "mock-admin-ben", "mock-employee-cora", "mock-employee-dan"];

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

async function seedFixtures(url) {
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
    await client.query("commit");
    const fixtureCount = await client.query("select count(*)::int as count from users where id=any($1::text[])", [personaIds]);
    const scopeCount = await client.query("select count(*)::int as count from admin_scope_grants where active=true and user_id in ('mock-admin-ava','mock-admin-ben') and scope_reference in ('team:alpha','team:bravo')");
    if (fixtureCount.rows[0].count !== 5 || scopeCount.rows[0].count !== 2) throw new Error("Disposable fixture verification failed.");
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

export async function withDisposableTestDatabase(label, callback) {
  const configuration = await loadPhase1TestConfiguration(); await assertPhase1TestDatabaseSafety(configuration);
  const name = `scopeis_${label}_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 10)}_test`.toLowerCase(); assertDisposableName(name);
  const url = new URL(configuration.databaseUrl); url.pathname = `/${name}`;
  if (name === configuration.databaseName) throw new Error("Disposable runner refused the persistent configured test database.");
  try {
    await createDatabase(configuration, name);
    const migration = await reconcileMigrationState(url.toString(), { allowDisposableTest: true, apply: true });
    if (migration.after?.state !== "D" || migration.after.pending.length !== 0) throw new Error("Disposable database migration did not reach State D.");
    await seedFixtures(url.toString());
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
