import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectMigrationState, repositoryRoot, validateRepositoryMigrationHistory } from "./phase2-migration-core.mjs";

/** Fixed, additive release operation; callers verify the target and restored backup first. */
export async function applyCompanyTicketUpgrade(client) {
  const { manifest } = await validateRepositoryMigrationHistory();
  const expected = manifest.migrations.at(-1);
  if (manifest.migrations.length !== 16 || expected.tag !== "0015_company_tickets") throw new Error("Only the approved Company ticket migration may be applied.");
  const migrationSql = await readFile(join(repositoryRoot, "src/db/migrations", `${expected.tag}.sql`), "utf8");
  if (createHash("sha256").update(migrationSql).digest("hex") !== expected.hash) throw new Error("Company migration bytes differ from the canonical hash.");
  const tables = manifest.states.teamCatalogue.tables;
  if (tables.length !== 34 || tables.some((table) => !/^[a-z_]+$/.test(table))) throw new Error("Unexpected pre-ticket table catalogue.");
  const factsSql = tables.map((table) => `select '${table}' as table_name, count(*)::int as row_count, coalesce(jsonb_agg(to_jsonb(record) order by to_jsonb(record)::text), '[]'::jsonb)::text as facts from "${table}" record`).join(" union all ");
  const facts = async () => (await client.query(factsSql)).rows.map((row) => ({ table: row.table_name, count: row.row_count, hash: createHash("sha256").update(row.facts).digest("hex") }));
  await client.query("begin isolation level read committed");
  try {
    await client.query("set local time zone 'UTC'");
    await client.query("set local lock_timeout = '30s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query("select pg_advisory_xact_lock(hashtext('scopeis:company-ticket-release'))");
    const initial = await inspectMigrationState(client);
    if (initial.state !== "D") throw new Error("Release requires canonical schema and ledger agreement.");
    if (initial.pending.length === 0 && initial.ledger.rows.length === 16) {
      await client.query("rollback");
      return { applied: false, alreadyCurrent: true, state: "D", ledgerRows: 16, fingerprint: initial.fingerprint.hash };
    }
    if (initial.ledger.rows.length !== 15 || JSON.stringify(initial.pending) !== JSON.stringify([expected.tag])) throw new Error("Expected only 0015_company_tickets to be pending.");
    await client.query(`lock table ${tables.map((table) => `"${table}"`).join(",")} in share mode`);
    await client.query("lock table drizzle.__drizzle_migrations in share row exclusive mode");
    const before = await inspectMigrationState(client);
    if (before.state !== "D" || before.ledger.rows.length !== 15 || JSON.stringify(before.pending) !== JSON.stringify([expected.tag]) || before.fingerprint.hash !== manifest.states.teamCatalogue.hash) throw new Error("Locked database differs from the approved pre-ticket state.");
    const beforeFacts = await facts();
    await client.query(migrationSql);
    await client.query("insert into drizzle.__drizzle_migrations(hash,created_at) values ($1,$2)", [expected.hash, expected.when]);
    const after = await inspectMigrationState(client);
    const afterFacts = await facts();
    if (after.state !== "D" || after.pending.length || after.ledger.rows.length !== 16 || after.fingerprint.tables.length !== 41) throw new Error("Migration did not reach the complete canonical Company state.");
    if (JSON.stringify(after.ledger.rows.slice(0, 15)) !== JSON.stringify(before.ledger.rows)) throw new Error("Historical migration ledger changed.");
    if (JSON.stringify(beforeFacts) !== JSON.stringify(afterFacts)) throw new Error("Existing application facts changed; migration rolled back.");
    for (const table of tables) if (after.fingerprint.tableHashes[table] !== before.fingerprint.tableHashes[table]) throw new Error(`Existing schema changed in ${table}; migration rolled back.`);
    await client.query("commit");
    return { applied: true, migration: expected.tag, migrationHash: expected.hash, state: after.state, ledgerRows: after.ledger.rows.length, tableCount: after.fingerprint.tables.length, fingerprint: after.fingerprint.hash, priorFingerprint: before.fingerprint.hash, existingTablesPreserved: tables.length, existingFacts: afterFacts };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
