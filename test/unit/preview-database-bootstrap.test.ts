import { describe, expect, it } from "vitest";
import {
  assertPreviewBootstrapEnvironment,
  EXPECTED_PREVIEW_NEON_PROJECT_ID,
  FORBIDDEN_PRODUCTION_NEON_PROJECT_ID,
  isPortableCurrentPreviewMigrationState,
} from "../../scripts/bootstrap-preview-database.mjs";
import { loadAdoptionManifest } from "../../scripts/phase2-migration-core.mjs";

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

  it("accepts Neon formatting variance only with the exact final ledger, tables, and enums", async () => {
    const manifest = await loadAdoptionManifest();
    const expected = manifest.states.phase2EmployeeCode;
    const state = {
      ledger: {
        valid: true,
        rows: manifest.migrations.map((migration: { hash: string; when: number }) => ({
          hash: migration.hash,
          created_at: String(migration.when),
        })),
      },
      fingerprint: {
        tables: expected.tables,
        enumTypes: expected.enumTypes,
        sectionHashes: { enums: expected.sectionHashes.enums },
      },
    };
    expect(await isPortableCurrentPreviewMigrationState(state)).toBe(true);
    expect(await isPortableCurrentPreviewMigrationState({
      ...state,
      fingerprint: { ...state.fingerprint, tables: state.fingerprint.tables.slice(1) },
    })).toBe(false);
    expect(await isPortableCurrentPreviewMigrationState({
      ...state,
      ledger: { ...state.ledger, rows: state.ledger.rows.slice(1) },
    })).toBe(false);
  });
});
