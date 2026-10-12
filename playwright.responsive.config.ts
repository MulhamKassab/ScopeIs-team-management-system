import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const port = Number(process.env.SCOPEIS_PLAYWRIGHT_PORT);
if (process.env.SCOPEIS_RESPONSIVE_E2E !== "true" || !Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("Responsive checks require an owned disposable database and runner-allocated loopback port. Run npm run test:responsive.");
}

// Chrome may be installed for this Windows user rather than in Program Files.
// Prefer the actual official installation; the other guarded journeys' bundled
// Chromium remains the portable fallback when Chrome is absent.
const chromeCandidates = process.platform === "win32" ? [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ...(process.env.LOCALAPPDATA ? [join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")] : []),
  join(homedir(), "AppData", "Local", "Google", "Chrome", "Application", "chrome.exe"),
] : process.platform === "darwin" ? [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
] : ["/opt/google/chrome/chrome", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"];
const chromeExecutable = chromeCandidates.find((path) => existsSync(path));
process.stdout.write(`Responsive browser: ${chromeExecutable ? `Google Chrome (${chromeExecutable})` : "Playwright Chromium"}.\n`);

export default defineConfig({
  workers: 1,
  testDir: "./test/e2e",
  testMatch: "responsive.spec.ts",
  outputDir: "test-results/responsive",
  timeout: 240_000,
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: "chromium", ...(chromeExecutable ? { channel: "chrome", launchOptions: { executablePath: chromeExecutable } } : {}), hasTouch: true, actionTimeout: 10_000, trace: "retain-on-failure" },
  webServer: {
    command: `node scripts/run-phase2-safe-build.mjs --serve-port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false, gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    timeout: 600_000,
  },
});
