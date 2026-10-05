import { describe, expect, it } from "vitest";
import { navigationFor } from "@/modules/navigation/navigation";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import { findWorkspaceFeatures } from "@/modules/navigation/workspace-guide";
const actor = (role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id: role, displayName: role, role, sessionId: "s", sessionVersion: 1, scopes: [], authenticationMode: "mock" });
describe("role-aware navigation", () => { it("does not leak management modules to employees", () => { const labels = navigationFor(actor("EMPLOYEE")).map((item) => item.key); expect(labels).not.toContain("map"); expect(labels).not.toContain("audit"); }); it("includes global governance only for Super Admin", () => expect(navigationFor(actor("SUPER_ADMIN")).map((item) => item.key)).toContain("audit")); });

describe("feature discovery boundaries", () => {
  it.each(["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] as const)("shows every delivered authorized feature for %s", (role) => {
    const navigation = navigationFor(actor(role));
    expect(findWorkspaceFeatures(navigation, role, "").map((feature) => feature.key)).toEqual(navigation.filter((feature) => feature.key !== "settings").map((feature) => feature.key));
  });
  it("finds nested capabilities without exposing a broader role's modules", () => {
    const navigation = navigationFor(actor("EMPLOYEE"));
    expect(findWorkspaceFeatures(navigation, "EMPLOYEE", "cv").map((feature) => feature.key)).toContain("profile");
    expect(findWorkspaceFeatures(navigation, "EMPLOYEE", "published schedule").map((feature) => feature.key)).toContain("schedule");
    expect(findWorkspaceFeatures(navigation, "EMPLOYEE", "map")).toEqual([]);
  });
});
