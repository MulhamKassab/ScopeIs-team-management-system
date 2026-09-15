import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    // Tooling and build output.
    ".next/**",
    "node_modules/**",
    "playwright-report/**",
    "test-results/**",
    // Historical root prototype (prototype/full-frontend-r1). It is preserved reference work for the
    // pre-journey UI, not maintained application source, so it is deliberately outside the
    // authoritative application lint boundary. It must not be deleted, edited, formatted, or migrated.
    // Everything else -- src, test, scripts, and repository configuration -- stays linted.
    "prototype/**",
  ]),
]);
