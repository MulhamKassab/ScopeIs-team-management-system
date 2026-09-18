import { Pool } from "pg";

async function main() {
  const input = process.env;
  const url = input.SCOPEIS_CREDENTIAL_DATABASE_URL;
  const password = input.SCOPEIS_CREDENTIAL_BOOTSTRAP_PASSWORD;
  if (!url || !password || !input.AUTH_PASSWORD_PEPPER) throw new Error("Explicit inputs required.");
  const target = new URL(url);
  const database = decodeURIComponent(target.pathname.slice(1));
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
  const test = local && /test/i.test(database) && !/(prod|live)/i.test(database) && input.SCOPEIS_DISPOSABLE_TEST_DATABASE === "true";
  if (!test && (input.APP_ENV !== "production" || input.SCOPEIS_CREDENTIAL_CONFIRM !== "SCOPEIS_EXISTING_USER_CREDENTIAL_AUTHENTICATION_R1"
    || input.SCOPEIS_CREDENTIAL_PROJECT_ID !== "prj_pE9utFkTQd6uulsVrDKoqsgmmKKd"
    || input.SCOPEIS_CREDENTIAL_EXPECTED_HOST !== target.hostname || input.SCOPEIS_CREDENTIAL_EXPECTED_DATABASE !== database
    || !input.SCOPEIS_CREDENTIAL_RECOVERY_RECEIPT || local || /(preview|development|test|disposable)/i.test(database))) {
    throw new Error("Target confirmation refused.");
  }
  input.DATABASE_URL = url;
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const row = (await pool.query("select current_database() as name")).rows[0];
    if (row.name !== database) throw new Error("Connected database identity mismatch.");
    const { inspectMigrationState } = await import("./phase2-migration-core.mjs");
    const migration = await inspectMigrationState(pool);
    if (migration.state !== "D" || migration.pending.length || migration.ledger.rows.length !== 13) throw new Error("Migration state is not approved.");
    const { bootstrapExistingUserCredentials } = await import("../src/modules/auth/credential-bootstrap");
    const { db } = await import("../src/db/client");
    try {
      const result = await bootstrapExistingUserCredentials(password);
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } finally { await db.$client.end(); }
  } finally {
    delete input.SCOPEIS_CREDENTIAL_BOOTSTRAP_PASSWORD;
    await pool.end();
  }
}
main().catch(() => {
  process.stderr.write("Credential bootstrap refused or failed. No success receipt was produced.\n");
  process.exitCode = 1;
});
