// Fictional seed smoke: runs the real `src/db/seed/index.ts` against a freshly created
// loopback-only disposable database, verifies the five fictional personas and their scope grants,
// and proves the seed is idempotent when re-run. No persistent/production database is reachable.

import { join } from "node:path";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { evidenceFixtures, phase9Evidence } from "./phase9-test-fixtures.mjs";

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

    // Phase 9 fictional evidence + private file smoke: proves the seeded developer state can hold
    // capability evidence and an opaque private object alongside the personas.
    const storageRoot = await mkdtemp(join(tmpdir(), "scopeis-seed-smoke-"));
    try {
      const ownerUserId = "mock-employee-cora";
      const issueDate = "2026-01-15";
      const expiryDate = "2027-01-15";
      const storageKey = `evidence/${ownerUserId}/${randomUUID()}.pdf`;
      const objectPath = join(storageRoot, storageKey);
      await mkdir(join(storageRoot, "evidence", ownerUserId), { recursive: true });
      await writeFile(objectPath, evidenceFixtures.pdf("fictional seed smoke evidence"));
      await client.query("begin");
      const inserted = await client.query(
        `insert into employee_evidence (owner_user_id, uploader_user_id, kind, title, issuer, issue_date, expiry_date, last_submitted_at, submission_key)
         values ($1,$1,$2,$3,$4,$5,$6, now(), $7) returning id`,
        [ownerUserId, phase9Evidence.certification.kind, phase9Evidence.certification.title, phase9Evidence.certification.issuer, issueDate, expiryDate, `seed-smoke-${randomUUID()}`],
      );
      await client.query(
        `insert into employee_files (evidence_id, owner_user_id, uploader_user_id, storage_key, original_filename, content_type, size_bytes, version)
         values ($1,$2,$2,$3,'Fictional Seed Evidence.pdf','application/pdf',$4,1)`,
        [inserted.rows[0].id, ownerUserId, storageKey, (await stat(objectPath)).size],
      );
      await client.query("commit");
      const evidenceRows = await client.query("select count(*)::int as count from employee_evidence where owner_user_id=$1 and kind='certification'", [ownerUserId]);
      const fileRows = await client.query("select count(*)::int as count from employee_files where evidence_id=$1 and version=1 and archived_at is null", [inserted.rows[0].id]);
      if (evidenceRows.rows[0].count < 1 || fileRows.rows[0].count !== 1) throw new Error("Fictional evidence/file seed smoke verification failed.");
      await client.query("begin");
      await client.query("delete from employee_files where evidence_id=$1", [inserted.rows[0].id]);
      await client.query("delete from employee_evidence where id=$1", [inserted.rows[0].id]);
      await client.query("commit");
      process.stdout.write("Fictional seed smoke verified capability evidence with an opaque private file object.\n");
    } finally { await rm(storageRoot, { recursive: true, force: true }); }
  } finally { await client.end(); }
}).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  exitCode = 1;
});

process.stdout.write(`Seed smoke disposable database cleanup complete (${exitCode === 0 ? "PASS" : "FAIL"}).\n`);
process.exitCode = exitCode;
