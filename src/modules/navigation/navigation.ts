import { can } from "@/modules/authorization/authorization-service";
import type { ModuleKey } from "@/modules/authorization/capabilities";
import type { AuthenticatedActor } from "@/shared/types/foundation";

export type ModuleDefinition = { key: ModuleKey; href: string; label: string; purpose: string; phase: number; capability: `module:${ModuleKey}:view`; mobilePrimary?: boolean };

export const modules: Record<ModuleKey, ModuleDefinition> = {
  dashboard: { key: "dashboard", href: "/dashboard", label: "Dashboard", purpose: "Role- and scope-aware operational summaries over the current Published schedule, delivered in Phase 11.", phase: 11, capability: "module:dashboard:view", mobilePrimary: true },
  employees: { key: "employees", href: "/employees", label: "Employees & capabilities", purpose: "Employee records, directory, search, lifecycle, and self-service profile delivered in Phase 2.", phase: 2, capability: "module:employees:view", mobilePrimary: true },
  accounts: { key: "accounts", href: "/accounts", label: "Account administration", purpose: "Super Admin-only account, credential, and password-reset administration. Passwords are never viewable.", phase: 2, capability: "module:accounts:view" },
  skills: { key: "skills", href: "/skills", label: "Skills", purpose: "Controlled skills, Team-scoped planning filters, and transparent requirement warnings.", phase: 6, capability: "module:skills:view" },
  clients: { key: "clients", href: "/clients", label: "Clients", purpose: "Authorized Client records and operational relationships.", phase: 3, capability: "module:clients:view" },
  projects: { key: "projects", href: "/projects", label: "Projects", purpose: "Authorized Projects and their deliberately linked Locations.", phase: 3, capability: "module:projects:view" },
  locations: { key: "locations", href: "/locations", label: "Locations", purpose: "Authorized same-client operational sites; no map or live tracking.", phase: 3, capability: "module:locations:view" },
  schedule: { key: "schedule", href: "/schedule", label: "Schedule", purpose: "Monthly Draft, Proposed, Published scheduling and My Schedule.", phase: 4, capability: "module:schedule:view", mobilePrimary: true },
  map: { key: "map", href: "/map", label: "Planning map", purpose: "Published, selected-date static planning facts; never live tracking.", phase: 8, capability: "module:map:view" },
  leave: { key: "leave", href: "/leave", label: "Leave", purpose: "Annual leave requests, decisions, balances, and approved unavailability.", phase: 5, capability: "module:leave:view", mobilePrimary: true },
  coverage: { key: "coverage", href: "/coverage", label: "Coverage", purpose: "Explainable independent staffing and qualification gaps.", phase: 7, capability: "module:coverage:view" },
  replacements: { key: "replacements", href: "/replacements", label: "Replacements", purpose: "Super Admin-reviewed replacement requests with Draft-only effects.", phase: 7, capability: "module:replacements:view", mobilePrimary: true },
  notifications: { key: "notifications", href: "/notifications", label: "Notifications", purpose: "Your in-application notification centre, delivered in Phase 10. Read, unread, and archive states stay independent.", phase: 10, capability: "module:notifications:view" },
  reports: { key: "reports", href: "/reports", label: "Reports", purpose: "Authorized operational reports with bounded CSV exports, delivered in Phase 11.", phase: 11, capability: "module:reports:view" },
  audit: { key: "audit", href: "/audit", label: "Audit", purpose: "Super Admin-only read-only audit history, delivered in Phase 10. Filtering and safe per-action metadata only.", phase: 10, capability: "module:audit:view" },
  settings: { key: "settings", href: "/settings", label: "Settings", purpose: "Foundation configuration surfaces will be introduced only when confirmed.", phase: 1, capability: "module:settings:view" },
  profile: { key: "profile", href: "/profile", label: "My profile", purpose: "Your own work email, work phone, and professional summary, delivered in Phase 2.", phase: 2, capability: "module:profile:view", mobilePrimary: true },
  requests: { key: "requests", href: "/requests", label: "Requests & assignments", purpose: "The coverage and replacement requests you are named on, with participant-only discussion, delivered in Phase 10.", phase: 10, capability: "module:requests:view" },
};

export function moduleForPathSegment(segment: string) { return Object.values(modules).find((module) => module.key === segment) ?? null; }
export function navigationFor(actor: AuthenticatedActor) { return Object.values(modules).filter((module) => can(actor, module.capability)); }
