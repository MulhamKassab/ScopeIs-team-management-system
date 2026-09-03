import {
  assignments,
  clients,
  employeeFor,
  locations,
  planningCoordinates,
  projects,
  type PlanningCoordinate,
  type PreviewPersona,
  type Team,
  visibleAssignments,
} from "@/preview/preview-data";

export type MapFilters = {
  employeeId?: string;
  skill?: string;
  clientId?: string;
  projectId?: string;
  locationId?: string;
  availability?: string;
};

export type PlanningMapAssignment = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeInitials: string;
  team: Team;
  availability: "Available" | "Assigned" | "On leave" | "On call";
  skills: string[];
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  locationId: string;
  locationName: string;
  date: string;
  time: string;
  type: string;
  employeeArea: PlanningCoordinate;
  worksite: PlanningCoordinate;
};

export type PlanningMapWorksite = {
  id: string;
  locationId: string;
  locationName: string;
  clientName: string;
  projectId: string;
  projectName: string;
  assignmentCount: number;
  worksite: PlanningCoordinate;
  entries: PlanningMapAssignment[];
};

export const mapDates = ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"] as const;

const coordinateFor = (entityType: "employee-area" | "location", entityId: string) =>
  planningCoordinates.find((coordinate) => coordinate.entityType === entityType && coordinate.entityId === entityId);

export function planningMapAssignments(persona: PreviewPersona, date: string, filters: MapFilters = {}): PlanningMapAssignment[] {
  if (persona.role === "EMPLOYEE") return [];

  return visibleAssignments(persona)
    .filter((assignment) => assignment.state === "Published" && assignment.date === date)
    .map((assignment) => {
      const employee = employeeFor(assignment.employeeId);
      const project = projects.find((candidate) => candidate.id === assignment.projectId);
      const client = project ? clients.find((candidate) => candidate.id === project.clientId) : undefined;
      const location = locations.find((candidate) => candidate.id === assignment.locationId);
      const employeeArea = coordinateFor("employee-area", assignment.employeeId);
      const worksite = coordinateFor("location", assignment.locationId);
      if (!employee || !project || !client || !location || !employeeArea || !worksite) return undefined;

      return {
        id: assignment.id,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeInitials: employee.initials,
        team: employee.team,
        availability: employee.availability,
        skills: employee.skills,
        clientId: client.id,
        clientName: client.name,
        projectId: project.id,
        projectName: project.name,
        locationId: location.id,
        locationName: location.name,
        date: assignment.date,
        time: assignment.time,
        type: assignment.type,
        employeeArea,
        worksite,
      } satisfies PlanningMapAssignment;
    })
    .filter((assignment): assignment is PlanningMapAssignment => Boolean(assignment))
    .filter((assignment) => !filters.employeeId || assignment.employeeId === filters.employeeId)
    .filter((assignment) => !filters.skill || assignment.skills.includes(filters.skill))
    .filter((assignment) => !filters.clientId || assignment.clientId === filters.clientId)
    .filter((assignment) => !filters.projectId || assignment.projectId === filters.projectId)
    .filter((assignment) => !filters.locationId || assignment.locationId === filters.locationId)
    .filter((assignment) => !filters.availability || assignment.availability === filters.availability);
}

export function planningMapWorksites(entries: PlanningMapAssignment[]): PlanningMapWorksite[] {
  const groups = new Map<string, PlanningMapAssignment[]>();
  for (const entry of entries) groups.set(entry.locationId, [...(groups.get(entry.locationId) ?? []), entry]);
  return [...groups.values()].map((group) => {
    const first = group[0];
    return {
      id: `map-worksite-${first.locationId}`,
      locationId: first.locationId,
      locationName: first.locationName,
      clientName: first.clientName,
      projectId: first.projectId,
      projectName: first.projectName,
      assignmentCount: group.length,
      worksite: first.worksite,
      entries: group,
    } satisfies PlanningMapWorksite;
  });
}

export function mapFilterOptions(persona: PreviewPersona) {
  const scoped = mapDates.flatMap((date) => planningMapAssignments(persona, date));
  const unique = <T,>(values: T[]) => [...new Set(values)];
  return {
    employees: unique(scoped.map((item) => item.employeeId)).map((id) => ({ id, name: employeeFor(id)?.name ?? id })),
    skills: unique(scoped.flatMap((item) => item.skills)).sort(),
    clients: unique(scoped.map((item) => item.clientId)).map((id) => ({ id, name: clients.find((client) => client.id === id)?.name ?? id })),
    projects: unique(scoped.map((item) => item.projectId)).map((id) => ({ id, name: projects.find((project) => project.id === id)?.name ?? id })),
    locations: unique(scoped.map((item) => item.locationId)).map((id) => ({ id, name: locations.find((location) => location.id === id)?.name ?? id })),
    availability: unique(scoped.map((item) => item.availability)),
  };
}
