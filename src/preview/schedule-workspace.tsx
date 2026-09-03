"use client";

import { useMemo, useState } from "react";
import { clients, employeeFor, locations, projects, type PreviewPersona, type Team, visibleAssignments, visibleEmployees } from "@/preview/preview-data";
import { ScheduleAlternative } from "@/preview/schedule-layout-variants";

type ScheduleState = "All" | "Draft" | "Proposed" | "Published";

const weekStart = new Date("2026-09-14T00:00:00Z");
const states: ScheduleState[] = ["All", "Draft", "Proposed", "Published"];

function displayDate(date: Date) { return date.toISOString().slice(0, 10); }
function dayLabel(date: Date) { return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(date); }
function titleDate(date: Date) { return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date); }

export function ScheduleWorkspace({ persona }: { persona: PreviewPersona }) {
  const [state, setState] = useState<ScheduleState>(persona.role === "EMPLOYEE" ? "Published" : "All");
  const [employeeId, setEmployeeId] = useState("");
  const [team, setTeam] = useState<"" | Team>("");
  const [skill, setSkill] = useState("");
  const [clientId, setClientId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [layout, setLayout] = useState<"1" | "2" | "3">("1");
  const people = visibleEmployees(persona);
  const source = visibleAssignments(persona);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart); date.setUTCDate(date.getUTCDate() + weekOffset * 7 + index); return date;
  }), [weekOffset]);
  const skills = useMemo(() => [...new Set(people.flatMap((person) => person.skills))].sort(), [people]);
  const availableClients = useMemo(() => clients.filter((client) => people.some((person) => person.team === client.team)), [people]);
  const filteredAssignments = useMemo(() => source.filter((assignment) => {
    const employee = employeeFor(assignment.employeeId);
    const project = projects.find((candidate) => candidate.id === assignment.projectId);
    return (!state || state === "All" || assignment.state === state)
      && (!employeeId || assignment.employeeId === employeeId)
      && (!team || employee?.team === team)
      && (!skill || employee?.skills.includes(skill))
      && (!clientId || project?.clientId === clientId)
      && (!locationId || assignment.locationId === locationId);
  }), [source, state, employeeId, team, skill, clientId, locationId]);
  const displayedPeople = useMemo(() => people.filter((person) => {
    const hasMatchingAssignment = (!clientId && !locationId) || filteredAssignments.some((assignment) => assignment.employeeId === person.id);
    return (!employeeId || person.id === employeeId)
      && (!team || person.team === team)
      && (!skill || person.skills.includes(skill))
      && hasMatchingAssignment;
  }), [people, employeeId, team, skill, clientId, locationId, filteredAssignments]);
  const selected = filteredAssignments.find((assignment) => assignment.id === selectedId) ?? filteredAssignments[0];
  const attention = filteredAssignments.filter((assignment) => assignment.warning);
  const resetFilters = () => { setState(persona.role === "EMPLOYEE" ? "Published" : "All"); setEmployeeId(""); setTeam(""); setSkill(""); setClientId(""); setLocationId(""); setWeekOffset(0); setSelectedId(undefined); };

  return <section className="schedule-workspace">
    <header className="schedule-heading"><div><p className="eyebrow">Planning</p><h1>{persona.role === "EMPLOYEE" ? "My schedule" : "Schedule planning"}</h1><p>{persona.role === "EMPLOYEE" ? "Your Published assignments only." : "A read-only fixture planning board. Changes are never stored."}</p></div><div className="schedule-heading-actions"><button className="schedule-control" type="button" onClick={() => setWeekOffset(0)}>Today</button><button className="schedule-control" type="button" aria-label="Previous week" onClick={() => setWeekOffset((value) => value - 1)}>Previous</button><button className="schedule-control" type="button" aria-label="Next week" onClick={() => setWeekOffset((value) => value + 1)}>Next</button></div></header>
    <section className="schedule-toolbar" aria-label="Schedule view controls"><div className="period-control"><strong>{titleDate(weekDays[0])}</strong></div><div className="schedule-states" role="tablist" aria-label="Schedule state">{states.filter((item) => persona.role !== "EMPLOYEE" || item === "Published").map((item) => <button key={item} className={state === item ? "schedule-state selected" : "schedule-state"} role="tab" aria-selected={state === item} onClick={() => setState(item)}>{item}</button>)}</div>{persona.role === "SUPER_ADMIN" ? <div className="schedule-admin-actions"><button className="schedule-control" disabled title="Frontend demonstration only — no change is stored">Return to Draft</button><button className="schedule-publish" disabled title="Frontend demonstration only — no change is stored">Publish schedule</button></div> : null}</section>
    <section className="schedule-layout-tabs" aria-label="Schedule layout alternatives"><button className={layout === "1" ? "selected" : ""} type="button" onClick={() => setLayout("1")}>Schedule 1</button><button className={layout === "2" ? "selected" : ""} type="button" onClick={() => setLayout("2")}>Schedule 2</button><button className={layout === "3" ? "selected" : ""} type="button" onClick={() => setLayout("3")}>Schedule 3</button><p>{layout === "1" ? "Best for detailed employee-by-day planning. Tradeoff: dense horizontal scanning." : layout === "2" ? "Best for duration, workload and overlap. Tradeoff: less request context." : "Best for matching demand to people. Tradeoff: less individual timeline detail."}</p></section>
    <section className="schedule-filters" aria-label="Schedule filters"><label>Employee<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">All</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>{persona.role === "SUPER_ADMIN" ? <label>Team<select value={team} onChange={(event) => setTeam(event.target.value as "" | Team)}><option value="">All teams</option><option value="alpha">Team Alpha</option><option value="bravo">Team Bravo</option></select></label> : null}<label>Skill<select value={skill} onChange={(event) => setSkill(event.target.value)}><option value="">All</option>{skills.map((item) => <option key={item}>{item}</option>)}</select></label><label>Client<select value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">All</option>{availableClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Location<select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">All authorized</option>{locations.filter((location) => people.some((person) => person.team === location.team)).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><button className="filter-clear" type="button" onClick={resetFilters}>Clear</button></section>
    <div className="schedule-alert-row"><span className={attention.length ? "attention-alert" : "attention-alert calm"}>{attention.length ? `Attention: ${attention.length} assignment${attention.length === 1 ? "" : "s"} need attention` : "No visible assignment warnings"}</span><strong>Showing {dayLabel(weekDays[0])} – {dayLabel(weekDays[6])}</strong><span>Use Previous or Next to view another fixture week</span></div>
    {layout === "1" ? <div className="schedule-layout"><div className="schedule-grid-wrap"><table className="schedule-grid"><thead><tr><th scope="col">Employee<span>{displayedPeople.length} visible</span></th>{weekDays.map((date) => <th key={displayDate(date)} scope="col" className={date.getUTCDay() === 0 || date.getUTCDay() === 6 ? "weekend" : ""}>{dayLabel(date)}</th>)}</tr></thead><tbody>{displayedPeople.map((person) => <tr key={person.id}><th scope="row"><span className={`schedule-avatar ${person.team}`}>{person.initials}</span><span><strong>{person.name}</strong><small>{person.designation}</small><small>Team {person.team === "alpha" ? "Alpha" : "Bravo"}</small></span></th>{weekDays.map((date) => { const matching = filteredAssignments.filter((assignment) => assignment.employeeId === person.id && assignment.date === displayDate(date)); return <td key={displayDate(date)} className={date.getUTCDay() === 0 || date.getUTCDay() === 6 ? "weekend" : ""}>{matching.map((assignment) => <button key={assignment.id} className={`assignment-card ${assignment.state.toLowerCase()}${assignment.warning ? " has-warning" : ""}${selected?.id === assignment.id ? " selected" : ""}`} onClick={() => setSelectedId(assignment.id)}><strong>{assignment.time}</strong><span>{projects.find((project) => project.id === assignment.projectId)?.name}</span><small>{assignment.location}</small><em>{assignment.type}</em>{assignment.warning ? <b>Attention</b> : null}</button>)}</td>; })}</tr>)}</tbody></table></div><aside className="assignment-detail" aria-live="polite"><header><h2>Assignment details</h2><span>Read-only</span></header>{selected ? <><div className={selected.warning ? "assignment-warning" : "assignment-warning calm"}><strong>{selected.warning ? "Planning attention" : "Published fixture assignment"}</strong><p>{selected.warning || "This assignment is visible only in the permitted fixture schedule state."}</p></div><dl><div><dt>Employee</dt><dd>{employeeFor(selected.employeeId)?.name}<small>{employeeFor(selected.employeeId)?.designation}</small></dd></div><div><dt>Date</dt><dd>{selected.date}</dd></div><div><dt>Time</dt><dd>{selected.time}</dd></div><div><dt>Client</dt><dd>{clients.find((client) => client.id === projects.find((project) => project.id === selected.projectId)?.clientId)?.name}</dd></div><div><dt>Project</dt><dd>{projects.find((project) => project.id === selected.projectId)?.name}</dd></div><div><dt>Location</dt><dd>{selected.location}</dd></div><div><dt>Arrangement</dt><dd><span className="detail-tag">{selected.type}</span></dd></div></dl><button className="detail-demo-action" disabled title="Frontend demonstration only — no change is stored">Edit assignment</button><div className="detail-secondary-actions"><button disabled>Move</button><button disabled>Duplicate</button><button disabled>Remove</button></div></> : <p className="muted">No assignment matches the selected fixture filters.</p>}</aside></div> : <ScheduleAlternative layout={layout} people={displayedPeople} weekDays={weekDays} assignments={filteredAssignments} selectedId={selected?.id} onSelect={setSelectedId} />}
  </section>;
}
