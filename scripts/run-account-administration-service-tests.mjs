import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";

await withDisposableTestDatabase("account_administration", async ({ env }) => {
  const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules/vitest/vitest.mjs"), "run", "test/integration/account-administration.test.ts"], { cwd: repositoryRoot, env, timeoutMs: 180_000 });
  process.exitCode = result.exitCode;
});
