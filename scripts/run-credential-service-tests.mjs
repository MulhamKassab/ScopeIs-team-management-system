import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
// This suite proves bootstrap and credential behavior from a credential-free state, so it opts out of
// the harness's pre-seeded credential rows.
await withDisposableTestDatabase("credential_service", async ({ env }) => {
  const result = await runChild(process.execPath, [join(repositoryRoot, "node_modules/vitest/vitest.mjs"), "run", "test/integration/credential-authentication.test.ts"], { cwd: repositoryRoot, env, timeoutMs: 180_000 });
  process.exitCode = result.exitCode;
}, { credentials: false });
