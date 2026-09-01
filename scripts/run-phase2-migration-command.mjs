import { spawn } from "node:child_process";
import { join } from "node:path";
import { loadPhase1TestConfiguration, phase1TestProcessEnvironment, repositoryRoot } from "./phase1-test-environment.mjs";

const configuration = await loadPhase1TestConfiguration();
const child = spawn(process.execPath, [join(repositoryRoot, "scripts", "phase2-migration-state.mjs"), ...process.argv.slice(2), "--allow-disposable-test"], {
  cwd: repositoryRoot,
  env: phase1TestProcessEnvironment(configuration, { SCOPEIS_MIGRATION_DATABASE_URL: configuration.databaseUrl }),
  stdio: "inherit",
});
child.once("error", (error) => { throw error; });
process.exitCode = await new Promise((resolve) => child.once("exit", (code) => resolve(code ?? 1)));
