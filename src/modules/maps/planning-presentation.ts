import type { MapCoordinate } from "@/modules/maps/map-adapter";
import type { PlanningProjection } from "@/modules/maps/service";

export type PlanningAssignment = PlanningProjection["assignments"][number];
export type MarkerGroup = {
  id: string;
  coordinate: MapCoordinate;
  kind: "employee" | "worksite" | "shared";
  names: string[];
  assignmentIds: string[];
};

/** Only the already-authorized projection is used. Coincident pins never obscure another assignment. */
export function groupPlanningMarkers(assignments: PlanningAssignment[], employees = true, worksites = true): MarkerGroup[] {
  const groups = new Map<string, MarkerGroup>();
  function add(item: PlanningAssignment, kind: "employee" | "worksite", coordinate: MapCoordinate | null, name: string) {
    if (!coordinate) return;
    const key = `${coordinate.latitude}:${coordinate.longitude}`;
    const group = groups.get(key);
    if (group) {
      if (group.kind !== kind) group.kind = "shared";
      if (!group.names.includes(name)) group.names.push(name);
      if (!group.assignmentIds.includes(item.id)) group.assignmentIds.push(item.id);
    } else groups.set(key, { id: key, coordinate, kind, names: [name], assignmentIds: [item.id] });
  }
  for (const item of assignments) {
    if (employees) add(item, "employee", item.employeeCoordinate, item.employeeName);
    if (worksites) add(item, "worksite", item.worksite.coordinate, item.worksite.name);
  }
  return [...groups.values()];
}

export function assignmentCoordinates(item: PlanningAssignment): MapCoordinate[] {
  return [item.employeeCoordinate, item.worksite.coordinate].filter((coordinate): coordinate is MapCoordinate => coordinate !== null);
}

export function searchPlanningAssignments(assignments: PlanningAssignment[], query: string): PlanningAssignment[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return assignments.filter((item) => {
    const text = [item.employeeName, item.client.name, item.project.name, item.worksite.name, ...item.skills.map((skill) => skill.name)].join(" ").toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
