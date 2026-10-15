import { defineConfig } from "@playwright/test";
const port = Number(process.env.SCOPEIS_PLAYWRIGHT_PORT);
if (process.env.SCOPEIS_USABILITY_E2E !== "true" || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Use the guarded usability review runner.");
export default defineConfig({
  workers: 1, testDir: "./test/e2e", testMatch: ["usability-review.spec.ts", "phase5-leave.spec.ts", "phase8-planning-map.spec.ts"], timeout: 300_000,
  outputDir: "test-results/usability-review", reporter: [["list"], ["json", { outputFile: "test-results/usability-review-results.json" }]],
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: "chromium", trace: "retain-on-failure" },
  webServer: { command: `node scripts/run-phase2-safe-build.mjs --serve-port ${port}`, url: `http://127.0.0.1:${port}/login`, reuseExistingServer: false, gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 }, timeout: 600_000 },
  projects: [{ name: "desktop", use: { viewport: { width: 1440, height: 1000 } } }, { name: "mobile", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }],
});
