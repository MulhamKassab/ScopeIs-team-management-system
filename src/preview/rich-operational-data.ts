import { assignments, employees, employeeFor, type PreviewPersona, type Team } from "@/preview/preview-data";

export type Proficiency = "Developing" | "Working" | "Advanced" | "Expert";
export type CapabilityRecord = { id: string; employeeId: string; skillId: string; proficiency: Proficiency; years: number; verified: boolean; coverageEligible: boolean; developing: boolean };
export type OperationalClient = { id: string; name: string; team: Team; industry: string; accountManagerId: string; status: "Active" | "Paused" | "Planning" | "Completed"; serviceStart: string; serviceEnd: string; services: string[]; primaryContact: string; secondaryContact: string };
export type OperationalProject = { id: string; clientId: string; team: Team; name: string; status: "Active" | "Paused" | "Planned" | "Completed"; start: string; end: string; requiredSkillIds: string[]; leadId: string; description: string };
export type OperationalLocation = { id: string; clientId: string; projectId: string; team: Team; name: string; city: string; type: string; requiredSkillIds: string[]; siteHours: string };
export type OperationalWork = { id: string; projectId: string; clientId: string; locationId: string; employeeId: string; date: string; status: "Completed" | "Scheduled" | "In progress"; hours: number; skillId: string };
export type OperationalRequest = { id: string; clientId: string; projectId: string; locationId: string; requesterId: string; assigneeIds: string[]; requiredSkillId: string; priority: "Low" | "Medium" | "High" | "Critical"; status: "New" | "Assigned" | "In progress" | "Completed" | "On hold"; created: string; due: string; description: string; coverageImpact: boolean };
export type CoverageEvaluation = { id: string; clientId: string; projectId: string; locationId: string; skillId: string; date: string; required: number; assigned: number; availableQualified: number; status: "Covered" | "At risk" | "Uncovered"; reason: string; team: Team };
export type ReplacementDecision = { id: string; coverageId: string; candidateIds: string[]; status: "Pending" | "Approved" | "Changed" | "Rejected"; requested: string; team: Team; rationale: string };
export type HistoricalLeave = { id: string; employeeId: string; team: Team; status: "Approved" | "Pending" | "Rejected"; start: string; end: string; displayReason: string };

export const skillCatalog = [
  ["skill-network", "Network design", "Network", "Design and resilient infrastructure patterns."],
  ["skill-routing", "Routing and switching", "Network", "Core routing, switching and cutover work."],
  ["skill-wifi", "Wi-Fi", "Network", "Enterprise wireless survey and delivery."],
  ["skill-cctv", "CCTV", "Security", "Security camera design and commissioning."],
  ["skill-access", "Access control", "Security", "Access platforms, readers and permissions."],
  ["skill-cabling", "Structured cabling", "Infrastructure", "Structured cabling installation and validation."],
  ["skill-fiber", "Fiber", "Infrastructure", "Fiber planning, termination and handover."],
  ["skill-hvac", "Precision cooling/HVAC", "Facilities", "Critical-environment cooling operations."],
  ["skill-software", "Software development", "Digital", "Operational software and integration delivery."],
  ["skill-cloud", "Cloud/DevOps", "Digital", "Cloud platform and deployment operations."],
  ["skill-database", "Database support", "Digital", "Database reliability and reporting support."],
  ["skill-helpdesk", "Help desk", "Service", "Service desk triage and client handover."],
  ["skill-survey", "Site survey", "Delivery", "Site discovery and delivery readiness."],
  ["skill-documentation", "Documentation", "Delivery", "Operational documentation and handover."],
  ["skill-coordination", "Client coordination", "Delivery", "Client coordination and stakeholder management."],
] as const;

export const operationalClients: OperationalClient[] = [
  ["Northstar Medical Group", "alpha", "Healthcare", "emp-ava"], ["Horizon Retail Holdings", "alpha", "Retail", "emp-ava"], ["Crestline Schools", "alpha", "Education", "emp-ava"], ["Atlas Hospitality Collective", "alpha", "Hospitality", "emp-ava"], ["Orchid Property Services", "alpha", "Real estate", "emp-ava"],
  ["Marina Heights Residences", "bravo", "Residential services", "emp-ben"], ["Vertex Logistics", "bravo", "Logistics", "emp-ben"], ["Cedar Finance House", "bravo", "Financial services", "emp-ben"], ["Summit Manufacturing Gulf", "bravo", "Manufacturing", "emp-ben"], ["Harborline Aviation Services", "bravo", "Aviation services", "emp-ben"],
].map(([name, team, industry, accountManagerId], index) => ({
  id: `op-client-${String(index + 1).padStart(2, "0")}`,
  name,
  team: team as Team,
  industry,
  accountManagerId,
  status: (["Active", "Active", "Planning", "Paused", "Completed"] as const)[index % 5],
  serviceStart: `${2023 + (index % 3)}-0${(index % 8) + 1}-01`,
  serviceEnd: `202${7 + (index % 2)}-12-31`,
  services: [skillCatalog[index % skillCatalog.length][1], skillCatalog[(index + 4) % skillCatalog.length][1]],
  primaryContact: `Operations contact ${index + 1} <client${index + 1}@example.test>`,
  secondaryContact: `Service contact ${index + 1} <service${index + 1}@example.test>`,
}));

export const operationalProjects: OperationalProject[] = operationalClients.flatMap((client, clientIndex) => Array.from({ length: 3 }, (_, projectIndex) => ({
  id: `op-project-${String(clientIndex * 3 + projectIndex + 1).padStart(2, "0")}`,
  clientId: client.id,
  team: client.team,
  name: `${client.name.split(" ")[0]} ${["Resilience programme", "Service renewal", "Operational upgrade"][projectIndex]}`,
  status: (["Completed", "Active", "Planned"] as const)[projectIndex],
  start: `${2023 + ((clientIndex + projectIndex) % 3)}-${String((projectIndex * 3) + 1).padStart(2, "0")}-01`,
  end: `${2026 + (projectIndex === 2 ? 1 : 0)}-${String((projectIndex * 3) + 3).padStart(2, "0")}-28`,
  requiredSkillIds: [skillCatalog[(clientIndex + projectIndex) % skillCatalog.length][0], skillCatalog[(clientIndex + projectIndex + 4) % skillCatalog.length][0]],
  leadId: client.accountManagerId,
  description: `A fictional multi-year ${client.industry.toLowerCase()} delivery programme with controlled scope, visits and service milestones.`,
})));

export const operationalLocations: OperationalLocation[] = operationalProjects.flatMap((project, projectIndex) => Array.from({ length: projectIndex % 3 === 0 ? 1 : 2 }, (_, locationIndex) => ({
  id: `op-location-${String(projectIndex * 2 + locationIndex + 1).padStart(2, "0")}`,
  clientId: project.clientId,
  projectId: project.id,
  team: project.team,
  name: `${["Business Bay", "Dubai Investment Park", "Jebel Ali", "Sharjah", "Abu Dhabi", "Al Quoz"][projectIndex % 6]} ${locationIndex ? "annex" : "operations site"}`,
  city: ["Dubai", "Dubai", "Dubai", "Sharjah", "Abu Dhabi", "Dubai"][projectIndex % 6],
  type: locationIndex ? "Satellite site" : "Primary operational site",
  requiredSkillIds: project.requiredSkillIds,
  siteHours: "Sun–Thu · 08:00–17:00",
})));

export const capabilityRecords: CapabilityRecord[] = employees.flatMap((employee, employeeIndex) => Array.from({ length: 5 }, (_, skillIndex) => ({
  id: `cap-${employee.id}-${skillIndex + 1}`,
  employeeId: employee.id,
  skillId: skillCatalog[(employeeIndex * 2 + skillIndex) % skillCatalog.length][0],
  proficiency: (["Working", "Advanced", "Expert", "Developing", "Advanced"] as Proficiency[])[skillIndex],
  years: 2 + ((employeeIndex + skillIndex * 2) % 12),
  verified: (employeeIndex + skillIndex) % 4 !== 0,
  coverageEligible: skillIndex !== 3,
  developing: skillIndex === 3,
})));

export const certifications = employees.flatMap((employee, employeeIndex) => Array.from({ length: 3 }, (_, certificationIndex) => {
  const capability = capabilityRecords.find((record) => record.employeeId === employee.id && record.id.endsWith(`-${certificationIndex + 1}`))!;
  return { id: `cert-${employee.id}-${certificationIndex + 1}`, employeeId: employee.id, skillId: capability.skillId, issuer: ["Scope Academy", "Gulf Technical Institute", "Fictional Professional Council"][certificationIndex], issued: `${2023 + certificationIndex}-${String(certificationIndex + 2).padStart(2, "0")}-15`, expires: `${2026 + ((employeeIndex + certificationIndex) % 3)}-${String(certificationIndex + 6).padStart(2, "0")}-15`, credentialId: `FIC-${employee.initials}-${String(certificationIndex + 1).padStart(3, "0")}`, verified: capability.verified };
}));

export const portfolioItems = employees.flatMap((employee, employeeIndex) => Array.from({ length: 4 }, (_, portfolioIndex) => {
  const project = operationalProjects.filter((candidate) => candidate.team === employee.team)[(employeeIndex + portfolioIndex) % operationalProjects.filter((candidate) => candidate.team === employee.team).length];
  return { id: `portfolio-${employee.id}-${portfolioIndex + 1}`, employeeId: employee.id, projectId: project.id, title: `${project.name} delivery example ${portfolioIndex + 1}`, period: `${2023 + portfolioIndex}–${2024 + portfolioIndex}`, outcome: ["Commissioned", "Documented", "Improved resilience", "Completed handover"][portfolioIndex], technologies: project.requiredSkillIds };
}));

export const operationalWork: OperationalWork[] = Array.from({ length: 360 }, (_, index) => {
  const employee = employees[index % employees.length];
  const projectsForTeam = operationalProjects.filter((project) => project.team === employee.team);
  const project = projectsForTeam[index % projectsForTeam.length];
  const locationsForProject = operationalLocations.filter((location) => location.projectId === project.id);
  const location = locationsForProject[index % locationsForProject.length];
  const monthIndex = index % 36;
  const year = 2023 + Math.floor((9 + monthIndex) / 12);
  const month = ((9 + monthIndex) % 12) + 1;
  return { id: `work-${String(index + 1).padStart(3, "0")}`, projectId: project.id, clientId: project.clientId, locationId: location.id, employeeId: employee.id, date: `${year}-${String(month).padStart(2, "0")}-${String(1 + ((index * 5) % 26)).padStart(2, "0")}`, status: (["Completed", "Completed", "In progress", "Scheduled"] as const)[index % 4], hours: 4 + (index % 5), skillId: project.requiredSkillIds[index % project.requiredSkillIds.length] };
});

export const operationalRequests: OperationalRequest[] = Array.from({ length: 80 }, (_, index) => {
  const project = operationalProjects[index % operationalProjects.length];
  const location = operationalLocations.find((candidate) => candidate.projectId === project.id)!;
  const teamEmployees = employees.filter((employee) => employee.team === project.team);
  return { id: `request-${String(index + 1).padStart(3, "0")}`, clientId: project.clientId, projectId: project.id, locationId: location.id, requesterId: project.leadId, assigneeIds: index % 5 === 0 ? [] : [teamEmployees[(index + 2) % teamEmployees.length].id], requiredSkillId: project.requiredSkillIds[index % project.requiredSkillIds.length], priority: (["Low", "Medium", "High", "Critical"] as const)[index % 4], status: (["New", "Assigned", "In progress", "Completed", "On hold"] as const)[index % 5], created: `2026-0${(index % 9) + 1}-${String((index % 25) + 1).padStart(2, "0")}`, due: `2026-10-${String((index % 25) + 1).padStart(2, "0")}`, description: `Fictional operational request ${index + 1} with scoped work instructions and delivery context.`, coverageImpact: index % 3 === 0 };
});

export const coverageEvaluations: CoverageEvaluation[] = Array.from({ length: 36 }, (_, index) => {
  const project = operationalProjects[index % operationalProjects.length];
  const location = operationalLocations.find((candidate) => candidate.projectId === project.id)!;
  const required = 1 + (index % 3);
  const assigned = index % 5 === 0 ? 0 : required - (index % 4 === 0 ? 1 : 0);
  const availableQualified = Math.max(0, required + ((index % 5) - 2));
  const status = assigned >= required && availableQualified >= required ? "Covered" : assigned === 0 ? "Uncovered" : "At risk";
  return { id: `coverage-${String(index + 1).padStart(2, "0")}`, clientId: project.clientId, projectId: project.id, locationId: location.id, skillId: project.requiredSkillIds[index % project.requiredSkillIds.length], date: `2026-${String((index % 9) + 1).padStart(2, "0")}-${String((index % 25) + 1).padStart(2, "0")}`, required, assigned, availableQualified, status, reason: status === "Covered" ? "Qualified capacity is available." : status === "At risk" ? "One qualified person is allocated elsewhere." : "Leave and existing allocation leave no qualified employee available.", team: project.team };
});

export const replacementDecisions: ReplacementDecision[] = Array.from({ length: 25 }, (_, index) => {
  const coverage = coverageEvaluations.filter((item) => item.status !== "Covered")[index % coverageEvaluations.filter((item) => item.status !== "Covered").length];
  const candidates = employees.filter((employee) => employee.team === coverage.team).slice(0, 3).map((employee) => employee.id);
  return { id: `replacement-${String(index + 1).padStart(2, "0")}`, coverageId: coverage.id, candidateIds: candidates, status: (["Pending", "Approved", "Changed", "Rejected"] as const)[index % 4], requested: `2026-0${(index % 9) + 1}-12`, team: coverage.team, rationale: "Candidate fit reflects skills, certification status, availability and current fixture workload; management review remains required." };
});

export const historicalLeave: HistoricalLeave[] = Array.from({ length: 54 }, (_, index) => {
  const employee = employees[index % employees.length];
  const absoluteMonth = 9 + (index % 36);
  const year = 2023 + Math.floor(absoluteMonth / 12);
  const month = (absoluteMonth % 12) + 1;
  const startDay = 2 + ((index * 3) % 20);
  return {
    id: `historical-leave-${String(index + 1).padStart(2, "0")}`,
    employeeId: employee.id,
    team: employee.team,
    status: (["Approved", "Approved", "Pending", "Rejected"] as const)[index % 4],
    start: `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(startDay + 2).padStart(2, "0")}`,
    displayReason: index % 4 === 2 ? "Pending leave" : index % 4 === 3 ? "Rejected leave" : "Approved leave",
  };
});

export const sharedOperationalNotes = Array.from({ length: 110 }, (_, index) => ({ id: `shared-note-${String(index + 1).padStart(3, "0")}`, projectId: operationalProjects[index % operationalProjects.length].id, clientId: operationalProjects[index % operationalProjects.length].clientId, team: operationalProjects[index % operationalProjects.length].team, authorId: employees[index % employees.length].id, date: `202${3 + (index % 4)}-${String((index % 12) + 1).padStart(2, "0")}-15`, body: `Fictional shared operational update ${index + 1}: delivery context, visit readiness and handover information.` }));
export const managementHistory = Array.from({ length: 32 }, (_, index) => ({ id: `management-note-${String(index + 1).padStart(2, "0")}`, subjectId: employees[(index + 3) % employees.length].id, authorId: index % 2 ? "emp-ava" : "emp-ben", team: employees[(index + 3) % employees.length].team, visibility: index % 3 ? "Shared upward" : "Private to author", body: "Fictional management context. Never shown to the subject employee.", date: `2026-0${(index % 9) + 1}-08` }));
export const operationalNotifications = Array.from({ length: 110 }, (_, index) => ({ id: `notification-${String(index + 1).padStart(3, "0")}`, recipientId: employees[index % employees.length].id, state: index % 4 ? "Read" : "Unread", date: `202${3 + (index % 4)}-${String((index % 12) + 1).padStart(2, "0")}-20`, title: `Operational update ${index + 1}`, body: "Fictional schedule, request, certification or delivery notification." }));
export const operationalAudit = Array.from({ length: 110 }, (_, index) => ({ id: `audit-history-${String(index + 1).padStart(3, "0")}`, actorId: employees[index % employees.length].id, date: `202${3 + (index % 4)}-${String((index % 12) + 1).padStart(2, "0")}-21`, event: ["Schedule publication", "Request update", "Coverage evaluation", "Portfolio review", "Replacement decision"][index % 5], detail: `Fictional historical activity ${index + 1}.` }));

export const monthlyOperationalTrend = Array.from({ length: 36 }, (_, index) => {
  const absoluteMonth = 9 + index; const year = 2023 + Math.floor(absoluteMonth / 12); const month = (absoluteMonth % 12) + 1;
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const completed = operationalWork.filter((work) => work.date.startsWith(monthPrefix) && work.status === "Completed").length;
  return { id: `trend-${monthPrefix}`, month: monthPrefix, completed, scheduled: operationalWork.filter((work) => work.date.startsWith(monthPrefix) && work.status !== "Completed").length, coverageRisk: coverageEvaluations.filter((item) => item.date.startsWith(monthPrefix) && item.status !== "Covered").length };
});

export function inOperationalScope<T extends { team: Team }>(records: T[], persona: PreviewPersona) { return persona.role === "SUPER_ADMIN" ? records : persona.role === "ADMIN" ? records.filter((record) => record.team === persona.team) : []; }
export function skillName(skillId: string) { return skillCatalog.find((skill) => skill[0] === skillId)?.[1] ?? "Fictional capability"; }
export function employeeCapabilities(employeeId: string) { return capabilityRecords.filter((record) => record.employeeId === employeeId); }
export function visibleOperationalLeave(persona: PreviewPersona, employeeId?: string) {
  const records = employeeId ? historicalLeave.filter((item) => item.employeeId === employeeId) : historicalLeave;
  if (persona.role === "SUPER_ADMIN") return records;
  if (persona.role === "ADMIN") return records.filter((item) => item.team === persona.team);
  return records.filter((item) => item.employeeId === persona.employeeId);
}
export function visibleManagementHistory(persona: PreviewPersona, subjectId: string) {
  if (persona.role === "SUPER_ADMIN") return managementHistory.filter((item) => item.subjectId === subjectId);
  if (persona.role === "ADMIN" && employeeFor(subjectId)?.team === persona.team) return managementHistory.filter((item) => item.subjectId === subjectId && item.authorId === persona.employeeId);
  return [];
}
export function projectFor(id: string) { return operationalProjects.find((project) => project.id === id); }
export function clientFor(id: string) { return operationalClients.find((client) => client.id === id); }
export function locationFor(id: string) { return operationalLocations.find((location) => location.id === id); }
export function operationalCounts(persona: PreviewPersona) {
  const projects = inOperationalScope(operationalProjects, persona); const clients = inOperationalScope(operationalClients, persona); const projectIds = new Set(projects.map((project) => project.id));
  return { clients: clients.length, projects: projects.length, work: operationalWork.filter((item) => projectIds.has(item.projectId)).length, requests: operationalRequests.filter((item) => projectIds.has(item.projectId)).length, coverage: coverageEvaluations.filter((item) => projectIds.has(item.projectId) && item.status !== "Covered").length, assignments: assignments.length };
}
