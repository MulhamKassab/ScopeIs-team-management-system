import { describe, expect, it } from "vitest";
import { navigationFor, workspaceHomeFor } from "@/modules/navigation/navigation";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import { findWorkspaceFeatures } from "@/modules/navigation/workspace-guide";
const actor = (role: AuthenticatedActor["role"]): AuthenticatedActor => ({ id: role, displayName: role, role, sessionId: "s", sessionVersion: 1, scopes: [], authenticationMode: "mock" });
describe("role-aware navigation", () => { it("does not leak management modules to employees", () => { const labels = navigationFor(actor("EMPLOYEE")).map((item) => item.key); expect(labels).not.toContain("map"); expect(labels).not.toContain("audit"); }); it("includes global governance only for Super Admin", () => expect(navigationFor(actor("SUPER_ADMIN")).map((item) => item.key)).toContain("audit")); });

describe("company Employee workspace", () => {
  it("puts the four everyday destinations first and keeps updates secondary", () => {
    const navigation = navigationFor(actor("EMPLOYEE"));
    expect(navigation.slice(0, 4).map((item) => item.label)).toEqual(["Tickets", "Schedule", "Vacations", "My profile"]);
    expect(navigation.filter((item) => item.mobilePrimary).map((item) => item.href)).toEqual(["/tickets", "/schedule", "/leave", "/profile"]);
    expect(navigation.map((item) => item.key)).toEqual(["tickets", "schedule", "leave", "profile", "dashboard", "notifications", "requests"]);
  });

  it.each(["SUPER_ADMIN", "ADMIN"] as const)("preserves the %s primary destinations and familiar management labels", (role) => {
    const navigation = navigationFor(actor(role));
    expect(navigation.filter((item) => item.mobilePrimary).slice(0, 4).map((item) => item.key)).toEqual(["dashboard", "employees", "schedule", "leave"]);
    expect(navigation.find((item) => item.key === "schedule")?.label).toBe("Timetable");
    expect(navigation.find((item) => item.key === "leave")?.label).toBe("Leave");
    expect(navigation.find((item) => item.key === "tickets")?.href).toBe("/tickets");
  });

  it("chooses Tickets for Employee and Home for managers", () => {
    expect(workspaceHomeFor("EMPLOYEE")).toBe("/tickets");
    expect(workspaceHomeFor("ADMIN")).toBe("/dashboard");
    expect(workspaceHomeFor("SUPER_ADMIN")).toBe("/dashboard");
  });
});

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
    expect(findWorkspaceFeatures(navigation, "EMPLOYEE", "skills").map((feature) => feature.key)).toContain("profile");
    expect(findWorkspaceFeatures(navigation, "EMPLOYEE", "tasks").map((feature) => feature.key)).toContain("tickets");
  });
});
