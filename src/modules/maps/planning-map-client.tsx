"use client";
import { displayText } from "@/shared/presentation/display-text";

/* eslint-disable @next/next/no-img-element -- external raster tiles must remain browser-only and bypass server optimization. */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowRight, Building2, CalendarDays, CalendarOff, Check, ChevronRight, Focus, Layers, MapPinned, Minus, Plus, RotateCcw, Search, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";
import type { PlanningProjection } from "@/modules/maps/service";
import { osmRasterAttribution } from "@/modules/maps/map-adapter";
import { fitMapCoordinates, mapPosition, MAX_MAP_ZOOM, MIN_MAP_ZOOM, panMap, visibleMapTiles, zoomMapAt, type MapCamera } from "@/modules/maps/map-projection";
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
  const [showLabels, setShowLabels] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const canvas = useRef<HTMLElement>(null);
  const wheel = useRef({ total: 0, at: 0 });
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
  const place = markers.find((marker) => marker.id === selectedPlace);
  const placeAssignments = place ? assignments.filter((item) => place.assignmentIds.includes(item.id)) : [];

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    function wheelZoom(event: WheelEvent) {
      if (tileFailed || event.ctrlKey || !event.deltaY || (event.target as Element).closest(".planning-map-controls, .planning-map-attribution")) return;
      event.preventDefault();
      const now = performance.now();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.height : 1);
      if (now - wheel.current.at > 250 || Math.sign(delta) !== Math.sign(wheel.current.total)) wheel.current.total = 0;
      wheel.current.total += delta; wheel.current.at = now;
      if (Math.abs(wheel.current.total) < 35) return;
      const bounds = element!.getBoundingClientRect();
      setCamera(zoomMapAt(camera, wheel.current.total > 0 ? -1 : 1, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, viewport));
      wheel.current.total = 0;
    }
    element.addEventListener("wheel", wheelZoom, { passive: false });
    return () => element.removeEventListener("wheel", wheelZoom);
  }, [camera, tileFailed, viewport]);

  function selectAssignment(id: string, focusMap = false) {
    setSelected(id);
    if (focusMap) setSelectedPlace(null);
    const item = projection.assignments.find((item) => item.id === id);
    if (focusMap && item && assignmentCoordinates(item).length) setCamera(fitMapCoordinates(assignmentCoordinates(item), viewport));
  }
  function zoomBy(delta: number) { setCamera((previous) => { const current = previous ?? camera; return { ...current, zoom: Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, current.zoom + delta)) }; }); }
  function move(dx: number, dy: number) { setCamera((previous) => { const current = previous ?? camera; return { ...current, centre: panMap(current.centre, current.zoom, dx, dy) }; }); }
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
    event.currentTarget.dataset.dragging = "true";
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
  function pointerEnd(event: PointerEvent<HTMLElement>) { pointers.current.delete(event.pointerId); pinch.current = null; if (!pointers.current.size) delete event.currentTarget.dataset.dragging; }
  function setAttentionView(value: Attention) { setAttention(value); setCamera(null); setSelectedPlace(null); }

  return <div className="planning-map-client">
    <div className="map-view-toolbar">
      <div className="map-attention-controls" role="group" aria-label="Assignment view">
        <button type="button" aria-label={displayText(`All assignments ${projection.assignments.length}`)} aria-pressed={attention === "all"} onClick={() => setAttentionView("all")}><span className="map-attention-label">All assignments</span><span className="map-attention-compact" aria-hidden="true">All</span><span className="map-attention-count">{projection.assignments.length}</span></button>
        <button type="button" aria-label={displayText(`Needs cover ${gapCount}`)} aria-pressed={attention === "coverage"} onClick={() => setAttentionView("coverage")}><span className="map-attention-label">Needs cover</span><span className="map-attention-compact" aria-hidden="true">Cover</span><span className="map-attention-count">{gapCount}</span></button>
        {projection.role === "SUPER_ADMIN" ? <button type="button" aria-label={displayText(`On leave ${unavailableCount}`)} aria-pressed={attention === "unavailable"} onClick={() => setAttentionView("unavailable")}><span className="map-attention-label">On leave</span><span className="map-attention-compact" aria-hidden="true">Leave</span><span className="map-attention-count">{unavailableCount}</span></button> : null}
      </div>
      <div className="map-fit-controls">
        <button type="button" className="button" aria-pressed={showLabels} onClick={() => setShowLabels((value) => !value)}>Place labels</button>
        <button type="button" className="button" disabled={tileFailed || !coordinates.length} onClick={() => setCamera(null)}><Focus size={17} aria-hidden="true" />Fit all</button>
        <button type="button" className="button" disabled={tileFailed || !active || !assignmentCoordinates(active).length} onClick={() => active && selectAssignment(active.id, true)}><MapPinned size={17} aria-hidden="true" />Focus selected</button>
      </div>
    </div>
    <div className="planning-map-workspace">
      <aside className="planning-map-sidebar" aria-label="Assignment planning details">
        <section className="planning-map-list" id="planning-assignment-list" aria-label="Authorized planning list">
          <div className="map-list-heading"><h3>Who is working where</h3><span className="workflow-count" role="status">{assignments.length} of {projection.assignments.length}</span></div><p className="map-list-intro">Choose a person to highlight their worksite and open the assignment details.</p>
          <label className="map-list-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search published assignments</span><input type="search" value={query} placeholder="Employee, project or worksite" onChange={(event) => { setQuery(event.target.value); setCamera(null); }} /></label>
          <div className="map-assignment-results">{assignments.map((assignment) => <button type="button" key={assignment.id} className={active?.id === assignment.id ? "selected" : ""} aria-pressed={active?.id === assignment.id} onClick={() => selectAssignment(assignment.id, true)}><span className="map-list-row-heading"><strong>{displayText(assignment.employeeName)}</strong><span><bdi dir="ltr">{displayText(assignment.startTime)}–{displayText(assignment.endTime)}</bdi></span></span><span>{displayText(assignment.project.name)} · {displayText(assignment.worksite.name)}</span><span className="map-list-status">{assignment.coverageGap ? "Coverage gap · " : ""}{assignment.unavailable ? "On leave · " : ""}{precisionLabel(assignment)}</span></button>)}</div>
          {!assignments.length ? <div className="map-list-empty"><h4>No matching assignments</h4><p>Try another search or switch back to all assignments.</p><button type="button" className="button" onClick={() => { setQuery(""); setAttentionView("all"); }}>Clear search and view filters</button></div> : null}
        </section>
      </aside>
      <div className="planning-map-stage">
        <section ref={canvas} tabIndex={0} className={`planning-map-canvas${touchInteraction ? " map-touch-active" : ""}${tileFailed ? " map-unavailable" : ""}`} aria-label="Static planning map" onDoubleClick={(event) => { if (!(event.target as Element).closest("button, a") && !tileFailed) { const bounds = event.currentTarget.getBoundingClientRect(); setCamera(zoomMapAt(camera, 1, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }, viewport)); } }} onKeyDown={keyboard} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
          {tileFailed ? <div className="planning-map-tile-failure" role="alert"><MapPinned size={36} aria-hidden="true" /><strong>Map tiles could not be loaded.</strong><span>Your published assignments and planning details are still available.</span><button type="button" className="button" onClick={() => { setTileAttempt((value) => value + 1); setTileFailed(false); }}><RotateCcw size={17} aria-hidden="true" />Retry map</button><a href="#planning-assignment-list">View the assignment list</a></div> : <>
            <div className="planning-map-tiles" style={{ display: "block" }} aria-hidden="true">{tiles.map((tile) => <img key={`${tileAttempt}:${tile.key}`} draggable={false} style={{ position: "absolute", left: tile.left, top: tile.top }} src={`https://tile.openstreetmap.org/${camera.zoom}/${tile.x}/${tile.y}.png`} alt="" onError={() => setTileFailed(true)} />)}</div>
            <div className="map-canvas-status"><span className="map-static-indicator" />Published plan</div>
            <div className="planning-map-controls"><button type="button" onClick={() => zoomBy(1)} disabled={camera.zoom >= MAX_MAP_ZOOM} aria-label="Zoom in"><Plus size={20} aria-hidden="true" /></button><button type="button" onClick={() => zoomBy(-1)} disabled={camera.zoom <= MIN_MAP_ZOOM} aria-label="Zoom out"><Minus size={20} aria-hidden="true" /></button></div>
            {layers.associations && layers.employees && layers.worksites ? <svg className="planning-map-lines" aria-label="Static planned associations" role="img">{assignments.flatMap((assignment) => assignment.employeeCoordinate && assignment.worksite.coordinate ? [{ assignment, from: position(assignment.employeeCoordinate), to: position(assignment.worksite.coordinate) }] : []).map(({ assignment, from, to }) => <line key={assignment.id} className={active?.id === assignment.id ? "selected" : ""} x1={from.x} y1={from.y} x2={to.x} y2={to.y} aria-label={displayText(`Static planned association: ${assignment.label}`)} />)}</svg> : null}
            <div className="planning-map-markers">{markers.map((marker) => {
              const point = position(marker.coordinate);
              const Icon = marker.kind === "employee" ? UsersRound : marker.kind === "worksite" ? Building2 : Layers;
              const prefix = marker.kind === "employee" ? "Employee" : marker.kind === "worksite" ? "Worksite" : "Employee and worksite";
              const label = `${prefix}: ${marker.names.join(", ")}${marker.assignmentIds.length > 1 ? ` · ${marker.assignmentIds.length} assignments; show people` : ""}`;
              const highlighted = !!active && marker.assignmentIds.includes(active.id);
              return <button type="button" key={marker.id} className={`map-marker ${marker.kind}${highlighted ? " selected" : ""}`} style={{ left: point.x, top: point.y }} aria-label={displayText(label)} title={displayText(label)} aria-pressed={highlighted} onClick={() => {
                setSelectedPlace(marker.id);
                if (!active || !marker.assignmentIds.includes(active.id)) selectAssignment(marker.assignmentIds[0]);
              }}><Icon size={19} aria-hidden="true" />{marker.assignmentIds.length > 1 ? <span className="map-marker-count" aria-hidden="true">{marker.assignmentIds.length}</span> : null}{showLabels ? <span className="map-pin-label" aria-hidden="true" style={{ insetInlineStart: "auto", left: point.x < viewport.width / 2 ? 0 : "auto", right: point.x < viewport.width / 2 ? "auto" : 0, transform: "none", maxWidth: Math.max(96, Math.min(190, viewport.width / 2 - 16)) }}>{displayText(marker.names[0])}{displayText(marker.names.length > 1 ? ` +${marker.names.length - 1}` : "")}{marker.kind !== "employee" ? <small>{displayText(assignments.filter((item) => marker.assignmentIds.includes(item.id)).map((item) => item.employeeName).filter((name, index, names) => names.indexOf(name) === index).join(", "))}</small> : null}</span> : null}</button>;
            })}</div>
            {!coordinates.length ? <p className="map-coordinate-empty">No stored coordinates for these assignments. Use the list for planning details.</p> : null}
          </>}

          <p className="planning-map-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">{osmRasterAttribution}</a></p>
        </section>
        {place && placeAssignments.length > 1 ? <section className="map-place-assignments" aria-label="Assignments at selected place"><div><h3>{displayText(place.names.join(" · "))}</h3><span>{placeAssignments.length} assignments at this marker</span></div><div>{placeAssignments.map((item) => <button type="button" className="button" key={item.id} aria-pressed={active?.id === item.id} onClick={() => selectAssignment(item.id)}><strong>{displayText(item.employeeName)}</strong><span><bdi dir="ltr">{displayText(item.startTime)}–{displayText(item.endTime)}</bdi> · {displayText(item.project.name)} · {displayText(item.worksite.name)}</span></button>)}</div></section> : null}
          {active && !tileFailed ? <div className="map-selection-card" aria-label="Map selection"><div><span className="eyebrow"><bdi dir="ltr">{displayText(active.startTime)}–{displayText(active.endTime)}</bdi></span><strong>{displayText(active.employeeName)}</strong><span>{displayText(active.project.name)} · {displayText(active.worksite.name)}</span></div><div className="map-selection-actions"><button type="button" className="button" aria-label="Previous assignment" disabled={assignments.length < 2} onClick={() => selectAssignment(assignments[(assignments.findIndex((item) => item.id === active.id) - 1 + assignments.length) % assignments.length].id, true)}>←</button><button type="button" className="button" aria-label="Next assignment" disabled={assignments.length < 2} onClick={() => selectAssignment(assignments[(assignments.findIndex((item) => item.id === active.id) + 1) % assignments.length].id, true)}>→</button><Link className="button primary" href={`/coverage?assignment=${active.id}#selected-work`}>Request cover</Link></div></div> : null}
        <div className="map-stage-footer">
          <div className="map-layer-controls" role="group" aria-label="Map layers">{([ ["employees", "Employees", UsersRound], ["worksites", "Worksites", Building2], ["associations", "Associations", SlidersHorizontal] ] as const).map(([key, label, Icon]) => <button type="button" key={key} aria-pressed={layers[key]} onClick={() => setLayers((value) => ({ ...value, [key]: !value[key] }))}><Icon size={16} aria-hidden="true" />{label}{layers[key] ? <Check size={14} aria-hidden="true" /> : null}</button>)}</div>
          <button type="button" className="button map-touch-toggle" aria-pressed={touchInteraction} onClick={() => { pointers.current.clear(); pinch.current = null; setTouchInteraction((value) => !value); }}>{touchInteraction ? "Lock map to scroll" : "Interact with map"}</button>
        </div>
        <section className="planning-map-legend" aria-label="Map legend"><span><i className="employee" />{projection.role === "ADMIN" ? "Coarse employee areas" : "Employee planning markers"}</span><span><i className="worksite" />Worksites</span>{markers.some((marker) => marker.kind === "shared") ? <span><i className="shared" />Employee and worksite together</span> : null}<span><i className="association" />Planned association, not a route</span></section>
        {active ? <section className="planning-map-detail" aria-labelledby="selected-assignment-title">
          <div className="map-detail-heading" aria-live="polite"><p className="eyebrow">Selected assignment</p><h3 id="selected-assignment-title">{displayText(active.employeeName)}</h3><p className="map-assignment-time"><CalendarDays size={16} aria-hidden="true" /><bdi dir="ltr">{displayText(active.startTime)}–{displayText(active.endTime)}</bdi> <span>Asia/Dubai</span></p></div>
          <dl className="map-assignment-facts"><div><dt>Client</dt><dd>{displayText(active.client.name)}</dd></div><div><dt>Project</dt><dd>{displayText(active.project.name)}</dd></div><div><dt>Worksite</dt><dd>{displayText(active.worksite.name)}</dd></div></dl>
          <div className="map-assignment-signals">{active.coverageGap ? <span className="map-flag attention">Coverage gap</span> : <span className="map-flag">No recorded coverage gap</span>}{active.unavailable ? <span className="map-flag attention"><CalendarOff size={14} aria-hidden="true" />On leave</span> : null}</div>
          <p className="map-precision"><ShieldCheck size={15} aria-hidden="true" />{precisionLabel(active)}</p>
          {active.employeePrecision === "coarse" ? <p className="map-precision-note">An approximate planning area. Exact employee coordinates are hidden for your role.</p> : null}
          {!active.worksite.coordinate ? <p className="map-precision-note">No worksite coordinate is recorded.</p> : null}
          {active.skills.length ? <div className="map-recorded-skills"><strong>Recorded skills</strong><p>{displayText(active.skills.map((skill) => skill.name).join(" · "))}</p></div> : null}
          <div className="map-detail-actions"><Link className="button primary" href={`/coverage?assignment=${encodeURIComponent(active.id)}`}>{active.coverageGap ? "Review coverage" : "View coverage"}<ArrowRight size={16} aria-hidden="true" /></Link><Link className="button" href={`/schedule?month=${projection.selectedDate.slice(0, 7)}&period=${encodeURIComponent(active.schedulePeriodId)}`}>Open timetable<ChevronRight size={16} aria-hidden="true" /></Link></div>
        </section> : null}

      </div>

    </div>
  </div>;
}
