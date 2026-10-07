import { describe, expect, it } from "vitest";
import { navigationFor } from "@/modules/navigation/navigation";
import type { AuthenticatedActor } from "@/shared/types/foundation";
const actor = (role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id: role, displayName: role, role, sessionId: "s", sessionVersion: 1, scopes: [], authenticationMode: "mock" });
describe("role-aware navigation", () => { it("does not leak management modules to employees", () => { const labels = navigationFor(actor("EMPLOYEE")).map((item) => item.key); expect(labels).not.toContain("map"); expect(labels).not.toContain("audit"); }); it("includes global governance only for Super Admin", () => expect(navigationFor(actor("SUPER_ADMIN")).map((item) => item.key)).toContain("audit")); });
