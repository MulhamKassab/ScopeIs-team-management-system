"use client";

import "leaflet/dist/leaflet.css";

import L, { type Map as LeafletMap } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { mapDates, mapFilterOptions, planningMapAssignments, planningMapWorksites, type MapFilters, type PlanningMapAssignment } from "@/preview/preview-map-data";
import type { PreviewPersona } from "@/preview/preview-data";

const defaultCenter: [number, number] = [25.062, 55.175];
const defaultZoom = 10;

function markerIcon(kind: "employee" | "worksite", selected: boolean, initials: string) {
  return L.divIcon({
    className: "",
    html: `<span class="planning-marker ${kind}${selected ? " is-selected" : ""}" aria-hidden="true">${initials}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function MapLifecycle({ onMapReady }: { onMapReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
    const resize = () => map.invalidateSize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [map, onMapReady]);
  return null;
}

function fitMap(map: LeafletMap | null, assignments: PlanningMapAssignment[]) {
  if (!map) return;
  const positions = assignments.flatMap((assignment) => [
    [assignment.employeeArea.latitude, assignment.employeeArea.longitude] as [number, number],
    [assignment.worksite.latitude, assignment.worksite.longitude] as [number, number],
  ]);
  if (positions.length) map.fitBounds(positions, { padding: [38, 38], maxZoom: 12 });
  else map.setView(defaultCenter, defaultZoom);
}

function labelForDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function previewHref(path: string, persona: PreviewPersona) {
  return `${path}?persona=${persona.id}`;
}

export function InteractivePlanningMap({ persona }: { persona: PreviewPersona }) {
  const [date, setDate] = useState<(typeof mapDates)[number]>(mapDates[0]);
  const [filters, setFilters] = useState<MapFilters>({});
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const options = useMemo(() => mapFilterOptions(persona), [persona]);
  const entries = useMemo(() => planningMapAssignments(persona, date, filters), [persona, date, filters]);
  const worksites = useMemo(() => planningMapWorksites(entries), [entries]);
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => fitMap(map, entries));
    return () => window.cancelAnimationFrame(frame);
  }, [entries, map]);

  const update = <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => setFilters((current) => ({ ...current, [key]: value || undefined }));
  const reset = () => { setFilters({}); setSelectedId(undefined); fitMap(map, planningMapAssignments(persona, date)); };

  return <>
    <header className="page-heading"><div><p className="eyebrow">Interactive planning view</p><h1>Planning map</h1><p>Planning status for {labelForDate(date)} — based on the Published schedule, not live tracking.</p></div></header>
    <p className="demo-callout">Employee points are approximate fictional planning areas. No GPS, current movement, location history, route history, or changes are saved.</p>
    <section className="map-filter-panel" aria-label="Planning map filters">
      <label>Selected date<select aria-label="Selected planning date" value={date} onChange={(event) => setDate(event.target.value as (typeof mapDates)[number])}>{mapDates.map((value) => <option key={value} value={value}>{labelForDate(value)}</option>)}</select></label>
      <label>Employee<select aria-label="Filter by employee" value={filters.employeeId ?? ""} onChange={(event) => update("employeeId", event.target.value)}><option value="">All authorized</option>{options.employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Capability<select aria-label="Filter by capability" value={filters.skill ?? ""} onChange={(event) => update("skill", event.target.value)}><option value="">All capabilities</option>{options.skills.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Client<select aria-label="Filter by client" value={filters.clientId ?? ""} onChange={(event) => update("clientId", event.target.value)}><option value="">All authorized</option>{options.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Availability<select aria-label="Filter by availability" value={filters.availability ?? ""} onChange={(event) => update("availability", event.target.value)}><option value="">All states</option>{options.availability.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <div className="map-actions"><button className="button secondary" type="button" onClick={() => fitMap(map, entries)}>Fit visible markers</button><button className="button secondary" type="button" onClick={reset}>Reset map</button></div>
    </section>
    <p className="map-summary"><strong>{entries.length} Published assignment{entries.length === 1 ? "" : "s"}</strong> · {entries.length + worksites.length} planning markers · {persona.role === "SUPER_ADMIN" ? "both authorized teams" : `Team ${persona.team === "alpha" ? "Alpha" : "Bravo"} only`}</p>
    {tilesUnavailable ? <p className="map-fallback" role="status">Basemap unavailable. The filtered fictional planning list remains available below; no live location data is used.</p> : null}
    <section className="planning-map-shell" aria-label="Interactive published planning map">
      <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom className="planning-map" aria-label="Published schedule planning map">
        <MapLifecycle onMapReady={setMap} />
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setTilesUnavailable(true), load: () => setTilesUnavailable(false) }} />
        {entries.map((entry) => <Polyline key={`line-${entry.id}`} positions={[[entry.employeeArea.latitude, entry.employeeArea.longitude], [entry.worksite.latitude, entry.worksite.longitude]]} pathOptions={{ color: entry.id === selected?.id ? "#163b99" : "#6b7b93", weight: entry.id === selected?.id ? 4 : 2, dashArray: "5 7" }} />)}
        {entries.map((entry) => <Marker key={`employee-${entry.id}`} position={[entry.employeeArea.latitude, entry.employeeArea.longitude]} icon={markerIcon("employee", entry.id === selected?.id, entry.employeeInitials)} alt={`${entry.employeeName} approximate planning area`} keyboard eventHandlers={{ click: () => setSelectedId(entry.id) }}><Popup><h2>{entry.employeeName}</h2><p>Approximate fictional planning area · {entry.availability}</p><p>{entry.type} · {entry.time}</p></Popup></Marker>)}
        {worksites.map((worksite) => <Marker key={worksite.id} position={[worksite.worksite.latitude, worksite.worksite.longitude]} icon={markerIcon("worksite", worksite.entries.some((entry) => entry.id === selected?.id), "WS")} alt={`${worksite.locationName} fictional worksite`} keyboard eventHandlers={{ click: () => setSelectedId(worksite.entries[0]?.id) }}><Popup><h2>{worksite.locationName}</h2><p><strong>Client:</strong> {worksite.clientName}</p><p><strong>Project:</strong> {worksite.projectName}</p><p>{worksite.assignmentCount} Published fixture assignment{worksite.assignmentCount === 1 ? "" : "s"} for {labelForDate(date)}.</p><div className="map-popup-actions"><a className="map-popup-link" href={previewHref(`/projects/${worksite.projectId}`, persona)}>Open project</a><a className="map-popup-link secondary" href={previewHref(`/locations/${worksite.locationId}`, persona)}>Open location</a></div></Popup></Marker>)}
      </MapContainer>
    </section>
    <section className="map-legend" aria-label="Planning map legend"><span><i className="legend-dot employee" />Approximate employee planning area</span><span><i className="legend-dot worksite" />Fictional worksite</span><span><i className="legend-line" />Published assignment connection</span></section>
    <section className="map-data-grid" aria-label="Planning list and selected details">
      <div className="panel map-list"><h2>Published planning list</h2>{entries.length ? <ul className="timeline">{entries.map((entry) => <li key={entry.id}><button className={entry.id === selected?.id ? "map-list-item selected" : "map-list-item"} type="button" onClick={() => setSelectedId(entry.id)}><strong>{entry.employeeName} · {entry.locationName}</strong><span>{entry.projectName} · {entry.time}</span><small>{entry.availability} · {entry.skills.join(" · ")}</small></button></li>)}</ul> : <p className="muted">No Published assignments match these authorized filters.</p>}</div>
      <aside className="panel map-selection" aria-live="polite"><h2>Selected planning details</h2>{selected ? <dl className="detail-list"><div><dt>Employee</dt><dd>{selected.employeeName}</dd></div><div><dt>Worksite</dt><dd>{selected.locationName}</dd></div><div><dt>Client / project</dt><dd>{selected.clientName}<br />{selected.projectName}</dd></div><div><dt>Published work</dt><dd>{selected.type} · {selected.time}</dd></div></dl> : <p className="muted">Select a marker or planning-list record to inspect its fictional details.</p>}</aside>
    </section>
  </>;
}
