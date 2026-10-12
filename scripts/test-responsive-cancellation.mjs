import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { createConnection } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { assertPhase1TestDatabaseSafety, loadPhase1TestConfiguration, phase1TestProcessEnvironment, repositoryRoot } from "./phase1-test-environment.mjs";
import { OwnedResponsiveProcesses } from "./owned-responsive-processes.mjs";

const configuration = await loadPhase1TestConfiguration();
await assertPhase1TestDatabaseSafety(configuration);
const owned = new OwnedResponsiveProcesses();
const results = [];
function alive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
function listening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(1000);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
  });
}
async function eventually(predicate, message) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) { if (await predicate()) return; await delay(50); }
  assert.fail(message);
}
function messagePromise(child, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Cancellation fixture did not emit ${type}.`)), 60_000);
    const handler = (message) => { if (message?.type === type) { clearTimeout(timer); child.off("message", handler); resolve(message); } };
    child.on("message", handler);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
  });
}

try {
  for (const phase of ["readiness", "browser"]) for (const control of ["ipc", "registered-SIGINT"]) {
    const role = `${phase}-${control}`;
    const child = owned.spawn(role, process.execPath, [join(repositoryRoot, "scripts", "responsive-cancellation-fixture.mjs"), "guard", phase], { cwd: repositoryRoot, env: { ...phase1TestProcessEnvironment(configuration), SCOPEIS_RESPONSIVE_CANCELLATION_FIXTURE: "true" }, stdio: ["ignore", "inherit", "inherit", "ipc"] });
    const readiness = messagePromise(child, "phase-ready");
    const completion = messagePromise(child, "cleanup-complete");
    void completion.catch(() => {});
    const before = await readiness;
    for (const root of before.roots) {
      assert.equal(alive(root.rootPid), true);
      assert.equal(alive(root.leafPid), true);
      assert.equal(await listening(root.port), true);
    }
    for (const directory of before.directories) await access(directory);
    child.send(control === "ipc" ? { type: "scopeis-responsive-cancel" } : { type: "fixture-catchable-signal", signal: "SIGINT" });
    const exit = await owned.waitForExit(role, Date.now() + 60_000);
    assert.equal(exit, 130);
    const after = await completion;
    assert.deepEqual(after.stats, { created: 1, dropped: 1, owned: [] });
    assert.deepEqual(after.events, ["phase-ready", "owned-trees-stopped-before-database-teardown", "database-teardown-complete", "directories-removed"]);
    for (const root of before.roots) {
      await eventually(() => !alive(root.rootPid) && !alive(root.leafPid), "Owned process tree leaked after controlled cancellation.");
      assert.equal(await listening(root.port), false);
    }
    for (const directory of before.directories) await assert.rejects(access(directory), { code: "ENOENT" });
    const client = new pg.Client({ connectionString: configuration.databaseUrl });
    await client.connect();
    try { assert.equal((await client.query("select exists(select 1 from pg_database where datname=$1) as exists", [before.databaseName])).rows[0].exists, false); }
    finally { await client.end(); }
    results.push({ phase, control, exitCode: exit, ownedRootCount: before.roots.length, descendantListenersClosed: true, databaseDropped: true, directoriesRemoved: true });
    process.stdout.write(`PASS responsive cancellation: ${phase} / ${control}; owned trees stopped before database teardown.\n`);
  }
} finally { await owned.stopAll(); owned.dispose(); }
process.stdout.write(`${JSON.stringify({ passed: results.length, results, limit: "Controlled IPC and synthetic registered catchable-signal dispatch verified. Forced Windows termination/power loss cannot guarantee JavaScript cleanup." })}\n`);
