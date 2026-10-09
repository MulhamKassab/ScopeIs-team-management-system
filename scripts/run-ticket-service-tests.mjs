import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { disposableStats, runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";

const suites = [
  ["ticket_service", "test/integration/tickets.test.ts"],
  ["ticket_files", "test/integration/ticket-files.test.ts"],
];
let exitCode = 0;
try {
  for (const [label, file] of suites) {
    await withDisposableTestDatabase(label, async ({ env }) => {
      const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", file, ...process.argv.slice(2)], { cwd: repositoryRoot, env, timeoutMs: 300_000 });
      if (result.timedOut) throw new Error(`Company ticket suite timed out: ${file}`);
      if (result.exitCode !== 0) exitCode = result.exitCode;
    });
  }
} finally {
  const stats = disposableStats();
  process.stdout.write(`Company ticket disposable database cleanup complete: ${stats.created} created, ${stats.dropped} dropped, ${stats.owned.length} retained.\n`);
  if (stats.created !== stats.dropped || stats.owned.length !== 0) exitCode = 1;
}
process.exitCode = exitCode;
