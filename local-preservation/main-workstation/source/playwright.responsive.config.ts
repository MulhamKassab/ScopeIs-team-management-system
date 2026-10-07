import { defineConfig } from "@playwright/test";

const port = Number(process.env.SCOPEIS_PLAYWRIGHT_PORT);
if (process.env.SCOPEIS_RESPONSIVE_E2E !== "true" || !Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("Responsive checks require an owned disposable database and runner-allocated loopback port. Run npm run test:responsive.");
}

export default defineConfig({
  workers: 1,
  testDir: "./test/e2e",
  testMatch: "responsive.spec.ts",
  outputDir: "test-results/responsive",
  timeout: 240_000,
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: "chromium", channel: "chrome", hasTouch: true, actionTimeout: 10_000, trace: "retain-on-failure" },
  webServer: {
    command: `node scripts/run-phase2-safe-build.mjs --serve-port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false, gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    timeout: 120_000,
  },
});
