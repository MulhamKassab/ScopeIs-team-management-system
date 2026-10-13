import { describe, expect, it } from "vitest";
import { isMockAuthenticationEnabled, parseEnvironment } from "@/server/env";
import { assertDisposableName } from "../../scripts/disposable-test-database.mjs";
import { phase1TestProcessEnvironment } from "../../scripts/phase1-test-environment.mjs";
import { withOwnedBrowserBuild } from "../../scripts/owned-browser-build.mjs";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

describe("temporary mock-auth environment policy", () => {
  const database = "postgresql://localhost:5432/scopeis_test";
  it("labels only explicitly configured demo workspaces", () => {
    expect(parseEnvironment({ DATABASE_URL: database }).SCOPEIS_DEMO_WORKSPACE).toBe("false");
    expect(parseEnvironment({ DATABASE_URL: database, SCOPEIS_DEMO_WORKSPACE: "true" }).SCOPEIS_DEMO_WORKSPACE).toBe("true");
  });
  it("accepts a local test target", () => {
    expect(parseEnvironment({ DATABASE_URL: database, APP_ENV: "test", MOCK_AUTH_ENABLED: "true" }).DATABASE_URL).toContain("localhost");
  });
  it("rejects a non-local test target before a client can be constructed", () => {
    expect(() => parseEnvironment({ DATABASE_URL: "postgresql://database.example.com/scopeis", APP_ENV: "test", MOCK_AUTH_ENABLED: "true" })).toThrow("Test mode requires");
  });
  it("uses the explicit E2E marker rather than a local environment file's app mode", () => {
    const result = parseEnvironment({ DATABASE_URL: database, APP_ENV: "production", MOCK_AUTH_ENABLED: "true", SCOPEIS_E2E_TEST: "true", SCOPEIS_DISPOSABLE_TEST_DATABASE: "true" });
    expect(result.APP_ENV).toBe("test");
    expect(result.MOCK_AUTH_ENABLED).toBe("true");
  });
  it("requires DATABASE_URL without selecting a compatibility fallback", () => {
    expect(() => parseEnvironment({ POSTGRES_URL: database, APP_ENV: "development", MOCK_AUTH_ENABLED: "false" })).toThrow();
  });
  it("rejects a non-PostgreSQL DATABASE_URL before client construction", () => {
    expect(() => parseEnvironment({ DATABASE_URL: "https://database.example.com", APP_ENV: "development", MOCK_AUTH_ENABLED: "false" })).toThrow("DATABASE_URL must use a PostgreSQL URL scheme");
  });
  it("rejects explicitly enabled mock authentication in Production", () => {
    expect(isMockAuthenticationEnabled(parseEnvironment({ DATABASE_URL: database, APP_ENV: "production", MOCK_AUTH_ENABLED: "true" }))).toBe(false);
    expect(isMockAuthenticationEnabled(parseEnvironment({ DATABASE_URL: database, APP_ENV: "test", VERCEL_ENV: "production", MOCK_AUTH_ENABLED: "true", SCOPEIS_E2E_TEST: "true", SCOPEIS_DISPOSABLE_TEST_DATABASE: "true" }))).toBe(false);
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

describe("owned browser build cleanup", () => {
  it("removes a successful build checkout while preserving an unrelated sibling", async () => {
    const sibling = await mkdtemp(join(tmpdir(), "scopeis-phase2-safe-build-unit-sibling-"));
    const siblingSentinel = join(sibling, "keep.txt");
    let owned = "";
    try {
      await writeFile(siblingSentinel, "unrelated fictional sentinel");
      const result = await withOwnedBrowserBuild(async ({ directory, env }: { directory: string; env: Record<string, string> }) => {
        owned = directory;
        expect(dirname(directory)).toBe(resolve(tmpdir()));
        expect(basename(directory)).toMatch(/^scopeis-phase2-safe-build-/);
        expect(env).toEqual({ SCOPEIS_SAFE_BUILD_DIRECTORY: directory });
        await writeFile(join(directory, "build-output.txt"), "fictional build output");
        return "completed";
      });
      expect(result).toBe("completed");
      await expect(access(owned)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readFile(siblingSentinel, "utf8")).toBe("unrelated fictional sentinel");
    } finally {
      expect(dirname(resolve(sibling))).toBe(resolve(tmpdir()));
      expect(basename(sibling)).toMatch(/^scopeis-phase2-safe-build-unit-sibling-/);
      await rm(sibling, { recursive: true, force: true });
    }
  });
  it("cleans a failed Phase 1 checkout and preserves the callback error and unrelated sibling", async () => {
    const sibling = await mkdtemp(join(tmpdir(), "scopeis-phase1-server-unit-sibling-"));
    const siblingSentinel = join(sibling, "keep.txt");
    const failure = new Error("fictional browser failure");
    let owned = "";
    try {
      await writeFile(siblingSentinel, "unrelated fictional sentinel");
      await expect(withOwnedBrowserBuild(async ({ directory, env }: { directory: string; env: Record<string, string> }) => {
        owned = directory;
        expect(dirname(directory)).toBe(resolve(tmpdir()));
        expect(basename(directory)).toMatch(/^scopeis-phase1-server-/);
        expect(env).toEqual({ SCOPEIS_PHASE1_SERVER_DIRECTORY: directory });
        await writeFile(join(directory, "partial-build.txt"), "fictional partial output");
        throw failure;
      }, { phase1: true })).rejects.toBe(failure);
      await expect(access(owned)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readFile(siblingSentinel, "utf8")).toBe("unrelated fictional sentinel");
    } finally {
      expect(dirname(resolve(sibling))).toBe(resolve(tmpdir()));
      expect(basename(sibling)).toMatch(/^scopeis-phase1-server-unit-sibling-/);
      await rm(sibling, { recursive: true, force: true });
    }
  });
});
