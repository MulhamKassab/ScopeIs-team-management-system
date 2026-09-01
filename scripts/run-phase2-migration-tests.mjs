import { spawn } from "node:child_process";
import { join } from "node:path";
import { assertPhase1TestDatabaseSafety, loadPhase1TestConfiguration, phase1TestProcessEnvironment, repositoryRoot } from "./phase1-test-environment.mjs";

const configuration = await loadPhase1TestConfiguration();
await assertPhase1TestDatabaseSafety(configuration);
const child = spawn(process.execPath, [join(repositoryRoot, "node_modules", "vitest", "vitest.mjs"), "run", "test/migration/phase2-database-foundation.test.ts", ...process.argv.slice(2)], {
  cwd: repositoryRoot,
  env: phase1TestProcessEnvironment(configuration, { SCOPEIS_PHASE2_ADMIN_DATABASE_URL: configuration.databaseUrl }),
  stdio: "inherit",
});
child.once("error", (error) => { throw error; });
process.exitCode = await new Promise((resolve) => child.once("exit", (code) => resolve(code ?? 1)));
