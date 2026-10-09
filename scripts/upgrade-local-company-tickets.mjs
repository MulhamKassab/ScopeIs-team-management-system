/** Local Company ticket upgrade. Dry-run by default; existing application facts are checked before commit. */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "dotenv";
import pg from "pg";
import { assertTargetSafety, inspectMigrationState, repositoryRoot, validateRepositoryMigrationHistory } from "./phase2-migration-core.mjs";

const apply = process.argv.includes("--apply");
if (process.argv.slice(2).some((argument) => argument !== "--apply")) throw new Error("The local upgrade accepts only the optional --apply argument.");
const values = parse(await readFile(join(repositoryRoot, ".env"), "utf8"));
if (!values.DATABASE_URL) throw new Error("The local application .env must explicitly configure its database.");
const target = new URL(values.DATABASE_URL);
const databaseName = decodeURIComponent(target.pathname).replace(/^\//, "");
// The persistent Windows demo name contains "test"; the explicit .env and development environment distinguish it from .env.test certification databases.
if (values.APP_ENV !== "development" || !['postgres:', 'postgresql:'].includes(target.protocol) || !['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !databaseName || /prod|production|live/i.test(databaseName) || ['postgres', 'template0', 'template1'].includes(databaseName)) throw new Error("Local ticket upgrade requires the explicitly configured development application PostgreSQL database.");
const { manifest, migrations } = await validateRepositoryMigrationHistory();
const expected = manifest.migrations.at(-1);
if (expected.tag !== "0015_company_tickets" || manifest.migrations.length !== 16) throw new Error("This upgrade is restricted to the additive Company ticket migration.");
const migrationSql = await readFile(join(repositoryRoot, "src", "db", "migrations", `${expected.tag}.sql`), "utf8");
if (createHash("sha256").update(migrationSql).digest("hex") !== expected.hash) throw new Error("Company ticket migration hash changed.");

const client = new pg.Client({ connectionString: values.DATABASE_URL });
await client.connect();
let transaction = false;
try {
  await assertTargetSafety(client, values.DATABASE_URL);
  const addresses = (await client.query("select inet_server_addr()::text as server_address, inet_client_addr()::text as client_address")).rows[0];
  if (![addresses.server_address, addresses.client_address].every((value) => value === "::1" || String(value).includes("127.0.0.1"))) throw new Error("Local ticket upgrade requires loopback client and server addresses.");
  await client.query(apply ? "begin isolation level serializable" : "begin isolation level repeatable read read only");
  transaction = true;
  if (apply) await client.query("select pg_advisory_xact_lock(hashtext('scopeis:local-company-ticket-upgrade'))");
  const before = await inspectMigrationState(client);
  if (before.state !== "D") throw new Error("Local application schema and migration ledger must agree before upgrade.");
  if (before.pending.length === 0) {
    await client.query("rollback"); transaction = false;
    process.stdout.write(JSON.stringify({ applied: false, alreadyCurrent: true, state: "D", ledgerRows: before.ledger.rows.length }) + "\n");
  } else {
    if (JSON.stringify(before.pending) !== JSON.stringify([expected.tag]) || before.ledger.rows.length !== 15) throw new Error("Expected only the additive Company ticket migration to be pending.");
    const tables = manifest.states.teamCatalogue.tables;
    for (const table of tables) if (!/^[a-z_]+$/.test(table)) throw new Error("Unsafe authoritative table name.");
    if (apply) await client.query(`lock table ${tables.map((table) => `"${table}"`).join(",")} in share mode`);
    const facts = {};
    for (const table of tables) facts[table] = (await client.query(`select to_jsonb(record) as fact from "${table}" record order by to_jsonb(record)::text`)).rows;
    const counts = Object.fromEntries(Object.entries(facts).map(([table, rows]) => [table, rows.length]));
    if (!apply) {
      await client.query("rollback"); transaction = false;
      process.stdout.write(JSON.stringify({ dryRun: true, state: before.state, pending: before.pending, existingTables: tables.length, counts }) + "\n");
    } else {
      const backupFolder = join(process.env.LOCALAPPDATA ?? homedir(), "ScopeIsLocal", "backups");
      await mkdir(backupFolder, { recursive: true });
      const stamp = `${new Date().toISOString().replace(/[:.]/g, "-")}_${randomUUID().slice(0, 8)}`;
      const backupPath = join(backupFolder, `before_company_tickets_${stamp}.json.dump`);
      const historicalSql = {};
      for (const migration of manifest.migrations.slice(0, 15)) historicalSql[migration.tag] = await readFile(join(repositoryRoot, "src", "db", "migrations", `${migration.tag}.sql`), "utf8");
      const snapshot = { capturedAt: new Date().toISOString(), databaseName, schema: before.fingerprint, ledger: before.ledger.rows, migrations: migrations.slice(0, 15).map((migration) => ({ hash: migration.hash, when: migration.folderMillis })), historicalSql, tables: facts };
      await writeFile(backupPath, JSON.stringify(snapshot), { encoding: "utf8", mode: 0o600, flag: "wx" });
      await assertTargetSafety(client, values.DATABASE_URL, { apply: true, backupConfirmed: true });
      await client.query(migrationSql);
      await client.query("insert into drizzle.__drizzle_migrations(hash,created_at) values ($1,$2)", [expected.hash, expected.when]);
      const after = await inspectMigrationState(client);
      if (after.state !== "D" || after.pending.length || after.ledger.rows.length !== 16) throw new Error("Company ticket schema did not reach the complete canonical state.");
      if (JSON.stringify(after.ledger.rows.slice(0, 15)) !== JSON.stringify(before.ledger.rows)) throw new Error("Historical migration ledger changed.");
      for (const table of tables) {
        const retained = (await client.query(`select to_jsonb(record) as fact from "${table}" record order by to_jsonb(record)::text`)).rows;
        if (JSON.stringify(retained) !== JSON.stringify(facts[table]) || after.fingerprint.tableHashes[table] !== before.fingerprint.tableHashes[table]) throw new Error(`Existing application facts changed in ${table}.`);
      }
      await client.query("commit"); transaction = false;
      const receipt = { verifiedAt: new Date().toISOString(), applied: true, migration: expected.tag, migrationHash: expected.hash, schemaFingerprint: after.fingerprint.hash, state: after.state, ledgerRows: after.ledger.rows.length, existingTablesPreserved: tables.length, counts, backupPath };
      await writeFile(join(backupFolder, `company_tickets_${stamp}.receipt.json`), JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600, flag: "wx" });
      process.stdout.write(JSON.stringify(receipt) + "\n");
    }
  }
} finally {
  if (transaction) await client.query("rollback");
  await client.end();
}
