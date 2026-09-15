// Fictional seed smoke: runs the real `src/db/seed/index.ts` against a freshly created
// loopback-only disposable database, verifies the five fictional personas and their scope grants,
// and proves the seed is idempotent when re-run. No persistent/production database is reachable.

import { join } from "node:path";
import pg from "pg";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";

const tsx = join(repositoryRoot, "node_modules", "tsx", "dist", "cli.mjs");
const seedEntry = join(repositoryRoot, "src", "db", "seed", "index.ts");
const personaIds = ["mock-super-admin-nora", "mock-admin-ava", "mock-admin-ben", "mock-employee-cora", "mock-employee-dan"];

let exitCode = 0;
await withDisposableTestDatabase("seed_smoke", async ({ databaseUrl, env }) => {
  for (const pass of [1, 2]) {
    const result = await runChild(process.execPath, [tsx, seedEntry], { cwd: repositoryRoot, env, timeoutMs: 90_000 });
    if (result.exitCode !== 0) throw new Error(`Fictional seed pass ${pass} failed with exit code ${result.exitCode}.`);
    process.stdout.write(`Fictional seed pass ${pass} completed (idempotent re-run included).\n`);
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const users = await client.query("select count(*)::int as count from users where id = any($1::text[])", [personaIds]);
    if (users.rows[0].count !== 5) throw new Error("Fictional seed did not produce exactly five personas.");
    const grants = await client.query("select user_id, scope_reference from admin_scope_grants where active = true and user_id = any($1::text[]) order by user_id, scope_reference", [["mock-admin-ava", "mock-admin-ben"]]);
    const pairs = grants.rows.map((row) => `${row.user_id}:${row.scope_reference}`);
    if (!pairs.includes("mock-admin-ava:team:alpha") || !pairs.includes("mock-admin-ben:team:bravo")) throw new Error("Fictional seed scope grants are missing.");
    const duplicates = await client.query("select count(*)::int as count from admin_scope_grants where user_id = any($1::text[])", [personaIds]);
    if (duplicates.rows[0].count !== 2) throw new Error("Fictional seed is not idempotent: duplicate scope grants were created.");
    process.stdout.write("Fictional seed smoke verified 5 personas and 2 non-duplicated Admin scope grants.\n");
  } finally { await client.end(); }
}).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  exitCode = 1;
});

process.stdout.write(`Seed smoke disposable database cleanup complete (${exitCode === 0 ? "PASS" : "FAIL"}).\n`);
process.exitCode = exitCode;
