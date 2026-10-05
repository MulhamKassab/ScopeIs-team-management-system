import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, MapPinned, SlidersHorizontal, UsersRound, Building2 } from "lucide-react";
import { getCurrentActor } from "@/modules/auth/session-service";
import { PlanningMapClient } from "@/modules/maps/planning-map-client";
import { planningMapService } from "@/modules/maps/service";
import { dubaiToday, mapQuerySchema } from "@/modules/maps/validation";

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? undefined : value;

export default async function PlanningMapPage({ searchParams }: { searchParams: Promise<Params> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.role === "EMPLOYEE") notFound();
  const raw = await searchParams;
  const query = { date: one(raw.date) ?? dubaiToday(), employeeId: one(raw.employeeId), skillId: one(raw.skillId), clientId: one(raw.clientId), projectId: one(raw.projectId), locationId: one(raw.locationId), unavailable: one(raw.unavailable), coverageGap: one(raw.coverageGap) };
  const projection = await planningMapService.projection(actor, query);
  const validDate = mapQuerySchema.shape.date.safeParse(projection.selectedDate).success;
  const selectedDate = validDate ? projection.selectedDate : dubaiToday();
  const filterNames = ["employeeId", "skillId", "clientId", "projectId", "locationId", "unavailable", "coverageGap"] as const;
  const activeFilters = filterNames.filter((name) => query[name] && query[name] !== "false");
  function dateHref(date: string) {
    const params = new URLSearchParams({ date });
    for (const name of activeFilters) params.set(name, query[name]!);
    return `/map?${params}`;
  }
  function adjacentDate(delta: number) {
    const date = new Date(`${selectedDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
  }
  const publication = projection.lastPublishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date(projection.lastPublishedAt)) : null;
  const viewKey = JSON.stringify(query);

  return <section className="planning-map-page" aria-labelledby="planning-map-title">
    <header className="map-page-heading"><div><p className="eyebrow">Management planning</p><h1 id="planning-map-title">Planning map</h1><p>See the day’s assignments together. Find a person, focus a worksite, and review what needs attention.</p></div><Link className="button" aria-label="Open schedule" href={`/schedule?month=${selectedDate.slice(0, 7)}`}><CalendarDays size={18} aria-hidden="true" /><span>Open schedule</span></Link></header>
    <p className="planning-map-disclaimer">Planning status for {projection.selectedDate} — based on the Published schedule, not live tracking.</p>
    <div className="map-date-toolbar">
      <nav className="map-date-navigation" aria-label="Planning map date navigation"><Link className="icon-button" href={dateHref(adjacentDate(-1))} aria-label="Previous planning day"><ChevronLeft size={19} aria-hidden="true" /></Link><form action="/map" className="map-date-form" aria-label="Planning date"><label>Date (Asia/Dubai)<input name="date" type="date" defaultValue={selectedDate} key={selectedDate} required /></label>{activeFilters.map((name) => <input key={name} type="hidden" name={name} value={query[name]} />)}<button type="submit" className="button">Go</button></form><Link className="icon-button" href={dateHref(adjacentDate(1))} aria-label="Next planning day"><ChevronRight size={19} aria-hidden="true" /></Link><Link className="button map-today" href={dateHref(dubaiToday())}>Today</Link></nav>
      <details className="map-filter-disclosure" key={viewKey} open={activeFilters.length > 0}><summary><SlidersHorizontal size={17} aria-hidden="true" />Filters{activeFilters.length ? <span className="workflow-count">{activeFilters.length} active</span> : null}</summary><form className="planning-map-filters" action="/map" aria-label="Planning map filters"><input name="date" type="hidden" value={selectedDate} />{([ ["employeeId", "Employee", projection.filterOptions.employees], ["skillId", "Skill", projection.filterOptions.skills], ["clientId", "Client", projection.filterOptions.clients], ["projectId", "Project", projection.filterOptions.projects], ["locationId", "Location", projection.filterOptions.locations] ] as const).map(([name, label, options]) => <label key={name}>{label}<select name={name} defaultValue={one(raw[name]) ?? ""}><option value="">All authorized</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>)}<div className="map-filter-flags"><label className="operation-check"><input type="checkbox" name="unavailable" value="true" defaultChecked={one(raw.unavailable) === "true"} />Approved unavailable</label><label className="operation-check"><input type="checkbox" name="coverageGap" value="true" defaultChecked={one(raw.coverageGap) === "true"} />Coverage gap</label></div><div className="map-filter-actions"><button type="submit" className="button primary">Apply filters</button><Link className="button" href={`/map?date=${selectedDate}`}>Reset</Link></div></form></details>
    </div>
    {projection.invalidFilter ? <p className="operation-error" role="alert">That filter is unavailable for your authorized planning projection. Clear the filters or choose a valid date.</p> : null}
    <div className="map-view-summary" aria-label="Published planning summary"><span><MapPinned size={17} aria-hidden="true" /><strong>{projection.assignments.length}</strong> Published assignment{projection.assignments.length === 1 ? "" : "s"}</span><span><UsersRound size={17} aria-hidden="true" /><strong>{new Set(projection.assignments.map((item) => item.employeeId)).size}</strong> employees</span><span><Building2 size={17} aria-hidden="true" /><strong>{new Set(projection.assignments.map((item) => item.worksite.id)).size}</strong> worksites</span><p className="planning-map-meta">{publication ? `Published ${publication} · Asia/Dubai` : "No relevant publication"}</p></div>
    {projection.noCoordinateCount ? <p className="map-coordinate-note">{projection.noCoordinateCount} employee marker{projection.noCoordinateCount === 1 ? " is" : "s are"} omitted because no approved coordinate is stored. Those assignments remain in the list.</p> : null}
    {projection.assignments.length ? <PlanningMapClient key={viewKey} projection={projection} /> : <section className="operation-empty map-empty"><MapPinned size={34} aria-hidden="true" /><h2>No published assignments for this view</h2><p>Try another date or clear a filter. Only published assignments appear on the map.</p><div><Link className="button primary" href={`/schedule?month=${selectedDate.slice(0, 7)}`}>Open this month’s schedule</Link>{activeFilters.length ? <Link className="button" href={`/map?date=${selectedDate}`}>Clear filters</Link> : null}</div></section>}
  </section>;
}
