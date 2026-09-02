import type { SystemRole } from "@/shared/types/foundation";

export const moduleKeys = ["dashboard", "employees", "clients", "projects", "locations", "schedule", "map", "leave", "coverage", "replacements", "notifications", "reports", "audit", "settings", "profile", "requests"] as const;
export type ModuleKey = (typeof moduleKeys)[number];
export type Capability = `module:${ModuleKey}:view` | "foundation:scope_probe:view";

const roleCapabilities: Record<SystemRole, readonly Capability[]> = {
  SUPER_ADMIN: moduleKeys.map((module) => `module:${module}:view` as Capability).concat("foundation:scope_probe:view"),
  ADMIN: ["dashboard", "employees", "clients", "projects", "locations", "schedule", "map", "leave", "coverage", "replacements", "notifications", "profile"].map((module) => `module:${module}:view` as Capability).concat("foundation:scope_probe:view"),
  EMPLOYEE: ["dashboard", "schedule", "leave", "profile", "notifications", "requests"].map((module) => `module:${module}:view` as Capability),
};

export function hasRoleCapability(role: SystemRole, capability: Capability) {
  return roleCapabilities[role].includes(capability);
}
