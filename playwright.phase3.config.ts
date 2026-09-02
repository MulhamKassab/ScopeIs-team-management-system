import { defineConfig } from "@playwright/test";

const port = Number(process.env.SCOPEIS_PLAYWRIGHT_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65_535) throw new Error("Phase 3 Playwright requires a runner-allocated loopback port.");
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./test/e2e", testMatch: "phase3-operations.spec.ts", timeout: 45_000,
  use: { baseURL, trace: "on-first-retry" }, webServer: { command: `node scripts/run-phase2-safe-build.mjs --serve-port ${port}`, url: baseURL, reuseExistingServer: false, timeout: 120_000 },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
