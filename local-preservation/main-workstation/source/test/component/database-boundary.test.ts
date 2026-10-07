import { describe, expect, it } from "vitest";

// Regression guard for the component suite's database boundary.
// Component tests must stay genuine UI tests: no PostgreSQL, no `.env.production`, no real database
// client import. Phase 6 briefly pulled `@/db/client` (and therefore environment validation) into the
// scheduling forms graph, which broke this suite. These assertions keep that boundary explicit.
describe("component suite database boundary", () => {
  it("runs with no database or production environment configured", () => {
    expect(process.env.DATABASE_URL).toBeUndefined();
    expect(process.env.DATABASE_URL_UNPOOLED).toBeUndefined();
    expect(process.env.SCOPEIS_E2E_TEST).toBeUndefined();
    expect(process.env.APP_ENV).not.toBe("production");
    expect(process.env.NODE_ENV).not.toBe("production");
  });

  it("fails loudly instead of silently reaching PostgreSQL", async () => {
    await expect(import("@/db/client")).rejects.toThrow();
  });
});
