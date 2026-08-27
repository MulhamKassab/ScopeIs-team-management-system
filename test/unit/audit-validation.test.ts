import { describe, expect, it } from "vitest";
import { sanitizeAuditMetadata } from "@/modules/audit/audit-service";
import { directionSchema, mockPersonaSelectionSchema, themeSchema } from "@/shared/validation/foundation";

describe("foundation boundary validation", () => {
  it("removes sensitive audit metadata", () => expect(sanitizeAuditMetadata({ token: "no", cookie: "no", label: "safe", coordinates: "no" })).toEqual({ label: "safe" }));
  it("validates only approved inputs", () => {
    expect(mockPersonaSelectionSchema.safeParse({ personaId: "mock-admin-ava" }).success).toBe(true);
    expect(mockPersonaSelectionSchema.safeParse({ personaId: "" }).success).toBe(false);
    expect(themeSchema.safeParse("dark").success).toBe(true);
    expect(themeSchema.safeParse("orange").success).toBe(false);
    expect(directionSchema.safeParse("rtl").success).toBe(true);
  });
});
