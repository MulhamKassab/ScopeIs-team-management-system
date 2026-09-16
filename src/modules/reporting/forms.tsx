"use client";

import Link from "next/link";
import type { DashboardView, ReportColumn, ReportRow, ReportView } from "@/modules/reporting/service";
import { asOfLabel, dashboardIntro, missingSourceLabel, planningBanner, reportIndexIntro, zeroStateNote } from "@/modules/reporting/presentation";

export type ReportIndexEntry = { key: string; label: string; question: string; grain: string; privacy: string; planning: boolean; exportable: boolean };
export type ReportIndexOptions = { clientOptions: { id: string; name: string }[]; projectOptions: { id: string; name: string }[]; locationOptions: { id: string; name: string }[] };

function DataTable({ columns, rows, caption }: { columns: ReportColumn[]; rows: ReportRow[]; caption: string }) {
  if (!rows.length) return <p className="operation-empty">No row matches this view.</p>;
  return <div className="report-table-wrap" tabIndex={0} role="region" aria-label={caption}>
    <table className="report-table">
      <caption>{caption}</caption>
      <thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, index) => <tr key={`${index}-${columns[0]?.key ?? "row"}`}>
          {columns.map((column) => <td key={column.key} data-label={column.label}>{row[column.key] ?? ""}</td>)}
        </tr>)}
      </tbody>
    </table>
  </div>;
}

export function ReportTable({ columns, rows, caption }: { columns: ReportColumn[]; rows: ReportRow[]; caption: string }) { return <DataTable columns={columns} rows={rows} caption={caption} />; }

export function DashboardCards({ view }: { view: DashboardView }) {
  const available = view.cards.filter((card) => !card.unavailable);
  return <section className="reporting-page" aria-labelledby="dashboard-title">
    <header className="operations-heading"><div>
      <p className="eyebrow">Phase 11 operational summary</p>
      <h1 id="dashboard-title">Dashboard</h1>
      <p>{dashboardIntro}</p>
      <p className="reporting-as-of" role="status">{asOfLabel(view.asOf)}</p>
    </div></header>
    <ul className="reporting-cards">
      {available.map((card) => <li key={card.key}>
        <span className="reporting-card-label">{card.label}</span>
        <strong className="reporting-card-value">{card.value}</strong>
        <span className="reporting-card-question">{card.question}</span>
        {card.detail ? <span className="reporting-card-detail">{card.detail}</span> : null}
        {card.href ? <Link className="button" href={card.href}>Open</Link> : null}
      </li>)}
    </ul>
    {view.cards.some((card) => card.unavailable) ? <p className="reporting-missing-source" role="alert">{missingSourceLabel("a required reporting source")}</p> : null}
    {view.sections.map((section) => <section className="operation-panel" key={section.key}>
      <h2>{section.label}</h2>
      <DataTable columns={section.columns} rows={section.rows} caption={section.label} />
    </section>)}
    <ul className="reporting-notes">{view.notes.map((note) => <li key={note}>{note}</li>)}</ul>
    <p className="reporting-zero-note">{zeroStateNote}</p>
  </section>;
}

export function ReportIndex({ entries, options }: { entries: ReportIndexEntry[]; options: ReportIndexOptions }) {
  return <section className="operations-page reporting-page" aria-labelledby="report-index-title">
    <header className="operations-heading"><div>
      <p className="eyebrow">Phase 11 reporting</p>
      <h1 id="report-index-title">Reports</h1>
      <p>{reportIndexIntro}</p>
    </div></header>
    <ul className="reporting-report-list">
      {entries.map((entry) => <li key={entry.key} className={entry.planning ? "planning" : undefined}>
        <div>
          <strong>{entry.label}</strong>
          <span>{entry.question}</span>
          <span className="reporting-grain">Grain: {entry.grain}</span>
          {entry.planning ? <span className="reporting-planning-flag">PLANNING (unpublished)</span> : null}
        </div>
        <Link className="button primary" href={`/reports/${entry.key}`}>Open report</Link>
      </li>)}
    </ul>
    {entries.length ? null : <p className="operation-empty">No report is available for your current role.</p>}
    {options.clientOptions.length || options.projectOptions.length || options.locationOptions.length ? <section className="operation-panel">
      <h2>My authorized filter values</h2>
      <p>These lists contain only entities inside your current scope, so the number of options reveals nothing outside it.</p>
      <ul className="reporting-option-list">
        {options.clientOptions.map((option) => <li key={`client-${option.id}`}>Client · {option.name}</li>)}
        {options.projectOptions.map((option) => <li key={`project-${option.id}`}>Project · {option.name}</li>)}
        {options.locationOptions.map((option) => <li key={`location-${option.id}`}>Location · {option.name}</li>)}
      </ul>
    </section> : null}
  </section>;
}

export function ReportView({ view, filters }: { view: ReportView; filters: { clientOptions: { id: string; name: string }[]; projectOptions: { id: string; name: string }[]; locationOptions: { id: string; name: string }[] } }) {
  const exportable = view.exportable;
  return <section className="operations-page reporting-page" aria-labelledby="report-title">
    <header className="operations-heading"><div>
      <p className="eyebrow">Phase 11 report</p>
      <h1 id="report-title">{view.planning ? view.label.toUpperCase() : view.label}</h1>
      <p>{view.question}</p>
      <p className="reporting-as-of" role="status">{asOfLabel(view.asOf)} · Window {view.windowLabel}</p>
    </div>
    {exportable ? <a className="button primary" href={`/api/reports/${view.key}/export?from=${view.windowFrom}&to=${view.windowTo}`} download>Download CSV</a> : null}
    </header>
    {view.planning ? <p className="reporting-planning-banner" role="status">{planningBanner()}</p> : null}
    {view.unavailable ? <p className="reporting-missing-source" role="alert">{missingSourceLabel("a required reporting source")}</p> : null}
    <form className="operation-search reporting-filters" method="get" aria-label={`${view.label} filters`}>
      <label>From date<input type="date" name="from" defaultValue={view.windowFrom} required /></label>
      <label>To date<input type="date" name="to" defaultValue={view.windowTo} required /></label>
      {view.key === "approved-leave" ? <label>Conflict date<input type="date" name="date" defaultValue={view.conflictDate} /></label> : null}
      {view.key === "approved-leave" || view.key === "published-allocation" || view.key === "planning-unpublished" ? <>
        <label>Window start time<input type="time" name="start" /></label>
        <label>Window end time<input type="time" name="end" /></label>
      </> : null}
      <label>Client<select name="clientId" defaultValue=""><option value="">Any authorized client</option>{filters.clientOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
      <label>Project<select name="projectId" defaultValue=""><option value="">Any authorized project</option>{filters.projectOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
      <label>Location<select name="locationId" defaultValue=""><option value="">Any authorized location</option>{filters.locationOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
      <div className="reporting-filter-actions"><button className="button primary" type="submit">Apply filters</button><Link className="button" href={`/reports/${view.key}`}>Reset</Link></div>
    </form>
    <DataTable columns={view.columns} rows={view.rows} caption={`${view.label} rows`} />
    <nav className="notification-pagination" aria-label="Report pages">
      {view.hasPrevious ? <Link className="button" href={`/reports/${view.key}?page=${view.page - 1}`}>Previous</Link> : null}
      <span>Page {view.page}{view.totalRows === null ? "" : ` of ${Math.max(1, Math.ceil(view.totalRows / view.pageSize))}`}{view.totalRows === null ? "" : ` · ${view.totalRows} row${view.totalRows === 1 ? "" : "s"}`}</span>
      {view.hasNext ? <Link className="button" href={`/reports/${view.key}?page=${view.page + 1}`}>Next</Link> : null}
    </nav>
    <ul className="reporting-notes">{view.notes.map((note) => <li key={note}>{note}</li>)}</ul>
    <p className="reporting-zero-note">{zeroStateNote}</p>
  </section>;
}
