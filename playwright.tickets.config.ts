import { defineConfig } from "@playwright/test";

const port = Number(process.env.SCOPEIS_PLAYWRIGHT_PORT);
if (process.env.SCOPEIS_TICKETS_E2E !== "true" || !Number.isInteger(port) || port < 1024 || port > 65_535) throw new Error("Company ticket Playwright requires its guarded runner and allocated loopback port.");
export default defineConfig({
  workers: 1,
  testDir: "./test/e2e",
  testMatch: "tickets.spec.ts",
  outputDir: "test-results/company-tickets",
  reporter: [["list"], ["json", { outputFile: "test-results/company-tickets-results.json" }]],
  timeout: 180_000,
  use: { baseURL: `http://127.0.0.1:${port}`, actionTimeout: 30_000, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
