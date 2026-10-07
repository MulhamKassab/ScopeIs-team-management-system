"use client";

import { useState } from "react";
import Link from "next/link";
import type { TimetableEntry } from "@/modules/scheduling/timetable-service";
import { displayDate } from "@/modules/scheduling/calendar-dates";

/** Filters only the work already projected for this actor by the timetable service. */
export function CoverageWorkPicker({ entries, month, planning }: { entries: TimetableEntry[]; month: string; planning: boolean }) {
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState("");
  const people = [...new Map(entries.map((entry) => [entry.employeeId, entry.employeeName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const search = query.trim().toLowerCase();
  const matching = entries.filter((entry) => (!person || entry.employeeId === person) && (!search || [entry.employeeName, entry.clientName, entry.projectName, entry.locationName, entry.date].some((value) => value.toLowerCase().includes(search))));
  const days = [...new Set(matching.map((entry) => entry.date))].sort();
  return <div>
    <div className="coverage-work-search">
      <label>Search work<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Person, client, project or site" /></label>
      <label>Person<select value={person} onChange={(event) => setPerson(event.target.value)}><option value="">All people</option>{people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    </div>
    <p className="journey-search-count" role="status">{matching.length} assignment{matching.length === 1 ? "" : "s"} across {days.length} day{days.length === 1 ? "" : "s"}</p>
    {days.map((date, index) => <details className="journey-disclosure" key={`${date}-${search}-${person}`} open={index === 0 || Boolean(search || person)}>
      <summary><span>{displayDate(date)}</span><small>{matching.filter((entry) => entry.date === date).length} assignments</small></summary>
      <div className="coverage-day-list">{matching.filter((entry) => entry.date === date).map((entry) => <article className="timetable-entry" key={entry.id}>
        <div className="timetable-entry-top"><strong>{entry.employeeName}</strong><span>{entry.start}–{entry.end}</span></div>
        <h4>{entry.projectName}</h4><p>{entry.clientName} · {entry.locationName}</p>
        {planning ? <span className="schedule-status">{entry.status} · unpublished</span> : null}
        <Link className="button" href={`/coverage?month=${month}&assignment=${entry.id}${planning ? "&mode=planning" : ""}`}>Check cover for {entry.employeeName}</Link>
      </article>)}</div>
    </details>)}
    {!matching.length ? <div className="workflow-empty"><h3>No work matches your search</h3><p>Try a different person or search term.</p><button className="button" onClick={() => { setQuery(""); setPerson(""); }}>Clear search</button></div> : null}
  </div>;
}
