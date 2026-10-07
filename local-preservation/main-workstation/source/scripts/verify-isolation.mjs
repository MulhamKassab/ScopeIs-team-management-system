// Proves the isolation and environment guarantees the aggregate gates rely on.
//
// 1. Two concurrently created disposable databases are distinct and mutually invisible.
// 2. The persistent configured `.env.test` database is unchanged by disposable gate work.
// 3. Loopback ports are allocated uniquely, never reused by two suites.
// 4. Unsafe disposable database names are refused.
// 5. No harness/configuration file references `.env.production`.

import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";
import { allocateLoopbackPort, loadPhase1TestConfiguration, repositoryRoot } from "./phase1-test-environment.mjs";
import { assertDisposableName, persistentTestDatabaseBaseline, withDisposableTestDatabase } from "./disposable-test-database.mjs";

const checks = [];
function check(name, passed, detail) {
  checks.push({ name, passed, detail });
  process.stdout.write(`  ${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}\n`);
}

async function insertMarker(databaseUrl, reference) {
  const client = new pg.Client({ connectionString: databaseUrl }); await client.connect();
  try {
    await client.query("insert into admin_scope_grants (user_id, scope_type, scope_reference) values ('mock-admin-ava','TEAM',$1)", [reference]);
  } finally { await client.end(); }
}

async function countMarker(databaseUrl, reference) {
  const client = new pg.Client({ connectionString: databaseUrl }); await client.connect();
  try {
    const result = await client.query("select count(*)::int as count from admin_scope_grants where scope_reference = $1", [reference]);
    return result.rows[0].count;
  } finally { await client.end(); }
}

process.stdout.write("Isolation proof\n");

const baseline = await persistentTestDatabaseBaseline();
const persistentName = (await loadPhase1TestConfiguration()).databaseName;
const markerOne = `team:isolation-${randomUUID()}`;
const markerTwo = `team:isolation-${randomUUID()}`;

function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
const oneReady = deferred(); const twoReady = deferred();
let firstName; let secondName; let firstUrl; let secondUrl; let firstSawOther = -1; let secondSawOther = -1;

// Both disposable databases exist (and are seeded by the harness) while both callbacks run, so each
// callback can prove it cannot see the other suite's rows. The harness drops each database after
// its own callback returns.
await Promise.all([
  withDisposableTestDatabase("isolation_probe_one", async ({ databaseName, databaseUrl }) => {
    firstName = databaseName; firstUrl = databaseUrl;
    await insertMarker(databaseUrl, markerOne); oneReady.resolve(); await twoReady.promise;
    firstSawOther = await countMarker(databaseUrl, markerTwo);
  }),
  withDisposableTestDatabase("isolation_probe_two", async ({ databaseName, databaseUrl }) => {
    secondName = databaseName; secondUrl = databaseUrl;
    await insertMarker(databaseUrl, markerTwo); twoReady.resolve(); await oneReady.promise;
    secondSawOther = await countMarker(databaseUrl, markerOne);
  }),
]);
check("disposable databases are distinct", firstName !== secondName, `${firstName} vs ${secondName}`);
check("disposable database names are test-scoped", /test/i.test(firstName) && /test/i.test(secondName) && firstName !== persistentName && secondName !== persistentName, `persistent target is ${persistentName}`);
check("one disposable database cannot see the other's rows", firstSawOther === 0 && secondSawOther === 0, `observed ${firstSawOther} and ${secondSawOther}`);

async function reachable(url) {
  const client = new pg.Client({ connectionString: url });
  try { await client.connect(); return true; } catch { return false; } finally { await client.end().catch(() => {}); }
}
check("disposable databases are dropped after their suite finishes", !(await reachable(firstUrl)) && !(await reachable(secondUrl)));

const after = await persistentTestDatabaseBaseline();
check("persistent configured test database is unchanged by disposable work", JSON.stringify(baseline) === JSON.stringify(after));

const ports = await Promise.all([allocateLoopbackPort(), allocateLoopbackPort(), allocateLoopbackPort()]);
check("allocated loopback ports are unique", new Set(ports).size === ports.length, ports.join(", "));
check("allocated loopback ports are non-privileged", ports.every((port) => Number.isInteger(port) && port >= 1024 && port <= 65_535));

let refused = 0;
for (const name of ["scopeis_prod_test", "scopeis_live_test", "scopeis_database", "scopeis-test", "production_test"]) {
  try { assertDisposableName(name); } catch { refused += 1; }
}
check("unsafe disposable names are refused", refused === 5, `${refused}/5 refused`);

const harnessFiles = [
  // This scanner is excluded because it necessarily contains the pattern it searches for.
  ...(await readdir(join(repositoryRoot, "scripts"))).filter((name) => name.endsWith(".mjs") && name !== "verify-isolation.mjs").map((name) => join("scripts", name)),
  "package.json", "playwright.config.ts", "vitest.config.ts", "drizzle.config.ts", "drizzle.test.config.ts", "drizzle.certification.config.ts", "eslint.config.mjs",
];
// Only executable lines are scanned; prose comments legitimately explain the build-safety policy.
const executable = (contents) => contents.split("\n").filter((line) => { const trimmed = line.trim(); return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*"); }).join("\n");
const referencing = [];
for (const file of harnessFiles) {
  const contents = executable(await readFile(join(repositoryRoot, file), "utf8"));
  if (contents.includes("env.production")) referencing.push(file);
}
check("no harness or configuration file loads or reads .env.production", referencing.length === 0, referencing.length ? referencing.join(", ") : `${harnessFiles.length} files scanned`);

const failed = checks.filter((item) => !item.passed);
process.stdout.write(`Isolation proof: ${checks.length - failed.length}/${checks.length} checks passed\n`);
process.exitCode = failed.length === 0 ? 0 : 1;
