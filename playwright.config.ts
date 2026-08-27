import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  webServer: {
    command: `env -u NODE_OPTIONS -u DATABASE_URL -u DATABASE_URL_UNPOOLED -u POSTGRES_URL -u POSTGRES_URL_NON_POOLING -u POSTGRES_URL_NO_SSL -u PGHOST -u PGHOST_UNPOOLED -u PGDATABASE -u PGUSER -u PGPASSWORD -u APP_ENV -u MOCK_AUTH_ENABLED -u SESSION_TTL_HOURS /bin/sh -c 'set -a; . .env.test; set +a; unset DATABASE_URL_UNPOOLED POSTGRES_URL POSTGRES_URL_NON_POOLING POSTGRES_URL_NO_SSL PGHOST PGHOST_UNPOOLED PGDATABASE PGUSER PGPASSWORD; SCOPEIS_E2E_DATABASE_URL="$DATABASE_URL" SCOPEIS_E2E_TEST=true NODE_OPTIONS= exec ./node_modules/.bin/next dev'`,
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
