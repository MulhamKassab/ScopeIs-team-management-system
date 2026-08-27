import { describe, expect, it } from "vitest";
import { isMockAuthenticationEnabled, parseEnvironment } from "@/server/env";

describe("temporary mock-auth environment policy", () => {
  const database = "postgresql://localhost:5432/scopeis_test";
  it("accepts a local test target", () => {
    expect(parseEnvironment({ DATABASE_URL: database, APP_ENV: "test", MOCK_AUTH_ENABLED: "true" }).DATABASE_URL).toContain("localhost");
  });
  it("rejects a non-local test target before a client can be constructed", () => {
    expect(() => parseEnvironment({ DATABASE_URL: "postgresql://database.example.com/scopeis", APP_ENV: "test", MOCK_AUTH_ENABLED: "true" })).toThrow("Test mode requires");
  });
  it("uses the explicit E2E marker rather than a local environment file's app mode", () => {
    const result = parseEnvironment({ DATABASE_URL: "postgresql://database.example.com/ignored", SCOPEIS_E2E_DATABASE_URL: database, APP_ENV: "production", MOCK_AUTH_ENABLED: "false", SCOPEIS_E2E_TEST: "true" });
    expect(result.APP_ENV).toBe("test");
    expect(result.MOCK_AUTH_ENABLED).toBe("true");
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
});
