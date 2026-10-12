import { fork } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { disposableStats, withDisposableTestDatabase } from "./disposable-test-database.mjs";
import { OwnedResponsiveProcesses, ResponsiveCancellation } from "./owned-responsive-processes.mjs";

if (process.env.SCOPEIS_RESPONSIVE_CANCELLATION_FIXTURE !== "true" || !process.connected) throw new Error("Cancellation fixture requires its explicit local IPC test guard.");
const fixture = fileURLToPath(import.meta.url);
const [mode, phase] = process.argv.slice(2);
function send(message) { return new Promise((resolve, reject) => process.send(message, (error) => error ? reject(error) : resolve())); }
function readyMessage(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", () => reject(new Error("Synthetic owned root exited before readiness.")));
    child.on("message", (message) => { if (message?.type === "ready") resolve(message); });
  });
}

if (mode === "leaf") {
  // A real descendant listener makes leaked trees observable independently.
  const server = createServer((_request, response) => { response.writeHead(phase === "readiness" ? 503 : 200); response.end("Fictional cancellation fixture"); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  await send({ type: "ready", leafPid: process.pid, port: server.address().port });
} else if (mode === "wrapper") {
  const leaf = fork(fixture, ["leaf", phase], { env: process.env, windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"] });
  await send({ ...await readyMessage(leaf), rootPid: process.pid });
} else if (mode === "guard" && ["readiness", "browser"].includes(phase)) {
  const owned = new OwnedResponsiveProcesses();
  const events = [];
  const directories = [];
  let exitCode = 1;
  // Synthetic dispatch verifies the same registered catchable handler; it is
  // deliberately distinct from an uncatchable Windows forced process kill.
  const signalDispatch = (message) => { if (message?.type === "fixture-catchable-signal" && message.signal === "SIGINT") process.emit("SIGINT"); };
  process.on("message", signalDispatch);
  try {
    await withDisposableTestDatabase(`responsive_cancel_${phase}`, async ({ databaseName, env }) => {
      for (const label of ["build", "files"]) {
        const directory = await mkdtemp(join(tmpdir(), `scopeis-responsive-cancellation-${label}-`));
        directories.push(directory);
        await writeFile(join(directory, "fictional-artifact.txt"), "Owned synthetic test artifact");
      }
      const childOptions = { env: { ...env, SCOPEIS_RESPONSIVE_CANCELLATION_FIXTURE: "true" }, stdio: ["ignore", "ignore", "ignore", "ipc"] };
      const server = owned.spawn("server", process.execPath, [fixture, "wrapper", phase], childOptions);
      const roots = [await readyMessage(server)];
      if (phase === "browser") {
        await owned.waitForServer(`http://127.0.0.1:${roots[0].port}`, Date.now() + 30_000);
        const browser = owned.spawn("browser", process.execPath, [fixture, "wrapper", "browser"], childOptions);
        roots.push(await readyMessage(browser));
      }
      events.push("phase-ready");
      await send({ type: "phase-ready", phase, databaseName, directories, roots });
      try {
        if (phase === "readiness") await owned.waitForServer(`http://127.0.0.1:${roots[0].port}`, Date.now() + 30_000);
        else await owned.waitForExit("browser", Date.now() + 30_000);
        throw new Error("Synthetic fixture unexpectedly completed without cancellation.");
      } finally {
        await owned.stopAll();
        events.push("owned-trees-stopped-before-database-teardown");
      }
    });
  } catch (error) {
    if (!(error instanceof ResponsiveCancellation)) throw error;
    exitCode = error.exitCode;
  } finally {
    await owned.stopAll();
    events.push("database-teardown-complete");
    for (const directory of directories) await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    events.push("directories-removed");
    await send({ type: "cleanup-complete", stats: disposableStats(), events });
    process.off("message", signalDispatch);
    owned.dispose();
    process.disconnect();
  }
  process.exitCode = exitCode;
} else throw new Error("Unsupported cancellation fixture mode.");
