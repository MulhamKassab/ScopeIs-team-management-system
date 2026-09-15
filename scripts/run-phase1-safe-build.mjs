import { spawn } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertPhase1TestDatabaseSafety,
  loadPhase1TestConfiguration,
  phase1TestProcessEnvironment,
  repositoryRoot,
} from "./phase1-test-environment.mjs";

const configuration = await loadPhase1TestConfiguration();
await assertPhase1TestDatabaseSafety(configuration);
const temporaryApplication = await mkdtemp(join(tmpdir(), "scopeis-phase1-build-"));

async function run(command, args, options) {
  const child = spawn(command, args, { ...options, stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

let exitCode = 1;
try {
  for (const path of ["src", "public", "next.config.ts", "tsconfig.json", "next-env.d.ts", "package.json", "package-lock.json"]) {
    await cp(join(repositoryRoot, path), join(temporaryApplication, path), { recursive: true });
  }
  if (process.platform === "darwin") {
    const copyExit = await run("/bin/cp", ["-cR", join(repositoryRoot, "node_modules"), join(temporaryApplication, "node_modules")], {});
    if (copyExit !== 0) throw new Error("Unable to clone installed dependencies for the isolated build.");
  } else {
    await cp(join(repositoryRoot, "node_modules"), join(temporaryApplication, "node_modules"), { recursive: true });
  }
  exitCode = await run("npm", ["run", "build"], {
    cwd: temporaryApplication,
    env: phase1TestProcessEnvironment(configuration),
  });
} finally {
  await rm(temporaryApplication, { recursive: true, force: true });
  process.stdout.write("Phase 1 isolated build cleanup complete.\n");
}
process.exitCode = exitCode;
