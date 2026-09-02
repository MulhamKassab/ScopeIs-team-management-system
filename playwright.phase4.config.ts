import { defineConfig } from "@playwright/test";

const port = Number(process.env.SCOPEIS_PLAYWRIGHT_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65_535) throw new Error("Phase 4 Playwright requires a runner-allocated loopback port.");
export default defineConfig({ testDir: "./test/e2e", testMatch: "phase4-scheduling.spec.ts", timeout: 60_000, use: { baseURL: `http://127.0.0.1:${port}`, trace: "on-first-retry" }, webServer: { command: `node scripts/run-phase2-safe-build.mjs --serve-port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 120_000 }, projects: [{ name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } }, { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }] });
