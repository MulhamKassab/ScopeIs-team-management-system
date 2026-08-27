import { describe, expect, it } from "vitest";
import { parseEnvironment } from "@/server/env";

describe("test database guard", () => {
  it("accepts a local test target", () => {
    expect(parseEnvironment({ DATABASE_URL: "postgresql://localhost:5432/scopeis_test", APP_ENV: "test", MOCK_AUTH_ENABLED: "true" }).DATABASE_URL).toContain("localhost");
  });
  it("rejects a non-local test target before a client can be constructed", () => {
    expect(() => parseEnvironment({ DATABASE_URL: "postgresql://database.example.com/scopeis", APP_ENV: "test", MOCK_AUTH_ENABLED: "true" })).toThrow("Test mode requires");
  });
  it("uses the explicit E2E marker rather than a local environment file's app mode", () => {
    const result = parseEnvironment({ DATABASE_URL: "postgresql://database.example.com/ignored", SCOPEIS_E2E_DATABASE_URL: "postgresql://localhost:5432/scopeis_test", APP_ENV: "production", MOCK_AUTH_ENABLED: "false", SCOPEIS_E2E_TEST: "true" });
    expect(result.APP_ENV).toBe("test"); expect(result.MOCK_AUTH_ENABLED).toBe("true");
  });
});
