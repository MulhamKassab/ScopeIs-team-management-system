import { join } from "node:path";
import { repositoryRoot } from "./phase1-test-environment.mjs";
import { runChild, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { seedPhase4Journey } from "./phase4-test-fixtures.mjs";
let exitCode=1;
await withDisposableTestDatabase("timetable_service", async ({ databaseUrl, env }) => {
  await seedPhase4Journey(databaseUrl);
  const result=await runChild(process.execPath,[join(repositoryRoot,"node_modules","vitest","vitest.mjs"),"run","test/integration/timetable-organisation.test.ts",...process.argv.slice(2)],{cwd:repositoryRoot,env,timeoutMs:240_000});
  exitCode=result.exitCode;
});
process.exitCode=exitCode;
