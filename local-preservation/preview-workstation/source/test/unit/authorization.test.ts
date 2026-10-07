import { describe, expect, it } from "vitest";
import { can, requireCapability } from "@/modules/authorization/authorization-service";
import { errors } from "@/shared/errors/app-error";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const adminA: AuthenticatedActor = { id: "a", displayName: "Ava", role: "ADMIN", sessionId: "session", sessionVersion: 1, scopes: [{ type: "TEAM", reference: "team:alpha" }], authenticationMode: "mock" };
const employee: AuthenticatedActor = { ...adminA, id: "e", role: "EMPLOYEE", scopes: [{ type: "TEAM", reference: "team:alpha" }] };
const superAdmin: AuthenticatedActor = { ...adminA, id: "s", role: "SUPER_ADMIN", scopes: [] };

describe("central authorization", () => {
  it("enforces Admin scope intersection", () => {
    expect(can(adminA, "foundation:scope_probe:view", { type: "TEAM", reference: "team:alpha" })).toBe(true);
    expect(can(adminA, "foundation:scope_probe:view", { type: "TEAM", reference: "team:bravo" })).toBe(false);
  });
  it("preserves employee and Super Admin boundaries", () => {
    expect(can(employee, "module:map:view")).toBe(false);
    expect(can(superAdmin, "module:audit:view")).toBe(true);
    expect(() => requireCapability(adminA, "module:audit:view")).toThrow(errors.forbidden().message);
  });
});
