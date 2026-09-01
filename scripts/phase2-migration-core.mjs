import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fingerprintPublicSchema } from "./schema-fingerprint.mjs";

export const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
export const migrationsFolder = join(repositoryRoot, "src", "db", "migrations");
const manifestPath = join(migrationsFolder, "meta", "adoption-fingerprints.json");
const journalPath = join(migrationsFolder, "meta", "_journal.json");

export async function loadAdoptionManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

export async function validateRepositoryMigrationHistory() {
  const [manifest, journal, files] = await Promise.all([
    loadAdoptionManifest(),
    readFile(journalPath, "utf8").then(JSON.parse),
    readdir(migrationsFolder),
  ]);
  if (journal.version !== "7" || journal.dialect !== "postgresql") throw new Error("Migration journal version or dialect is unsupported.");
  const sqlFiles = files.filter((file) => file.endsWith(".sql")).sort();
  const journalFiles = journal.entries.map((entry) => `${entry.tag}.sql`).sort();
  if (JSON.stringify(sqlFiles) !== JSON.stringify(journalFiles)) throw new Error("Migration files and journal entries do not match.");
  if (journal.entries.length !== manifest.migrations.length) throw new Error("Migration journal and adoption manifest lengths differ.");
  const migrations = readMigrationFiles({ migrationsFolder });
  for (let index = 0; index < journal.entries.length; index += 1) {
    const entry = journal.entries[index];
    const expected = manifest.migrations[index];
    const migration = migrations[index];
    if (entry.idx !== index || entry.tag !== expected.tag || entry.when !== expected.when || entry.version !== "7") {
      throw new Error(`Migration journal entry ${index} does not match the immutable manifest.`);
    }
    if (index > 0 && entry.when <= journal.entries[index - 1].when) throw new Error("Migration journal timestamps are not strictly increasing.");
    if (migration.folderMillis !== expected.when || migration.hash !== expected.hash) {
      throw new Error(`Migration ${entry.tag} hash or ordering metadata changed.`);
    }
  }
  return { manifest, journal, migrations };
}

function expectedStage(manifest, count) {
  if (count === 0) return { hash: null, tables: [], enumTypes: [], tableHashes: {}, sectionHashes: {} };
  if (count === 1) return manifest.states.phase1;
  if (count === 2) return manifest.states.phase1And2;
  return null;
}

function schemaDiagnostics(actual, expected) {
  const expectedTables = expected?.tables ?? [];
  const actualTables = actual.tables;
  return {
    missingTables: expectedTables.filter((table) => !actualTables.includes(table)),
    unexpectedTables: actualTables.filter((table) => !expectedTables.includes(table)),
    mismatchedTables: expected ? expectedTables.filter((table) => actual.tableHashes[table] && actual.tableHashes[table] !== expected.tableHashes[table]) : actualTables,
    mismatchedSections: expected ? Object.keys(expected.sectionHashes).filter((section) => actual.sectionHashes[section] !== expected.sectionHashes[section]) : ["enums", "columns", "constraints", "indexes"],
    actualFingerprint: actual.hash,
    expectedFingerprint: expected?.hash ?? null,
  };
}

async function inspectLedger(client) {
  const schemaResult = await client.query("select exists(select 1 from pg_namespace where nspname=$1) as exists", ["drizzle"]);
  const schemaExists = schemaResult.rows[0]?.exists === true;
  const tableResult = await client.query("select to_regclass($1) is not null as exists", ["drizzle.__drizzle_migrations"]);
  const tableExists = tableResult.rows[0]?.exists === true;
  if (schemaExists !== tableExists) return { schemaExists, tableExists, valid: false, rows: [], reason: "Drizzle ledger schema/table is partial." };
  if (!tableExists) return { schemaExists: false, tableExists: false, valid: true, rows: [] };
  const columns = await client.query(`
    select column_name, data_type, is_nullable, coalesce(column_default, '') as column_default
      from information_schema.columns
     where table_schema=$1 and table_name=$2
     order by ordinal_position`, ["drizzle", "__drizzle_migrations"]);
  const expectedColumns = [
    ["id", "integer", "NO"],
    ["hash", "text", "NO"],
    ["created_at", "bigint", "YES"],
  ];
  const columnShapeValid = columns.rows.length === 3 && columns.rows.every((row, index) =>
    row.column_name === expectedColumns[index][0] && row.data_type === expectedColumns[index][1] && row.is_nullable === expectedColumns[index][2]
  ) && columns.rows[0].column_default.includes("__drizzle_migrations_id_seq");
  const rows = await client.query("select id, hash, created_at::text as created_at from drizzle.__drizzle_migrations order by created_at, id");
  return { schemaExists: true, tableExists: true, valid: columnShapeValid, rows: rows.rows, reason: columnShapeValid ? null : "Drizzle ledger columns differ from the installed migrator format." };
}

function validateLedgerRows(ledger, manifest) {
  if (!ledger.valid) return { valid: false, count: 0, reason: ledger.reason };
  if (ledger.rows.length > manifest.migrations.length) return { valid: false, count: ledger.rows.length, reason: "Ledger contains more rows than the migration journal." };
  for (let index = 0; index < ledger.rows.length; index += 1) {
    const row = ledger.rows[index];
    const expected = manifest.migrations[index];
    if (row.hash !== expected.hash || Number(row.created_at) !== expected.when) {
      return { valid: false, count: ledger.rows.length, reason: `Ledger row ${index} does not match migration ${expected.tag}.` };
    }
  }
  return { valid: true, count: ledger.rows.length, reason: null };
}

export async function inspectMigrationState(client) {
  const { manifest } = await validateRepositoryMigrationHistory();
  const fingerprint = await fingerprintPublicSchema(client);
  const ledger = await inspectLedger(client);
  const ledgerValidation = validateLedgerRows(ledger, manifest);
  const emptyPublic = fingerprint.tables.length === 0 && fingerprint.enumTypes.length === 0;

  if (!ledger.schemaExists && emptyPublic) {
    return { state: "A", description: "Fresh empty database", pending: manifest.migrations.map((migration) => migration.tag), fingerprint, ledger, diagnostics: schemaDiagnostics(fingerprint, expectedStage(manifest, 0)) };
  }
  if (!ledger.schemaExists && fingerprint.hash === manifest.states.phase1.hash) {
    return { state: "B", description: "Exact ledgerless Phase 1 database", pending: manifest.migrations.slice(1).map((migration) => migration.tag), adopt: manifest.migrations.slice(0, 1), fingerprint, ledger, diagnostics: schemaDiagnostics(fingerprint, manifest.states.phase1) };
  }
  if (!ledger.schemaExists && fingerprint.hash === manifest.states.phase1And2.hash) {
    return { state: "C", description: "Exact ledgerless Phase 1+2 database", pending: [], adopt: manifest.migrations.slice(0, 2), fingerprint, ledger, diagnostics: schemaDiagnostics(fingerprint, manifest.states.phase1And2) };
  }
  if (ledger.schemaExists && ledgerValidation.valid) {
    const expected = expectedStage(manifest, ledgerValidation.count);
    if (expected && ((ledgerValidation.count === 0 && emptyPublic) || fingerprint.hash === expected.hash)) {
      return { state: "D", description: "Ledger and database agree", pending: manifest.migrations.slice(ledgerValidation.count).map((migration) => migration.tag), fingerprint, ledger, diagnostics: schemaDiagnostics(fingerprint, expected) };
    }
  }

  const candidate = fingerprint.tables.length <= manifest.states.phase1.tables.length ? manifest.states.phase1 : manifest.states.phase1And2;
  return {
    state: "E",
    description: "Partial, contradictory, or unknown database state",
    pending: [],
    fingerprint,
    ledger,
    diagnostics: {
      ...schemaDiagnostics(fingerprint, candidate),
      ledgerReason: ledgerValidation.reason ?? "Ledger stage and public schema fingerprint disagree.",
    },
  };
}

export async function assertTargetSafety(client, connectionString, { allowDisposableTest = false, apply = false, backupConfirmed = false } = {}) {
  const target = new URL(connectionString);
  const configuredName = decodeURIComponent(target.pathname).replace(/^\//, "");
  const result = await client.query("select current_database() as database_name, inet_server_addr()::text as server_address, inet_client_addr()::text as client_address");
  const row = result.rows[0];
  if (!row || row.database_name !== configuredName) throw new Error("Connected database does not match the explicitly configured target.");
  const loopbackHost = ["localhost", "127.0.0.1", "::1"].includes(target.hostname);
  const loopbackAddress = [row.server_address, row.client_address].every((value) => value === "::1" || String(value).includes("127.0.0.1"));
  const testName = /(test|temp|disposable)/i.test(configuredName) && !/(prod|production|live)/i.test(configuredName);
  if (allowDisposableTest) {
    if (!loopbackHost || !loopbackAddress || !testName) throw new Error("Disposable override requires loopback addresses and an explicitly test-only database name.");
    return { classification: "DISPOSABLE_LOOPBACK_TEST" };
  }
  if (apply && !backupConfirmed) throw new Error("Non-test migration changes require explicit backup confirmation.");
  return { classification: "NON_TEST_REQUIRES_OPERATOR_REVIEW" };
}

async function createAndAdoptLedger(client, migrations) {
  await client.query("begin");
  try {
    await client.query("create schema drizzle");
    await client.query(`create table drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )`);
    for (const migration of migrations) {
      await client.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)", [migration.hash, migration.when]);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

export async function runNormalMigrator(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

export async function reconcileMigrationState(connectionString, options = {}) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  let clientClosed = false;
  try {
    const safety = await assertTargetSafety(client, connectionString, options);
    const before = await inspectMigrationState(client);
    if (before.state === "E") return { safety, before, applied: false, refused: true };
    if (!options.apply) return { safety, before, applied: false, refused: false, dryRun: true };
    if (before.state === "B" || before.state === "C") await createAndAdoptLedger(client, before.adopt);
    await client.end();
    clientClosed = true;
    await runNormalMigrator(connectionString);
    const verifyClient = new pg.Client({ connectionString });
    await verifyClient.connect();
    try {
      const after = await inspectMigrationState(verifyClient);
      if (after.state !== "D" || after.pending.length !== 0) throw new Error("Reconciliation did not reach a fully migrated State D database.");
      return { safety, before, after, applied: true, refused: false };
    } finally {
      await verifyClient.end();
    }
  } finally {
    if (!clientClosed) await client.end();
  }
}

export function publicMigrationResult(result) {
  const compact = (state) => state && ({
    state: state.state,
    description: state.description,
    pending: state.pending,
    adopt: state.adopt?.map(({ tag, hash, when }) => ({ tag, hash, when })),
    diagnostics: state.diagnostics,
  });
  return {
    safety: result.safety,
    before: compact(result.before),
    after: compact(result.after),
    dryRun: result.dryRun ?? false,
    applied: result.applied,
    refused: result.refused,
  };
}
