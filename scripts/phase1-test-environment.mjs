import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import pg from "pg";

export const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export async function allocateLoopbackPort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const selected = typeof address === "object" && address ? address.port : null;
      probe.close((error) => error ? reject(error) : selected ? resolve(selected) : reject(new Error("Unable to allocate a loopback test port.")));
    });
  });
}

function isLoopback(value) {
  return typeof value === "string" && (value === "::1" || value.includes("127.0.0.1"));
}

export async function loadPhase1TestConfiguration() {
  const values = parse(await readFile(join(repositoryRoot, ".env.test"), "utf8"));
  const disposableOverride = process.env.SCOPEIS_DISPOSABLE_TEST_DATABASE === "true" ? process.env.DATABASE_URL : undefined;
  const selectedDatabaseUrl = disposableOverride ?? values.DATABASE_URL;
  if (!selectedDatabaseUrl) throw new Error("Phase 1 certification requires DATABASE_URL in .env.test.");
  const target = new URL(selectedDatabaseUrl);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) throw new Error("Phase 1 certification requires PostgreSQL.");
  if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname)) throw new Error("Phase 1 certification requires a loopback database host.");
  const databaseName = decodeURIComponent(target.pathname).replace(/^\//, "");
  if (!/test/i.test(databaseName) || /(prod|production|live)/i.test(databaseName)) throw new Error("Phase 1 certification requires an explicitly test-only database name.");
  if (values.APP_ENV !== "test") throw new Error("Phase 1 certification requires APP_ENV=test in .env.test.");
  if (values.MOCK_AUTH_ENABLED !== "true") throw new Error("Phase 1 certification requires fictional mock authentication in .env.test.");
  return {
    databaseUrl: selectedDatabaseUrl,
    databaseName,
    sessionTtlHours: values.SESSION_TTL_HOURS ?? "1",
  };
}

export function phase1TestProcessEnvironment(configuration, extra = {}) {
  const inherited = Object.fromEntries(
    ["PATH", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "SHELL", "HOME", "USER", "LOGNAME"]
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]]),
  );
  return {
    ...inherited,
    DATABASE_URL: configuration.databaseUrl,
    APP_ENV: "test",
    MOCK_AUTH_ENABLED: "true",
    SESSION_TTL_HOURS: configuration.sessionTtlHours,
    SCOPEIS_E2E_TEST: "true",
    SCOPEIS_DISPOSABLE_TEST_DATABASE: "true",
    ...extra,
  };
}

export async function assertPhase1TestDatabaseSafety(configuration) {
  const pool = new pg.Pool({ connectionString: configuration.databaseUrl, max: 1 });
  try {
    const result = await pool.query("select current_database() as database_name, inet_server_addr()::text as server_address, inet_client_addr()::text as client_address");
    const row = result.rows[0];
    if (!row || row.database_name !== configuration.databaseName || !/test/i.test(row.database_name) || /(prod|production|live)/i.test(row.database_name)) {
      throw new Error("Connected database did not match the approved disposable test target.");
    }
    if (!isLoopback(row.server_address) || !isLoopback(row.client_address)) throw new Error("PostgreSQL connection is not loopback-only.");
  } finally {
    await pool.end();
  }
}

export async function assertPhase1FictionalFixtures(configuration) {
  const pool = new pg.Pool({ connectionString: configuration.databaseUrl, max: 1 });
  try {
    const result = await pool.query(
      "select id, role::text as role from users where id = any($1::text[]) order by id",
      [["mock-super-admin-nora", "mock-admin-ava", "mock-admin-ben", "mock-employee-cora", "mock-employee-dan"]],
    );
    const observed = new Map(result.rows.map((row) => [row.id, row.role]));
    const expected = new Map([
      ["mock-super-admin-nora", "SUPER_ADMIN"],
      ["mock-admin-ava", "ADMIN"],
      ["mock-admin-ben", "ADMIN"],
      ["mock-employee-cora", "EMPLOYEE"],
      ["mock-employee-dan", "EMPLOYEE"],
    ]);
    if (observed.size !== expected.size || [...expected].some(([id, role]) => observed.get(id) !== role)) {
      throw new Error("The disposable test database does not contain the exact five fictional Phase 1 personas.");
    }
    const scopes = await pool.query(
      "select user_id, scope_reference from admin_scope_grants where active = true and user_id = any($1::text[]) order by user_id, scope_reference",
      [["mock-admin-ava", "mock-admin-ben"]],
    );
    const scopePairs = scopes.rows.map((row) => `${row.user_id}:${row.scope_reference}`);
    if (!scopePairs.includes("mock-admin-ava:team:alpha") || !scopePairs.includes("mock-admin-ben:team:bravo")) {
      throw new Error("The disposable test database is missing the fictional Admin scope grants.");
    }
  } finally {
    await pool.end();
  }
}
