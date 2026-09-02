import type { PreviewPersona, PreviewRole } from "@/preview/preview-data";

export type PreviewRoute = { href: string; label: string; roles: PreviewRole[]; fixtureSurface: string };

const everyone: PreviewRole[] = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"];
const managers: PreviewRole[] = ["SUPER_ADMIN", "ADMIN"];

export const previewRoutes: PreviewRoute[] = [
  { href: "/dashboard", label: "Dashboard", roles: everyone, fixtureSurface: "dashboard counts and planning" },
  { href: "/profile", label: "My profile", roles: everyone, fixtureSurface: "self profile" },
  { href: "/employees", label: "Employees & capabilities", roles: managers, fixtureSurface: "scoped employee records" },
  { href: "/skills", label: "Skills", roles: managers, fixtureSurface: "scoped capabilities" },
  { href: "/clients", label: "Clients", roles: managers, fixtureSurface: "scoped client records" },
  { href: "/projects", label: "Projects", roles: managers, fixtureSurface: "scoped project records" },
  { href: "/locations", label: "Locations", roles: managers, fixtureSurface: "scoped operational locations" },
  { href: "/schedule", label: "Schedule", roles: everyone, fixtureSurface: "role-filtered assignments" },
  { href: "/leave", label: "Leave", roles: everyone, fixtureSurface: "privacy-filtered leave" },
  { href: "/coverage", label: "Coverage", roles: managers, fixtureSurface: "scoped coverage gaps" },
  { href: "/replacements", label: "Replacements", roles: managers, fixtureSurface: "scoped replacement requests" },
  { href: "/map", label: "Planning map", roles: managers, fixtureSurface: "published fixture map" },
  { href: "/evidence", label: "Certifications & evidence", roles: everyone, fixtureSurface: "fictional evidence metadata" },
  { href: "/requests", label: "Requests & assignments", roles: managers, fixtureSurface: "project staffing fixtures" },
  { href: "/notes", label: "Shared notes", roles: everyone, fixtureSurface: "shared scoped notes" },
  { href: "/management-notes", label: "Management notes", roles: managers, fixtureSurface: "authorized management notes" },
  { href: "/discussions", label: "Private discussions", roles: everyone, fixtureSurface: "participant-only discussions" },
  { href: "/notifications", label: "Notifications", roles: everyone, fixtureSurface: "personal notifications" },
  { href: "/reports", label: "Reports", roles: ["SUPER_ADMIN"], fixtureSurface: "global fixture totals" },
  { href: "/audit", label: "Audit", roles: ["SUPER_ADMIN"], fixtureSurface: "fictional audit history" },
  { href: "/settings", label: "Settings", roles: ["SUPER_ADMIN"], fixtureSurface: "demo configuration" },
  { href: "/tickets", label: "Ticket System", roles: everyone, fixtureSurface: "deferred presentation" },
];

export function visiblePreviewRoutes(persona: PreviewPersona) { return previewRoutes.filter((route) => route.roles.includes(persona.role)); }
