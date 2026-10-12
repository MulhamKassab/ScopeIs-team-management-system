import { spawn } from "node:child_process";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export class ResponsiveCancellation extends Error {
  constructor(reason, exitCode) {
    super(`Responsive checks cancelled: ${reason}.`);
    this.exitCode = exitCode;
  }
}

/** Owns only roots spawned here. Catchable signals/IPC cancel through one cleanup. */
export class OwnedResponsiveProcesses {
  #roots = new Map();
  #errors = new Map();
  #stopping = new Map();
  #stopAllPromise;
  #cancellation;
  #abort = new AbortController();
  #handlers;
  #messageHandler;

  constructor() {
    this.#handlers = [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]].map(([signal, exitCode]) => {
      const handler = () => this.cancel(signal, exitCode);
      process.on(signal, handler);
      return [signal, handler];
    });
    // Node parents can use this controlled protocol on Windows, where an OS
    // forced termination can bypass every JavaScript signal handler/finally.
    this.#messageHandler = (message) => {
      if (message?.type === "scopeis-responsive-cancel") this.cancel("controlled parent request", 130);
    };
    process.on("message", this.#messageHandler);
  }

  cancel(reason, exitCode = 130) {
    if (this.#cancellation) return;
    this.#cancellation = new ResponsiveCancellation(reason, exitCode);
    this.#abort.abort(this.#cancellation);
    // Keep rejection observed here; awaited cleanup below remains authoritative.
    void this.stopAll().catch(() => {});
  }

  throwIfCancelled() {
    if (this.#cancellation) throw this.#cancellation;
  }

  get cancellationExitCode() { return this.#cancellation?.exitCode; }

  spawn(role, command, args, options) {
    this.throwIfCancelled();
    if (this.#roots.has(role)) throw new Error(`Responsive process role already owned: ${role}.`);
    const child = spawn(command, args, { ...options, windowsHide: true, detached: process.platform !== "win32" });
    child.on("error", (error) => this.#errors.set(role, error));
    this.#roots.set(role, child);
    return child;
  }

  async waitForServer(url, deadline, readinessMs = 600_000) {
    const readinessDeadline = Math.min(deadline, Date.now() + readinessMs);
    const server = this.#roots.get("server");
    if (!server) throw new Error("Responsive readiness requires an owned server.");
    while (Date.now() < readinessDeadline) {
      this.throwIfCancelled();
      if (this.#errors.has("server")) throw this.#errors.get("server");
      if (server.exitCode !== null || server.signalCode !== null) throw new Error("Responsive test server exited before readiness.");
      try {
        const response = await fetch(url, { redirect: "manual", signal: AbortSignal.any([AbortSignal.timeout(1000), this.#abort.signal]) });
        this.throwIfCancelled();
        if (response.status === 200) return;
      } catch {
        this.throwIfCancelled();
      }
      try { await delay(150, undefined, { signal: this.#abort.signal }); }
      catch { this.throwIfCancelled(); }
    }
    throw new Error("Responsive isolated build and server did not become ready within its bounded deadline.");
  }

  async waitForExit(role, deadline) {
    this.throwIfCancelled();
    const child = this.#roots.get(role);
    if (!child) throw new Error(`Responsive process role is not owned: ${role}.`);
    if (this.#errors.has(role)) throw this.#errors.get(role);
    const remaining = deadline - Date.now();
    if (remaining <= 0) this.cancel("45-minute aggregate budget exhausted", 1);
    this.throwIfCancelled();
    const timer = setTimeout(() => this.cancel("45-minute aggregate budget exhausted", 1), remaining);
    try {
      const exitCode = child.exitCode !== null || child.signalCode !== null ? child.exitCode ?? 1 : await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code) => resolve(code ?? 1));
      });
      this.throwIfCancelled();
      return exitCode;
    } finally { clearTimeout(timer); await this.stop(role); }
  }

  stop(role) {
    if (this.#stopping.has(role)) return this.#stopping.get(role);
    const stopped = this.#stopRoot(this.#roots.get(role));
    this.#stopping.set(role, stopped);
    return stopped;
  }

  stopAll() {
    this.#stopAllPromise ??= (async () => {
      const outcomes = await Promise.allSettled([...this.#roots.keys()].map((role) => this.stop(role)));
      const failures = outcomes.filter((outcome) => outcome.status === "rejected").map((outcome) => outcome.reason);
      if (failures.length) throw new AggregateError(failures, "Owned responsive process cleanup failed.");
    })();
    return this.#stopAllPromise;
  }

  async #stopRoot(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    if (process.platform === "win32") {
      const killer = spawn(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"), ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      await new Promise((resolve, reject) => { killer.once("error", reject); killer.once("exit", resolve); });
    } else {
      try { process.kill(-child.pid, "SIGTERM"); }
      catch (error) { if (error.code !== "ESRCH") throw error; }
    }
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      const timer = setTimeout(() => {
        if (process.platform === "win32") child.kill("SIGKILL");
        else { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
      }, 7_000);
      child.once("exit", () => { clearTimeout(timer); resolve(); });
    });
  }

  dispose() {
    for (const [signal, handler] of this.#handlers) process.off(signal, handler);
    process.off("message", this.#messageHandler);
  }
}
