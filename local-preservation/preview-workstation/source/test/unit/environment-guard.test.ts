import { describe, expect, it } from "vitest";
import { isMockAuthenticationEnabled, parseEnvironment } from "@/server/env";
import { assertDisposableName } from "../../scripts/disposable-test-database.mjs";
import { phase1TestProcessEnvironment } from "../../scripts/phase1-test-environment.mjs";

describe("temporary mock-auth environment policy", () => {
  const database = "postgresql://localhost:5432/scopeis_test";
  it("accepts a local test target", () => {
    expect(parseEnvironment({ DATABASE_URL: database, APP_ENV: "test", MOCK_AUTH_ENABLED: "true" }).DATABASE_URL).toContain("localhost");
  });
  it("rejects a non-local test target before a client can be constructed", () => {
    expect(() => parseEnvironment({ DATABASE_URL: "postgresql://database.example.com/scopeis", APP_ENV: "test", MOCK_AUTH_ENABLED: "true" })).toThrow("Test mode requires");
  });
  it("uses the explicit E2E marker rather than a local environment file's app mode", () => {
    const result = parseEnvironment({ DATABASE_URL: database, APP_ENV: "production", MOCK_AUTH_ENABLED: "false", SCOPEIS_E2E_TEST: "true" });
    expect(result.APP_ENV).toBe("test");
    expect(result.MOCK_AUTH_ENABLED).toBe("true");
  });
  it("requires canonical DATABASE_URL and explains Vercel environment scoping", () => {
    expect(() => parseEnvironment({ POSTGRES_URL: database, APP_ENV: "development", MOCK_AUTH_ENABLED: "false" })).toThrow(
      "connect the PostgreSQL resource to the deployment environment",
    );
  });
  it("rejects a non-PostgreSQL DATABASE_URL before client construction", () => {
    expect(() => parseEnvironment({ DATABASE_URL: "https://database.example.com", APP_ENV: "development", MOCK_AUTH_ENABLED: "false" })).toThrow("DATABASE_URL must use a PostgreSQL URL scheme");
  });
  it("allows explicitly enabled mock authentication in Production", () => {
    expect(isMockAuthenticationEnabled(parseEnvironment({ DATABASE_URL: database, APP_ENV: "production", MOCK_AUTH_ENABLED: "true" }))).toBe(true);
  });
  it("keeps Production mock authentication unavailable when disabled", () => {
    expect(isMockAuthenticationEnabled(parseEnvironment({ DATABASE_URL: database, APP_ENV: "production", MOCK_AUTH_ENABLED: "false" }))).toBe(false);
  });
  it("allows explicitly enabled mock authentication in development and test", () => {
    expect(isMockAuthenticationEnabled(parseEnvironment({ DATABASE_URL: database, APP_ENV: "development", MOCK_AUTH_ENABLED: "true" }))).toBe(true);
    expect(isMockAuthenticationEnabled(parseEnvironment({ DATABASE_URL: database, APP_ENV: "test", MOCK_AUTH_ENABLED: "true" }))).toBe(true);
  });
  it("keeps mock authentication unavailable in every environment when disabled", () => {
    expect(isMockAuthenticationEnabled(parseEnvironment({ DATABASE_URL: database, APP_ENV: "development", MOCK_AUTH_ENABLED: "false" }))).toBe(false);
    expect(isMockAuthenticationEnabled(parseEnvironment({ DATABASE_URL: database, APP_ENV: "test", MOCK_AUTH_ENABLED: "false" }))).toBe(false);
  });
  it("marks a child as disposable and gives its explicit database URL precedence without production provider variables", () => {
    const child = phase1TestProcessEnvironment({ databaseUrl: "postgresql://127.0.0.1:5432/scopeis_disposable_test", databaseName: "scopeis_disposable_test", sessionTtlHours: "1" });
    expect(child.DATABASE_URL).toContain("scopeis_disposable_test");
    expect(child.SCOPEIS_DISPOSABLE_TEST_DATABASE).toBe("true");
    expect(child.VERCEL_ENV).toBeUndefined();
  });
  it("refuses non-test, production-like, and unsafe disposable database names", () => {
    expect(() => assertDisposableName("scopeis_phase1_test_123")).not.toThrow();
    for (const name of ["scopeis_prod_test", "scopeis_live_test", "scopeis_database", "scopeis-test"]) expect(() => assertDisposableName(name)).toThrow();
  });
});
