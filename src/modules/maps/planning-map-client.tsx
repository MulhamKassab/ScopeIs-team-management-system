"use client";
/* eslint-disable @next/next/no-img-element -- external raster tiles must remain browser-only and bypass server optimization. */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowRight, Building2, CalendarDays, CalendarOff, Check, ChevronRight, Focus, Layers, MapPinned, Minus, Plus, RotateCcw, Search, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";
import type { PlanningProjection } from "@/modules/maps/service";
import { osmRasterAttribution } from "@/modules/maps/map-adapter";
import { fitMapCoordinates, mapPosition, MAX_MAP_ZOOM, MIN_MAP_ZOOM, panMap, visibleMapTiles, type MapCamera } from "@/modules/maps/map-projection";
import { assignmentCoordinates, groupPlanningMarkers, searchPlanningAssignments, type PlanningAssignment } from "@/modules/maps/planning-presentation";

type Attention = "all" | "coverage" | "unavailable";
const precisionLabel = (item: PlanningAssignment) => item.employeePrecision === "coarse" ? "Coarse planning area" : item.employeePrecision === "exact" ? "Stored planning marker" : "No employee planning coordinate";

export function PlanningMapClient({ projection }: { projection: PlanningProjection }) {
  const [selected, setSelected] = useState(projection.assignments[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [attention, setAttention] = useState<Attention>("all");
  const [layers, setLayers] = useState({ employees: true, worksites: true, associations: true });
  const [cameraOverride, setCamera] = useState<MapCamera | null>(null);
  const [tileFailed, setTileFailed] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const [touchInteraction, setTouchInteraction] = useState(false);
  const canvas = useRef<HTMLElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; camera: MapCamera } | null>(null);
  const [viewport, setViewport] = useState({ width: 720, height: 520 });
  useEffect(() => {
    if (!canvas.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width && entry.contentRect.height) setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);

  const assignments = useMemo(() => searchPlanningAssignments(projection.assignments, query)
    .filter((item) => attention === "coverage" ? item.coverageGap : attention === "unavailable" ? item.unavailable : true), [projection.assignments, query, attention]);
  const active = assignments.find((item) => item.id === selected) ?? assignments[0] ?? null;
  const coordinates = useMemo(() => assignments.flatMap(assignmentCoordinates), [assignments]);
  const markers = useMemo(() => groupPlanningMarkers(assignments, layers.employees, layers.worksites), [assignments, layers.employees, layers.worksites]);
  const camera = cameraOverride ?? fitMapCoordinates(coordinates, viewport);
  const position = (coordinate: NonNullable<PlanningAssignment["employeeCoordinate"]>) => mapPosition(coordinate, camera.centre, camera.zoom, viewport);
  const tiles = visibleMapTiles(camera.centre, camera.zoom, viewport);
  const gapCount = projection.assignments.filter((item) => item.coverageGap).length;
  const unavailableCount = projection.assignments.filter((item) => item.unavailable).length;

  function selectAssignment(id: string, focusMap = false) {
    setSelected(id);
    const item = projection.assignments.find((item) => item.id === id);
    if (focusMap && item && assignmentCoordinates(item).length) setCamera(fitMapCoordinates(assignmentCoordinates(item), viewport));
  }
  function zoomBy(delta: number) { setCamera({ ...camera, zoom: Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, camera.zoom + delta)) }); }
  function move(dx: number, dy: number) { setCamera({ ...camera, centre: panMap(camera.centre, camera.zoom, dx, dy) }); }
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || tileFailed) return;
    const amount = event.shiftKey ? 120 : 60;
    const directions: Record<string, [number, number]> = { ArrowLeft: [amount, 0], ArrowRight: [-amount, 0], ArrowUp: [0, amount], ArrowDown: [0, -amount] };
    if (directions[event.key]) { event.preventDefault(); move(...directions[event.key]); }
    else if (["+", "=", "-", "Home"].includes(event.key)) { event.preventDefault(); if (event.key === "Home") setCamera(null); else zoomBy(event.key === "-" ? -1 : 1); }
  }
  function pointerDown(event: PointerEvent<HTMLElement>) {
    if (tileFailed || event.button !== 0 || (event.target as Element).closest("button, a") || (event.pointerType === "touch" && !touchInteraction)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (event.nativeEvent.isTrusted) event.currentTarget.setPointerCapture?.(event.pointerId);
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(first.x - second.x, first.y - second.y), camera };
    }
  }
  function pointerMove(event: PointerEvent<HTMLElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [first, second] = [...pointers.current.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (distance > 0 && pinch.current.distance > 0) setCamera({ ...pinch.current.camera, zoom: Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, pinch.current.camera.zoom + Math.round(Math.log2(distance / pinch.current.distance)))) });
    } else move(event.clientX - previous.x, event.clientY - previous.y);
  }
  function pointerEnd(event: PointerEvent<HTMLElement>) { pointers.current.delete(event.pointerId); pinch.current = null; }
  function setAttentionView(value: Attention) { setAttention(value); setCamera(null); }

  return <div className="planning-map-client">
    <div className="map-view-toolbar">
      <div className="map-attention-controls" role="group" aria-label="Assignment view">
        <button type="button" aria-label={`All assignments ${projection.assignments.length}`} aria-pressed={attention === "all"} onClick={() => setAttentionView("all")}><span className="map-attention-label">All assignments</span><span className="map-attention-compact" aria-hidden="true">All</span><span className="map-attention-count">{projection.assignments.length}</span></button>
        <button type="button" aria-label={`Coverage gaps ${gapCount}`} aria-pressed={attention === "coverage"} onClick={() => setAttentionView("coverage")}><span className="map-attention-label">Coverage gaps</span><span className="map-attention-compact" aria-hidden="true">Gaps</span><span className="map-attention-count">{gapCount}</span></button>
        <button type="button" aria-label={`Approved unavailable ${unavailableCount}`} aria-pressed={attention === "unavailable"} onClick={() => setAttentionView("unavailable")}><span className="map-attention-label">Approved unavailable</span><span className="map-attention-compact" aria-hidden="true">Unavailable</span><span className="map-attention-count">{unavailableCount}</span></button>
      </div>
      <div className="map-fit-controls">
        <button type="button" className="button" disabled={tileFailed || !coordinates.length} onClick={() => setCamera(null)}><Focus size={17} aria-hidden="true" />Fit all</button>
        <button type="button" className="button" disabled={tileFailed || !active || !assignmentCoordinates(active).length} onClick={() => active && selectAssignment(active.id, true)}><MapPinned size={17} aria-hidden="true" />Focus selected</button>
      </div>
    </div>
    <div className="planning-map-workspace">
      <div className="planning-map-stage">
        <section ref={canvas} tabIndex={0} className={`planning-map-canvas${touchInteraction ? " map-touch-active" : ""}${tileFailed ? " map-unavailable" : ""}`} aria-label="Static planning map" aria-describedby="map-interaction-help map-provider-notice" onKeyDown={keyboard} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
          {tileFailed ? <div className="planning-map-tile-failure" role="alert"><MapPinned size={36} aria-hidden="true" /><strong>Map tiles could not be loaded.</strong><span>Your published assignments and planning details are still available.</span><button type="button" className="button" onClick={() => { setTileAttempt((value) => value + 1); setTileFailed(false); }}><RotateCcw size={17} aria-hidden="true" />Retry map</button><a href="#planning-assignment-list">View the assignment list</a></div> : <>
            <div className="planning-map-tiles" style={{ display: "block" }} aria-hidden="true">{tiles.map((tile) => <img key={`${tileAttempt}:${tile.key}`} draggable={false} style={{ position: "absolute", left: tile.left, top: tile.top }} src={`https://tile.openstreetmap.org/${camera.zoom}/${tile.x}/${tile.y}.png`} alt="" onError={() => setTileFailed(true)} />)}</div>
            <div className="map-canvas-status"><span className="map-static-indicator" />Published plan</div>
            <div className="planning-map-controls"><button type="button" onClick={() => zoomBy(1)} disabled={camera.zoom >= MAX_MAP_ZOOM} aria-label="Zoom in"><Plus size={20} aria-hidden="true" /></button><button type="button" onClick={() => zoomBy(-1)} disabled={camera.zoom <= MIN_MAP_ZOOM} aria-label="Zoom out"><Minus size={20} aria-hidden="true" /></button></div>
            {layers.associations && layers.employees && layers.worksites ? <svg className="planning-map-lines" aria-label="Static planned associations" role="img">{assignments.flatMap((assignment) => assignment.employeeCoordinate && assignment.worksite.coordinate ? [{ assignment, from: position(assignment.employeeCoordinate), to: position(assignment.worksite.coordinate) }] : []).map(({ assignment, from, to }) => <line key={assignment.id} className={active?.id === assignment.id ? "selected" : ""} x1={from.x} y1={from.y} x2={to.x} y2={to.y} aria-label={`Static planned association: ${assignment.label}`} />)}</svg> : null}
            <div className="planning-map-markers">{markers.map((marker) => {
              const point = position(marker.coordinate);
              const Icon = marker.kind === "employee" ? UsersRound : marker.kind === "worksite" ? Building2 : Layers;
              const prefix = marker.kind === "employee" ? "Employee" : marker.kind === "worksite" ? "Worksite" : "Employee and worksite";
              const label = `${prefix}: ${marker.names.join(", ")}${marker.assignmentIds.length > 1 ? ` · ${marker.assignmentIds.length} assignments; select to cycle` : ""}`;
              const highlighted = !!active && marker.assignmentIds.includes(active.id);
              return <button type="button" key={marker.id} className={`map-marker ${marker.kind}${highlighted ? " selected" : ""}`} style={{ left: point.x, top: point.y }} aria-label={label} title={label} aria-pressed={highlighted} onClick={() => {
                const index = active ? marker.assignmentIds.indexOf(active.id) : -1;
                selectAssignment(marker.assignmentIds[(index + 1) % marker.assignmentIds.length]);
              }}><Icon size={19} aria-hidden="true" />{marker.assignmentIds.length > 1 ? <span className="map-marker-count" aria-hidden="true">{marker.assignmentIds.length}</span> : null}</button>;
            })}</div>
            {!coordinates.length ? <p className="map-coordinate-empty">No stored coordinates for these assignments. Use the list for planning details.</p> : null}
          </>}
          <p className="planning-map-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">{osmRasterAttribution}</a></p>
        </section>
        <div className="map-stage-footer">
          <div className="map-layer-controls" role="group" aria-label="Map layers">{([ ["employees", "Employees", UsersRound], ["worksites", "Worksites", Building2], ["associations", "Associations", SlidersHorizontal] ] as const).map(([key, label, Icon]) => <button type="button" key={key} aria-pressed={layers[key]} onClick={() => setLayers((value) => ({ ...value, [key]: !value[key] }))}><Icon size={16} aria-hidden="true" />{label}{layers[key] ? <Check size={14} aria-hidden="true" /> : null}</button>)}</div>
          <button type="button" className="button map-touch-toggle" aria-pressed={touchInteraction} onClick={() => { pointers.current.clear(); pinch.current = null; setTouchInteraction((value) => !value); }}>{touchInteraction ? "Lock map to scroll" : "Interact with map"}</button>
        </div>
        <section className="planning-map-legend" aria-label="Map legend"><span><i className="employee" />{projection.role === "ADMIN" ? "Coarse employee areas" : "Employee planning markers"}</span><span><i className="worksite" />Worksites</span>{markers.some((marker) => marker.kind === "shared") ? <span><i className="shared" />Employee and worksite together</span> : null}<span><i className="association" />Planned association, not a route</span></section>
        <details className="map-help"><summary>Map controls and privacy</summary><p id="map-interaction-help">Drag to pan. When the map is focused, use arrow keys to pan, + or − to zoom, and Home to fit all. On touch screens, choose Interact with map to drag or pinch; lock it again to scroll the page. Numbered markers group assignments at the same coordinate; select again to cycle through them.</p><p id="map-provider-notice">Tile requests are made by your browser and may reveal the viewed geographic area; no ScopeIs identifiers or planning data are sent. Employee markers describe stored planning locations. They do not show a person’s current position.</p></details>
      </div>
      <aside className="planning-map-sidebar" aria-label="Assignment planning details">
        {active ? <section className="planning-map-detail" aria-labelledby="selected-assignment-title">
          <div className="map-detail-heading" aria-live="polite"><p className="eyebrow">Selected assignment</p><h3 id="selected-assignment-title">{active.employeeName}</h3><p className="map-assignment-time"><CalendarDays size={16} aria-hidden="true" />{active.startTime}–{active.endTime} <span>Asia/Dubai</span></p></div>
          <dl className="map-assignment-facts"><div><dt>Client</dt><dd>{active.client.name}</dd></div><div><dt>Project</dt><dd>{active.project.name}</dd></div><div><dt>Worksite</dt><dd>{active.worksite.name}</dd></div></dl>
          <div className="map-assignment-signals">{active.coverageGap ? <span className="map-flag attention">Coverage gap</span> : <span className="map-flag">No recorded coverage gap</span>}{active.unavailable ? <span className="map-flag attention"><CalendarOff size={14} aria-hidden="true" />Approved unavailable</span> : null}</div>
          <p className="map-precision"><ShieldCheck size={15} aria-hidden="true" />{precisionLabel(active)}</p>
          {active.employeePrecision === "coarse" ? <p className="map-precision-note">An approximate planning area. Exact employee coordinates are hidden for your role.</p> : null}
          {!active.worksite.coordinate ? <p className="map-precision-note">No worksite coordinate is recorded.</p> : null}
          {active.skills.length ? <div className="map-recorded-skills"><strong>Recorded skills</strong><p>{active.skills.map((skill) => skill.name).join(" · ")}</p></div> : null}
          <div className="map-detail-actions"><Link className="button primary" href={`/coverage?assignment=${encodeURIComponent(active.id)}`}>{active.coverageGap ? "Review coverage" : "View coverage"}<ArrowRight size={16} aria-hidden="true" /></Link><Link className="button" href={`/schedule?month=${projection.selectedDate.slice(0, 7)}&period=${encodeURIComponent(active.schedulePeriodId)}`}>Open schedule<ChevronRight size={16} aria-hidden="true" /></Link></div>
        </section> : null}
        <section className="planning-map-list" id="planning-assignment-list" aria-label="Authorized planning list">
          <div className="map-list-heading"><h3>Published assignments</h3><span className="workflow-count" role="status">{assignments.length} of {projection.assignments.length}</span></div>
          <label className="map-list-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search published assignments</span><input type="search" value={query} placeholder="Employee, project or worksite" onChange={(event) => { setQuery(event.target.value); setCamera(null); }} /></label>
          <div className="map-assignment-results">{assignments.map((assignment) => <button type="button" key={assignment.id} className={active?.id === assignment.id ? "selected" : ""} aria-pressed={active?.id === assignment.id} onClick={() => selectAssignment(assignment.id, true)}><span className="map-list-row-heading"><strong>{assignment.employeeName}</strong><span>{assignment.startTime}–{assignment.endTime}</span></span><span>{assignment.project.name} · {assignment.worksite.name}</span><span className="map-list-status">{assignment.coverageGap ? "Coverage gap · " : ""}{assignment.unavailable ? "Approved unavailable · " : ""}{precisionLabel(assignment)}</span></button>)}</div>
          {!assignments.length ? <div className="map-list-empty"><h4>No matching assignments</h4><p>Try another search or switch back to all assignments.</p><button type="button" className="button" onClick={() => { setQuery(""); setAttentionView("all"); }}>Clear search and view filters</button></div> : null}
        </section>
      </aside>
    </div>
  </div>;
}
