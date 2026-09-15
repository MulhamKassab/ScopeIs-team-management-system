import { defineConfig } from "@playwright/test";

// Canonical Playwright rule: direct invocation is intentionally unsupported. ScopeIs E2E runs need a
// fresh disposable loopback database and an isolated port, which only the guarded runners provide.
// Use `npm run test:e2e` (aggregate) or `npm run test:phaseN-e2e`; the root config therefore fails
// closed instead of inventing a default that could reach a persistent or production database.
const port = Number(process.env.SCOPEIS_PLAYWRIGHT_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65_535) throw new Error("Playwright requires a runner-allocated loopback port. Run `npm run test:e2e` or a phase runner instead of invoking Playwright directly.");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./test/e2e",
  // Phase 1 shell/persona/scope journey only. Phases 2-8 have their own guarded configs and fixtures;
  // running the whole directory here would exercise those specs against Phase 1-only seed data.
  testMatch: "foundation.spec.ts",
  timeout: 30_000,
  use: { baseURL, trace: "on-first-retry" },
  webServer: {
    command: `node scripts/start-phase1-test-server.mjs --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
