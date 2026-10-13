import { join } from "node:path";
import { allocateLoopbackPort, repositoryRoot } from "./phase1-test-environment.mjs";
import { withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { runBrowserWithOwnedBuild } from "./owned-browser-build.mjs";

const port = await allocateLoopbackPort();
let exitCode = 1;
try {
  await withDisposableTestDatabase("credential_browser", async ({ env }) => {
    const result = await runBrowserWithOwnedBuild(
      process.execPath,
      [join(repositoryRoot, "node_modules", "playwright", "cli.js"), "test", "--config", "playwright.credential.config.ts", ...process.argv.slice(2)],
      { cwd: repositoryRoot, env: { ...env, SCOPEIS_CREDENTIAL_E2E: "true", SCOPEIS_PLAYWRIGHT_PORT: String(port) }, timeoutMs: 1_020_000 },
    );
    exitCode = result.exitCode;
    if (result.timedOut) throw new Error("Credential browser journey timed out.");
  });
} finally {
  process.stdout.write("Credential browser disposable database cleanup complete.\n");
}
process.exitCode = exitCode;
