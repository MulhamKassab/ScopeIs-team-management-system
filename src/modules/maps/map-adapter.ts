/** Browser adapter contract: map-specific rendering never changes the domain projection. */
export type MapCoordinate = { latitude: number; longitude: number };
export type PlanningMapMarker = { id: string; kind: "employee" | "worksite"; coordinate: MapCoordinate; label: string; detail: string };
export type PlanningMapLine = { id: string; from: MapCoordinate; to: MapCoordinate; label: string };
export const osmRasterAttribution = "© OpenStreetMap contributors";
