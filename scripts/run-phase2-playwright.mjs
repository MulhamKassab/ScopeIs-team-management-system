import { join } from "node:path";
import pg from "pg";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";

async function seedDirectoryFixtures(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("insert into employee_profiles (user_id, employee_code, work_email, work_phone, professional_summary, team, default_work_location) values ('mock-employee-cora','EMP-ALPHA-001','cora@example.test','100','Alpha profile','team:alpha','Private Alpha location'),('mock-employee-dan','EMP-BRAVO-001','dan@example.test','200','Bravo profile','team:bravo','Private Bravo location')");
  } finally {
    await client.end();
  }
}

const port = await allocateLoopbackPort();
let exitCode = 1;
await withDisposableTestDatabase("phase2_directory_playwright", async ({ databaseUrl, env }) => {
  await seedDirectoryFixtures(databaseUrl);
  const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "@playwright", "test", "cli.js"), "test", "--config=playwright.phase2.config.ts", ...process.argv.slice(2)], {
    cwd: repositoryRoot, env: { ...env, SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 180_000,
  });
  exitCode = result.exitCode;
  if (result.timedOut) throw new Error("Phase 2 directory Playwright suite timed out.");
});
process.exitCode = exitCode;
