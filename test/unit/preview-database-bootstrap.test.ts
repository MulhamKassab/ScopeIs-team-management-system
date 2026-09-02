import { describe, expect, it } from "vitest";
import {
  assertPreviewBootstrapEnvironment,
  EXPECTED_PREVIEW_NEON_PROJECT_ID,
  FORBIDDEN_PRODUCTION_NEON_PROJECT_ID,
} from "../../scripts/bootstrap-preview-database.mjs";

const validEnvironment: NodeJS.ProcessEnv = {
  SCOPEIS_PREVIEW_DATABASE_BOOTSTRAP: "true",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "preview",
  MOCK_AUTH_ENABLED: "true",
  NEON_PROJECT_ID: EXPECTED_PREVIEW_NEON_PROJECT_ID,
  DATABASE_URL: "postgresql://preview.example.test/scopeis_preview",
};

describe("Preview database bootstrap custody guard", () => {
  it("skips without the explicit one-time enable flag", () => {
    expect(assertPreviewBootstrapEnvironment({})).toBe(false);
  });

  it("accepts only the exact Vercel Preview branch context", () => {
    expect(assertPreviewBootstrapEnvironment(validEnvironment)).toBe(true);
    expect(() => assertPreviewBootstrapEnvironment({ ...validEnvironment, VERCEL_ENV: "production" })).toThrow("non-Preview");
    expect(() => assertPreviewBootstrapEnvironment({ ...validEnvironment, VERCEL_GIT_COMMIT_REF: "main" })).toThrow("preview Git branch");
    expect(() => assertPreviewBootstrapEnvironment({ ...validEnvironment, VERCEL: undefined })).toThrow("Vercel build");
  });

  it("requires the reviewed Preview project and explicitly refuses Production", () => {
    expect(() => assertPreviewBootstrapEnvironment({ ...validEnvironment, NEON_PROJECT_ID: FORBIDDEN_PRODUCTION_NEON_PROJECT_ID })).toThrow(
      "Production Neon project",
    );
    expect(() => assertPreviewBootstrapEnvironment({ ...validEnvironment, NEON_PROJECT_ID: "different-project" })).toThrow(
      "exact reviewed Preview Neon project",
    );
  });

  it("requires Preview database credentials and fictional authentication", () => {
    expect(() => assertPreviewBootstrapEnvironment({ ...validEnvironment, MOCK_AUTH_ENABLED: "false" })).toThrow("mock authentication");
    expect(() => assertPreviewBootstrapEnvironment({ ...validEnvironment, DATABASE_URL: undefined })).toThrow("DATABASE_URL");
    expect(() => assertPreviewBootstrapEnvironment({ ...validEnvironment, SCOPEIS_E2E_TEST: "true" })).toThrow("E2E");
  });
});
