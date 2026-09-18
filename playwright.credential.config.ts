import { defineConfig } from "@playwright/test";

const port = Number(process.env.SCOPEIS_PLAYWRIGHT_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Credential Playwright requires a runner-allocated loopback port.");

export default defineConfig({
  workers: 1,
  testDir: "./test/e2e",
  testMatch: "credential-login.spec.ts",
  timeout: 240_000,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "off" },
  webServer: { command: `npm run build:safe -- --serve-port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 120_000, stdout: "pipe" },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
