import { can } from "@/modules/authorization/authorization-service";
import type { ModuleKey } from "@/modules/authorization/capabilities";
import type { AuthenticatedActor } from "@/shared/types/foundation";

export type ModuleDefinition = { key: ModuleKey; href: string; label: string; purpose: string; phase: number; capability: `module:${ModuleKey}:view`; mobilePrimary?: boolean };

export const modules: Record<ModuleKey, ModuleDefinition> = {
  dashboard: { key: "dashboard", href: "/dashboard", label: "Dashboard", purpose: "A role-aware starting point for the Team Management System.", phase: 1, capability: "module:dashboard:view", mobilePrimary: true },
  employees: { key: "employees", href: "/employees", label: "Employees & capabilities", purpose: "Employee and capability management will be introduced in Phase 2.", phase: 2, capability: "module:employees:view", mobilePrimary: true },
  clients: { key: "clients", href: "/clients", label: "Clients", purpose: "Authorized Client records and operational relationships.", phase: 3, capability: "module:clients:view" },
  projects: { key: "projects", href: "/projects", label: "Projects", purpose: "Authorized Projects and their deliberately linked Locations.", phase: 3, capability: "module:projects:view" },
  locations: { key: "locations", href: "/locations", label: "Locations", purpose: "Authorized same-client operational sites; no map or live tracking.", phase: 3, capability: "module:locations:view" },
  schedule: { key: "schedule", href: "/schedule", label: "Schedule", purpose: "Planning and published schedules will be introduced in Phase 4.", phase: 4, capability: "module:schedule:view", mobilePrimary: true },
  map: { key: "map", href: "/map", label: "Planning map", purpose: "The static planning map will be introduced in Phase 5.", phase: 5, capability: "module:map:view" },
  leave: { key: "leave", href: "/leave", label: "Leave", purpose: "Leave requests and decisions will be introduced in Phase 6.", phase: 6, capability: "module:leave:view", mobilePrimary: true },
  coverage: { key: "coverage", href: "/coverage", label: "Coverage", purpose: "Coverage rules and visibility will be introduced in Phase 7.", phase: 7, capability: "module:coverage:view" },
  replacements: { key: "replacements", href: "/replacements", label: "Replacements", purpose: "Replacement requests will be introduced in Phase 7.", phase: 7, capability: "module:replacements:view", mobilePrimary: true },
  notifications: { key: "notifications", href: "/notifications", label: "Notifications", purpose: "A full notification centre will be introduced in Phase 8.", phase: 8, capability: "module:notifications:view" },
  reports: { key: "reports", href: "/reports", label: "Reports", purpose: "Reports and exports will be introduced in Phase 8.", phase: 8, capability: "module:reports:view" },
  audit: { key: "audit", href: "/audit", label: "Audit", purpose: "The audit viewer will be introduced in Phase 8. The audit foundation already records selected Phase 1 actions.", phase: 8, capability: "module:audit:view" },
  settings: { key: "settings", href: "/settings", label: "Settings", purpose: "Foundation configuration surfaces will be introduced only when confirmed.", phase: 1, capability: "module:settings:view" },
  profile: { key: "profile", href: "/profile", label: "My profile", purpose: "Profile and capability management will be introduced in Phase 2.", phase: 2, capability: "module:profile:view", mobilePrimary: true },
  requests: { key: "requests", href: "/requests", label: "Requests & assignments", purpose: "Assignment and request workflows will be introduced in later approved phases.", phase: 4, capability: "module:requests:view" },
};

export function moduleForPathSegment(segment: string) { return Object.values(modules).find((module) => module.key === segment) ?? null; }
export function navigationFor(actor: AuthenticatedActor) { return Object.values(modules).filter((module) => can(actor, module.capability)); }
