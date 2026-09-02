import { can } from "@/modules/authorization/authorization-service";
import type { ModuleKey } from "@/modules/authorization/capabilities";
import type { AuthenticatedActor } from "@/shared/types/foundation";

export type NavigationGroup = "Overview" | "Workforce" | "Operations" | "Insights" | "Account";
export type ModuleDefinition = { key: ModuleKey; href: string; label: string; shortLabel?: string; group: NavigationGroup; purpose: string; phase: number; capability: `module:${ModuleKey}:view`; mobilePrimary?: boolean };

export const modules: Record<ModuleKey, ModuleDefinition> = {
  dashboard: { key: "dashboard", href: "/dashboard", label: "Dashboard", group: "Overview", purpose: "Your role-aware starting point for the working application.", phase: 1, capability: "module:dashboard:view", mobilePrimary: true },
  employees: { key: "employees", href: "/employees", label: "Employees", shortLabel: "Team", group: "Workforce", purpose: "The working Phase 2 employee directory and management journey.", phase: 2, capability: "module:employees:view", mobilePrimary: true },
  clients: { key: "clients", href: "/clients", label: "Clients", group: "Operations", purpose: "Client records are planned for Phase 3 and are not implemented in this preview.", phase: 3, capability: "module:clients:view" },
  projects: { key: "projects", href: "/projects", label: "Projects", group: "Operations", purpose: "Project relationships are planned for Phase 3 and are not implemented in this preview.", phase: 3, capability: "module:projects:view" },
  locations: { key: "locations", href: "/locations", label: "Locations", group: "Operations", purpose: "Operational locations are planned for Phase 3 and are not implemented in this preview.", phase: 3, capability: "module:locations:view" },
  schedule: { key: "schedule", href: "/schedule", label: "Schedule", group: "Operations", purpose: "Planning and published schedules are planned for Phase 4 and are not implemented in this preview.", phase: 4, capability: "module:schedule:view", mobilePrimary: true },
  map: { key: "map", href: "/map", label: "Planning map", shortLabel: "Map", group: "Operations", purpose: "The static planning map is planned for Phase 8 and is not implemented in this preview.", phase: 8, capability: "module:map:view" },
  leave: { key: "leave", href: "/leave", label: "Leave", group: "Operations", purpose: "Leave and availability are planned for Phase 5 and are not implemented in this preview.", phase: 5, capability: "module:leave:view", mobilePrimary: true },
  coverage: { key: "coverage", href: "/coverage", label: "Coverage", group: "Operations", purpose: "Coverage rules and visibility are planned for Phase 7 and are not implemented in this preview.", phase: 7, capability: "module:coverage:view" },
  replacements: { key: "replacements", href: "/replacements", label: "Replacements", group: "Operations", purpose: "Replacement requests are planned for Phase 7 and are not implemented in this preview.", phase: 7, capability: "module:replacements:view", mobilePrimary: true },
  notifications: { key: "notifications", href: "/notifications", label: "Notifications", group: "Insights", purpose: "The notification centre is planned for Phase 10 and is not implemented in this preview.", phase: 10, capability: "module:notifications:view" },
  reports: { key: "reports", href: "/reports", label: "Reports", group: "Insights", purpose: "Dashboards, reports, and exports are planned for Phase 11 and are not implemented in this preview.", phase: 11, capability: "module:reports:view" },
  audit: { key: "audit", href: "/audit", label: "Audit", group: "Insights", purpose: "The audit interface is planned for Phase 10. Existing server-side audit recording remains active.", phase: 10, capability: "module:audit:view" },
  settings: { key: "settings", href: "/settings", label: "Settings", group: "Account", purpose: "Configuration surfaces will be added only when their requirements are confirmed.", phase: 1, capability: "module:settings:view" },
  profile: { key: "profile", href: "/profile", label: "My profile", shortLabel: "Profile", group: "Account", purpose: "The working Phase 2 employee self-service profile.", phase: 2, capability: "module:profile:view", mobilePrimary: true },
  requests: { key: "requests", href: "/requests", label: "Requests & assignments", shortLabel: "Requests", group: "Operations", purpose: "Assignment and request workflows are reserved for later approved phases.", phase: 4, capability: "module:requests:view" },
};

export function moduleForPathSegment(segment: string) { return Object.values(modules).find((module) => module.key === segment) ?? null; }
export function navigationFor(actor: AuthenticatedActor) { return Object.values(modules).filter((module) => can(actor, module.capability)); }
