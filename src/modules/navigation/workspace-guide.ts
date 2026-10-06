import type { ModuleDefinition } from "@/modules/navigation/navigation";
import type { ModuleKey } from "@/modules/authorization/capabilities";
import type { SystemRole } from "@/shared/types/foundation";

export const navigationGroups: { label: string; keys: ModuleKey[] }[] = [
  { label: "Daily work", keys: ["dashboard", "schedule", "leave", "coverage", "replacements", "requests", "map"] },
  { label: "People", keys: ["employees", "teams", "designations", "skills", "profile"] },
  { label: "Client work", keys: ["clients", "projects", "locations"] },
  { label: "Overview", keys: ["reports", "notifications"] },
  { label: "Administration", keys: ["accounts", "audit", "settings"] },
];

const descriptions: Record<ModuleKey, { description: string; keywords: string }> = {
  dashboard: { description: "See your work, updates and what needs attention.", keywords: "home overview summary metrics" },
  schedule: { description: "Plan assignments, review revisions and follow the published schedule.", keywords: "calendar roster shifts draft propose publish revision allocation monthly" },
  map: { description: "Explore published assignments by date, employee and worksite. Open coverage from the map.", keywords: "geography pins locations planning coordinates areas" },
  employees: { description: "Find your team and manage employee records, skills, designations and evidence.", keywords: "people directory search team qualifications certification cv portfolio files notes lifecycle status" },
  teams: { description: "Create teams and add, move or remove members.", keywords: "groups membership organization" },
  designations: { description: "Manage job designations and assign people to them.", keywords: "jobs titles designation members" },
  accounts: { description: "Manage accounts, access and temporary passwords. Existing passwords stay private.", keywords: "credentials reset username login role active deactivate scopes" },
  skills: { description: "Maintain recorded skills and understand project requirements.", keywords: "capability qualification training designation requirements staffing" },
  clients: { description: "Manage client relationships, contacts and shared notes.", keywords: "company customer contact notes documents" },
  projects: { description: "Organize client work, linked locations and staffing requirements.", keywords: "jobs operations requirements skills staffing contacts notes" },
  locations: { description: "Manage worksites, project links and staffing requirements.", keywords: "sites addresses coordinates contacts notes staffing geography" },
  leave: { description: "Request leave, follow its status and check annual balances.", keywords: "holiday vacation absence unavailable approve reject annual balance days" },
  coverage: { description: "Review staffing and skill gaps for an assignment, then request support.", keywords: "shortage requirements qualification candidates replacement support" },
  replacements: { description: "Follow replacement requests, compare candidates and review decisions.", keywords: "support staffing swap coverage candidate ranking approve reject draft" },
  requests: { description: "Open the requests you participate in and continue the discussion.", keywords: "assignments discussion messages comments participants conversation" },
  notifications: { description: "Read your latest updates and manage read, unread and archived messages.", keywords: "alerts inbox notifications archive status" },
  reports: { description: "Understand allocation, leave, skills and evidence. Download available reports as CSV.", keywords: "insights analytics hours balances gaps certifications export csv evidence audit history" },
  audit: { description: "Trace recorded actions, changes and decisions across the workspace.", keywords: "history log governance security events filter" },
  settings: { description: "Workspace configuration is coming soon.", keywords: "configuration preferences" },
  profile: { description: "Update work details and your summary. Add certifications, portfolio evidence and your CV.", keywords: "self professional email phone summary password change certification portfolio cv upload documents files evidence" },
};

export function featureDescription(key: ModuleKey, role: SystemRole) {
  if (role === "EMPLOYEE" && key === "schedule") return "See your published assignments, times, worksites and shared instructions.";
  if (role === "EMPLOYEE" && key === "employees") return "View your own employee record and recorded capabilities.";
  if (role === "EMPLOYEE" && key === "skills") return "See your recorded skills and professional capabilities.";
  if (role === "ADMIN" && key === "skills") return "Review your team’s recorded skills and project requirements.";
  if (role === "ADMIN" && key === "employees") return "Find your team and review employee records, skills and supporting evidence.";
  if (role === "SUPER_ADMIN" && key === "leave") return "Review leave requests, record decisions and check annual balances.";
  if (role === "ADMIN" && key === "leave") return "Request your own leave and check approved unavailability within your team scope.";
  if (role === "ADMIN" && key === "replacements") return "Request coverage support and follow decisions on your replacement requests.";
  if (role === "ADMIN" && key === "schedule") return "Prepare scoped Draft schedules and propose them for publication.";
  return descriptions[key].description;
}

/** Discovery uses the server-provided navigation, never a broader client-side permission guess. */
export function findWorkspaceFeatures(navigation: ModuleDefinition[], role: SystemRole, query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return navigation.filter((item) => item.key !== "settings").filter((item) => {
    const text = `${item.label} ${featureDescription(item.key, role)} ${descriptions[item.key].keywords}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
