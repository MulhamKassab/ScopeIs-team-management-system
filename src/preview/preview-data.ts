export type PreviewRole = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
export type Team = "alpha" | "bravo";

export type PreviewPersona = {
  id: "nora" | "ava" | "ben" | "cora" | "dan";
  employeeId: string;
  name: string;
  role: PreviewRole;
  team?: Team;
  summary: string;
};

export type PreviewEmployee = {
  id: string;
  name: string;
  initials: string;
  team: Team;
  designation: string;
  managerId?: string;
  skills: string[];
  workingPattern: string;
  availability: "Available" | "Assigned" | "On leave" | "On call";
  email: string;
  phone: string;
  summary: string;
  certification: string;
  certificationExpires?: string;
};

export const previewConfig = {
  label: "Frontend demonstration · fictional data · no persistence",
  date: "18 September 2026",
  period: "September 2026",
  isPersistent: false,
} as const;

export const personas: PreviewPersona[] = [
  { id: "nora", employeeId: "emp-nora", name: "Nora Albright", role: "SUPER_ADMIN", summary: "Super Admin · global Preview access" },
  { id: "ava", employeeId: "emp-ava", name: "Ava Mercer", role: "ADMIN", team: "alpha", summary: "Admin · Team Alpha scope" },
  { id: "ben", employeeId: "emp-ben", name: "Ben Iqbal", role: "ADMIN", team: "bravo", summary: "Admin · Team Bravo scope" },
  { id: "cora", employeeId: "emp-cora", name: "Cora Bell", role: "EMPLOYEE", team: "alpha", summary: "Employee · Team Alpha" },
  { id: "dan", employeeId: "emp-dan", name: "Dan Rowan", role: "EMPLOYEE", team: "bravo", summary: "Employee · Team Bravo" },
];

export const employees: PreviewEmployee[] = [
  { id: "emp-nora", name: "Nora Albright", initials: "NA", team: "alpha", designation: "Super Admin", skills: ["Documentation", "Client coordination"], workingPattern: "Hybrid leadership · Sun–Thu", availability: "Available", email: "nora.albright@example.test", phone: "+971 50 000 0101", summary: "Leads fictional workforce governance and publication review.", certification: "Operational governance" },
  { id: "emp-ava", name: "Ava Mercer", initials: "AM", team: "alpha", designation: "Account Manager", managerId: "emp-nora", skills: ["Client coordination", "Documentation", "Site survey"], workingPattern: "Business Bay · Sun–Thu", availability: "Assigned", email: "ava.mercer@example.test", phone: "+971 50 000 0102", summary: "Owns Team Alpha client coordination and delivery readiness.", certification: "Client engagement" },
  { id: "emp-ben", name: "Ben Iqbal", initials: "BI", team: "bravo", designation: "Account Manager", managerId: "emp-nora", skills: ["Client coordination", "Documentation", "Site survey"], workingPattern: "Abu Dhabi branch · Sun–Thu", availability: "Assigned", email: "ben.iqbal@example.test", phone: "+971 50 000 0103", summary: "Owns Team Bravo client coordination and delivery readiness.", certification: "Client engagement" },
  { id: "emp-cora", name: "Cora Bell", initials: "CB", team: "alpha", designation: "Senior Network Engineer", managerId: "emp-ava", skills: ["Network design", "Routing and switching", "Wi-Fi", "Documentation"], workingPattern: "Hybrid field rotation", availability: "Assigned", email: "cora.bell@example.test", phone: "+971 50 000 0104", summary: "Leads network design for fictional healthcare and retail programmes.", certification: "Network architecture", certificationExpires: "2026-10-14" },
  { id: "emp-dan", name: "Dan Rowan", initials: "DR", team: "bravo", designation: "Network Engineer", managerId: "emp-ben", skills: ["Routing and switching", "Wi-Fi", "Fiber"], workingPattern: "Jebel Ali field rotation", availability: "On call", email: "dan.rowan@example.test", phone: "+971 50 000 0105", summary: "Delivers resilient connectivity and warehouse network support.", certification: "Network operations" },
  { id: "emp-elias", name: "Elias Noor", initials: "EN", team: "alpha", designation: "CCTV/Security Systems Engineer", managerId: "emp-ava", skills: ["CCTV", "Access control", "Site survey"], workingPattern: "Dubai sites · Sun–Thu", availability: "Assigned", email: "elias.noor@example.test", phone: "+971 50 000 0106", summary: "Designs and commissions fictional security systems.", certification: "Security systems" },
  { id: "emp-farah", name: "Farah Voss", initials: "FV", team: "bravo", designation: "Access Control Technician", managerId: "emp-ben", skills: ["Access control", "CCTV", "Documentation"], workingPattern: "Sharjah service centre", availability: "Available", email: "farah.voss@example.test", phone: "+971 50 000 0107", summary: "Maintains access-control configurations and site records.", certification: "Access platform technician" },
  { id: "emp-gabriel", name: "Gabriel Tan", initials: "GT", team: "alpha", designation: "Structured Cabling Technician", managerId: "emp-ava", skills: ["Structured cabling", "Fiber", "Site survey"], workingPattern: "Al Quoz workshop rotation", availability: "Assigned", email: "gabriel.tan@example.test", phone: "+971 50 000 0108", summary: "Coordinates structured-cabling installation quality.", certification: "Structured cabling" },
  { id: "emp-hana", name: "Hana Ortiz", initials: "HO", team: "bravo", designation: "Precision Cooling/HVAC Engineer", managerId: "emp-ben", skills: ["Precision cooling/HVAC", "Documentation", "Site survey"], workingPattern: "Abu Dhabi field rotation", availability: "Assigned", email: "hana.ortiz@example.test", phone: "+971 50 000 0109", summary: "Supports precision-cooling resilience for critical facilities.", certification: "Cooling systems" },
  { id: "emp-isla", name: "Isla Vale", initials: "IV", team: "alpha", designation: "Software Developer", managerId: "emp-ava", skills: ["Software development", "Database support", "Documentation"], workingPattern: "Business Bay · hybrid", availability: "Assigned", email: "isla.vale@example.test", phone: "+971 50 000 0110", summary: "Builds fictional integration tooling and delivery automation.", certification: "Secure software practice" },
  { id: "emp-jamal", name: "Jamal Reed", initials: "JR", team: "bravo", designation: "Cloud/DevOps Engineer", managerId: "emp-ben", skills: ["Cloud/DevOps", "Database support", "Software development"], workingPattern: "Remote/on-site rotation", availability: "Available", email: "jamal.reed@example.test", phone: "+971 50 000 0111", summary: "Operates fictional cloud environments and deployment paths.", certification: "Cloud operations" },
  { id: "emp-kai", name: "Kai Morgan", initials: "KM", team: "alpha", designation: "Help Desk Engineer", managerId: "emp-ava", skills: ["Help desk", "Documentation", "Client coordination"], workingPattern: "Business Bay service desk", availability: "Available", email: "kai.morgan@example.test", phone: "+971 50 000 0112", summary: "Provides service-desk triage and client handovers.", certification: "Service desk foundations" },
  { id: "emp-lina", name: "Lina Hayes", initials: "LH", team: "bravo", designation: "Field Technician", managerId: "emp-ben", skills: ["CCTV", "Structured cabling", "Access control"], workingPattern: "Sharjah field rotation", availability: "On leave", email: "lina.hayes@example.test", phone: "+971 50 000 0113", summary: "Provides cross-discipline field support across Team Bravo.", certification: "Field safety" },
  { id: "emp-malik", name: "Malik Chen", initials: "MC", team: "alpha", designation: "Project Coordinator", managerId: "emp-ava", skills: ["Documentation", "Client coordination", "Site survey"], workingPattern: "Business Bay · Sun–Thu", availability: "Assigned", email: "malik.chen@example.test", phone: "+971 50 000 0114", summary: "Coordinates project milestones, access and reporting.", certification: "Project coordination" },
  { id: "emp-nadia", name: "Nadia Price", initials: "NP", team: "bravo", designation: "Software Developer", managerId: "emp-ben", skills: ["Software development", "Database support", "Cloud/DevOps"], workingPattern: "Abu Dhabi · hybrid", availability: "Assigned", email: "nadia.price@example.test", phone: "+971 50 000 0115", summary: "Delivers fictional application integrations and reporting.", certification: "Secure software practice", certificationExpires: "2026-10-03" },
  { id: "emp-omar", name: "Omar Sloan", initials: "OS", team: "alpha", designation: "Network Engineer", managerId: "emp-ava", skills: ["Network design", "Routing and switching", "Fiber"], workingPattern: "Dubai Investment Park rotation", availability: "Available", email: "omar.sloan@example.test", phone: "+971 50 000 0116", summary: "Supports network implementation and fiber handover.", certification: "Network operations" },
  { id: "emp-priya", name: "Priya Wells", initials: "PW", team: "bravo", designation: "CCTV/Security Systems Engineer", managerId: "emp-ben", skills: ["CCTV", "Access control", "Documentation"], workingPattern: "Jebel Ali operations site", availability: "Assigned", email: "priya.wells@example.test", phone: "+971 50 000 0117", summary: "Leads security-system readiness for logistics sites.", certification: "Security systems" },
  { id: "emp-rory", name: "Rory Blake", initials: "RB", team: "alpha", designation: "Precision Cooling/HVAC Engineer", managerId: "emp-ava", skills: ["Precision cooling/HVAC", "Site survey", "Documentation"], workingPattern: "Dubai field rotation", availability: "Available", email: "rory.blake@example.test", phone: "+971 50 000 0118", summary: "Provides critical-environment cooling coverage.", certification: "Cooling systems" },
];

export const clients = [
  { id: "client-northstar", name: "Northstar Medical Group", team: "alpha" as Team, contact: "Mira Sutton", location: "Business Bay office", projects: 2, status: "Active" },
  { id: "client-horizon", name: "Horizon Retail Holdings", team: "alpha" as Team, contact: "Theo Lynn", location: "Al Quoz workshop", projects: 1, status: "Active" },
  { id: "client-marina", name: "Marina Heights Residences", team: "bravo" as Team, contact: "Elena Park", location: "Dubai Investment Park warehouse", projects: 1, status: "Active" },
  { id: "client-vertex", name: "Vertex Logistics", team: "bravo" as Team, contact: "Ira Fields", location: "Jebel Ali operations site", projects: 2, status: "At risk" },
  { id: "client-crestline", name: "Crestline Schools", team: "alpha" as Team, contact: "Samira Cole", location: "Sharjah service centre", projects: 1, status: "Active" },
  { id: "client-cedar", name: "Cedar Finance House", team: "bravo" as Team, contact: "Noel Hart", location: "Abu Dhabi branch", projects: 1, status: "Planning" },
];

export const projects = [
  { id: "project-clinic", name: "Clinical network refresh", clientId: "client-northstar", team: "alpha" as Team, location: "Business Bay office", stage: "Delivery", staffing: "Network design + Wi-Fi", leadId: "emp-cora" },
  { id: "project-retail", name: "Retail security uplift", clientId: "client-horizon", team: "alpha" as Team, location: "Al Quoz workshop", stage: "Delivery", staffing: "CCTV + access control", leadId: "emp-elias" },
  { id: "project-residence", name: "Residence access modernization", clientId: "client-marina", team: "bravo" as Team, location: "Dubai Investment Park warehouse", stage: "Proposed", staffing: "Access control + cabling", leadId: "emp-farah" },
  { id: "project-logistics", name: "Warehouse edge resilience", clientId: "client-vertex", team: "bravo" as Team, location: "Jebel Ali operations site", stage: "Delivery", staffing: "Cloud/DevOps + network", leadId: "emp-dan" },
  { id: "project-school", name: "Campus wireless survey", clientId: "client-crestline", team: "alpha" as Team, location: "Sharjah service centre", stage: "Draft", staffing: "Site survey + Wi-Fi", leadId: "emp-omar" },
  { id: "project-finance", name: "Branch cooling assessment", clientId: "client-cedar", team: "bravo" as Team, location: "Abu Dhabi branch", stage: "Delivery", staffing: "Precision cooling/HVAC", leadId: "emp-hana" },
];

export const locations = [
  { id: "loc-business-bay", name: "Business Bay office", team: "alpha" as Team, city: "Dubai", type: "Office", client: "Northstar Medical Group" },
  { id: "loc-dip", name: "Dubai Investment Park warehouse", team: "bravo" as Team, city: "Dubai", type: "Warehouse", client: "Marina Heights Residences" },
  { id: "loc-jebel-ali", name: "Jebel Ali operations site", team: "bravo" as Team, city: "Dubai", type: "Operations", client: "Vertex Logistics" },
  { id: "loc-sharjah", name: "Sharjah service centre", team: "alpha" as Team, city: "Sharjah", type: "Service centre", client: "Crestline Schools" },
  { id: "loc-abu-dhabi", name: "Abu Dhabi branch", team: "bravo" as Team, city: "Abu Dhabi", type: "Branch", client: "Cedar Finance House" },
  { id: "loc-al-quoz", name: "Al Quoz workshop", team: "alpha" as Team, city: "Dubai", type: "Workshop", client: "Horizon Retail Holdings" },
];

export const assignments = [
  { id: "asg-1", employeeId: "emp-cora", projectId: "project-clinic", date: "2026-09-18", time: "08:30–16:30", type: "Timed visit", state: "Published", location: "Business Bay office", warning: "" },
  { id: "asg-2", employeeId: "emp-elias", projectId: "project-retail", date: "2026-09-18", time: "Full day", type: "Full-day assignment", state: "Published", location: "Al Quoz workshop", warning: "" },
  { id: "asg-3", employeeId: "emp-dan", projectId: "project-logistics", date: "2026-09-18", time: "09:00–17:00", type: "Recurring assignment", state: "Published", location: "Jebel Ali operations site", warning: "Overlap warning overridden: client cutover window" },
  { id: "asg-4", employeeId: "emp-hana", projectId: "project-finance", date: "2026-09-19", time: "Full day", type: "Scheduled visit", state: "Proposed", location: "Abu Dhabi branch", warning: "" },
  { id: "asg-5", employeeId: "emp-isla", projectId: "project-clinic", date: "2026-09-21", time: "13:00–17:00", type: "Temporary placement", state: "Draft", location: "Business Bay office", warning: "Missing-skill warning: database support reviewer needed" },
  { id: "asg-6", employeeId: "emp-lina", projectId: "project-residence", date: "2026-09-22", time: "Full day", type: "Full-day assignment", state: "Proposed", location: "Dubai Investment Park warehouse", warning: "Unavailable: approved leave" },
  { id: "asg-7", employeeId: "emp-priya", projectId: "project-logistics", date: "2026-09-23", time: "On call", type: "On-call assignment", state: "Published", location: "Jebel Ali operations site", warning: "" },
];

export const leaveRequests = [
  { id: "leave-lina", employeeId: "emp-lina", status: "Approved", dates: "22–24 Sep 2026", reason: "Private reason", visibleReason: "Approved leave", team: "bravo" as Team },
  { id: "leave-rory", employeeId: "emp-rory", status: "Pending", dates: "04–06 Oct 2026", reason: "Private reason", visibleReason: "Pending leave", team: "alpha" as Team },
  { id: "leave-dan", employeeId: "emp-dan", status: "Rejected", dates: "28 Sep 2026", reason: "Private reason", visibleReason: "Rejected leave", team: "bravo" as Team },
];

export const coverageGaps = [
  { id: "gap-1", title: "Software delivery review", team: "alpha" as Team, date: "21 Sep", skill: "Software development", severity: "High", reason: "Isla is assigned; Nadia is outside Team Alpha scope." },
  { id: "gap-2", title: "Residence access visit", team: "bravo" as Team, date: "22 Sep", skill: "Access control", severity: "Medium", reason: "Lina is on approved leave." },
];

export const replacements = [
  { id: "replacement-1", title: "Residence access visit", team: "bravo" as Team, requestedFor: "Lina Hayes", candidates: ["Farah Voss", "Priya Wells"], status: "Awaiting Super Admin decision", rationale: "Both hold access-control skills; Farah has the closest availability match." },
  { id: "replacement-2", title: "Software delivery review", team: "alpha" as Team, requestedFor: "Isla Vale", candidates: ["Nadia Price", "Jamal Reed"], status: "Scope conflict", rationale: "Nadia matches skills but is Team Bravo; Jamal can provide Cloud/DevOps support." },
];

export const notes = [
  { id: "note-1", title: "Clinical network access", scope: "Shared", team: "alpha" as Team, body: "Client access list is ready for the published visit.", author: "Ava Mercer" },
  { id: "note-2", title: "Warehouse cutover window", scope: "Shared", team: "bravo" as Team, body: "Keep the approved overlap rationale visible in the schedule review.", author: "Ben Iqbal" },
  { id: "note-3", title: "Coaching follow-up", scope: "Management private", team: "alpha" as Team, body: "Private-to-author management note; visible only to Nora Albright.", author: "Nora Albright" },
  { id: "note-4", title: "Capacity escalation", scope: "Shared upward", team: "bravo" as Team, body: "Team Bravo requests an additional access-control resource for October planning.", author: "Ben Iqbal" },
];

export const notifications = [
  { id: "notif-1", recipientId: "emp-cora", title: "Published visit updated", state: "Unread", body: "Clinical network refresh starts at 08:30 on 18 September." },
  { id: "notif-2", recipientId: "emp-dan", title: "On-call assignment", state: "Unread", body: "Jebel Ali operations coverage is published for 23 September." },
  { id: "notif-3", recipientId: "emp-ava", title: "Portfolio update awaiting review", state: "Unread", body: "Cora Bell added a fictional portfolio item." },
  { id: "notif-4", recipientId: "emp-ben", title: "Leave decision recorded", state: "Archived", body: "Lina Hayes' private leave reason remains protected." },
];

export const auditEvents = [
  { id: "audit-1", date: "18 Sep 2026 · 09:15", actor: "Nora Albright", event: "Published September schedule", detail: "Published Team Alpha and Team Bravo assignments." },
  { id: "audit-2", date: "18 Sep 2026 · 10:05", actor: "Ava Mercer", event: "Requested replacement", detail: "Requested coverage for an approved leave conflict." },
  { id: "audit-3", date: "18 Sep 2026 · 10:18", actor: "Nora Albright", event: "Overrode assignment warning", detail: "Approved a fictional overlap for the client cutover window." },
  { id: "audit-4", date: "17 Sep 2026 · 16:30", actor: "Nora Albright", event: "Changed Admin TEAM scope", detail: "Confirmed Ava Mercer: Team Alpha; Ben Iqbal: Team Bravo." },
  { id: "audit-5", date: "16 Sep 2026 · 13:40", actor: "Nora Albright", event: "Leave decision", detail: "Approved leave for Lina Hayes; private reason not shown." },
];

export function selectedPersona(id: string | null | undefined): PreviewPersona { return personas.find((persona) => persona.id === id) ?? personas[0]; }
export function employeeFor(id: string) { return employees.find((employee) => employee.id === id); }
export function inScope<T extends { team: Team }>(records: T[], persona: PreviewPersona) { return persona.role === "SUPER_ADMIN" ? records : persona.role === "ADMIN" ? records.filter((record) => record.team === persona.team) : []; }
export function visibleEmployees(persona: PreviewPersona) { return persona.role === "SUPER_ADMIN" ? employees : persona.role === "ADMIN" ? employees.filter((employee) => employee.team === persona.team) : employees.filter((employee) => employee.id === persona.employeeId); }
export function visibleAssignments(persona: PreviewPersona) { return persona.role === "SUPER_ADMIN" ? assignments : persona.role === "ADMIN" ? assignments.filter((assignment) => employeeFor(assignment.employeeId)?.team === persona.team) : assignments.filter((assignment) => assignment.employeeId === persona.employeeId && assignment.state === "Published"); }
export function visibleLeave(persona: PreviewPersona) { return persona.role === "SUPER_ADMIN" ? leaveRequests : persona.role === "ADMIN" ? leaveRequests.filter((request) => request.team === persona.team).map(({ reason: _reason, ...request }) => request) : leaveRequests.filter((request) => request.employeeId === persona.employeeId); }
export function visibleNotes(persona: PreviewPersona) { if (persona.role === "EMPLOYEE") return notes.filter((note) => note.scope === "Shared" && note.team === employeeFor(persona.employeeId)?.team); if (persona.role === "SUPER_ADMIN") return notes; return notes.filter((note) => note.team === persona.team && note.scope !== "Management private"); }
