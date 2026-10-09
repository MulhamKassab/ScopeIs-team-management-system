"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Bell, CalendarDays, CalendarOff, CheckSquare, ChevronLeft, ChevronRight, ClipboardList, Download, FileCheck2, FileText, Layers, MapPinned, ScrollText, SlidersHorizontal, UserRound, Users, type LucideIcon } from "lucide-react";
import { reportFilters } from "@/modules/reporting/definitions";
import type { DashboardCard, DashboardSection, DashboardView, ReportColumn, ReportRow, ReportView } from "@/modules/reporting/service";
import { asOfLabel, dashboardAction, dashboardIntro, metricTitle, missingSourceLabel, planningBanner, reportGroups, reportIndexIntro, reportTitle, zeroStateNote } from "@/modules/reporting/presentation";

export type ReportIndexEntry = { key: string; label: string; question: string; grain: string; privacy: string; planning: boolean; exportable: boolean };
export type ReportIndexOptions = { clientOptions: { id: string; name: string }[]; projectOptions: { id: string; name: string }[]; locationOptions: { id: string; name: string }[] };

const metricIcons: Record<string, LucideIcon> = {
  "pending-leave": CalendarDays, "pending-replacements": ClipboardList, "awaiting-review": FileCheck2,
  "active-employees": Users, "employees-in-scope": Users, "unallocated": Users, "published-periods": CalendarDays,
  "published-assignments": CalendarDays, "approved-leave-days": CalendarDays, "expired-certifications": FileCheck2,
  "my-replacements": ClipboardList, "certifications": FileCheck2, "my-leave": CalendarDays,
  "my-skills": CheckSquare, "my-evidence": FileText, "my-unread": Bell,
};

function DataTable({ columns, rows, caption, emptyState }: { columns: ReportColumn[]; rows: ReportRow[]; caption: string; emptyState?: string }) {
  return <div className="report-table-wrap" tabIndex={0} role="region" aria-label={caption}>
    {rows.length ? <table className={`report-table${columns.length > 4 ? " report-table-wide" : ""}`}>
      <caption>{caption}</caption>
      <thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={`${index}-${columns[0]?.key ?? "row"}`}>
        {columns.map((column) => {
          const value = row[column.key] ?? "";
          const numeric = /^-?\d+(\.\d+)?$/.test(value);
          return <td key={column.key} data-label={column.label} className={numeric ? "report-cell-number" : undefined}>{value}</td>;
        })}
      </tr>)}</tbody>
    </table> : <p className="operation-empty">{emptyState ?? "No row matches this view."}</p>}
  </div>;
}

export function ReportTable({ columns, rows, caption }: { columns: ReportColumn[]; rows: ReportRow[]; caption: string }) { return <DataTable columns={columns} rows={rows} caption={caption} />; }

function DashboardCardGroup({ title, description, cards, role, priority = false }: { title: string; description?: string; cards: DashboardCard[]; role: DashboardView["role"]; priority?: boolean }) {
  if (!cards.length) return null;
  return <section className={`reporting-card-group${priority ? " reporting-card-group-priority" : ""}`} aria-label={title}>
    <div className="reporting-group-heading"><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
    <ul className="reporting-cards">
      {cards.map((card) => {
        const Icon = metricIcons[card.key] ?? Layers;
        const action = dashboardAction(card.key, role);
        return <li key={card.key} data-metric={card.key}>
          <div className="reporting-card-top"><span className="reporting-card-label">{metricTitle(card.key, card.label)}</span><Icon size={20} aria-hidden="true" /></div>
          <strong className="reporting-card-value">{card.value}</strong>
          {card.detail ? <span className="reporting-card-detail">{card.detail}</span> : null}
          {card.href ? <Link className="reporting-text-link" href={card.href} aria-label={`${action}: ${metricTitle(card.key, card.label)}`}>{action}<ArrowRight size={16} aria-hidden="true" /></Link> : null}
        </li>;
      })}
    </ul>
  </section>;
}

function DashboardTable({ section, role, featured = false }: { section: DashboardSection; role: DashboardView["role"]; featured?: boolean }) {
  return <section className={`reporting-section${featured ? " reporting-section-featured" : ""}`}>
    <div className="reporting-section-head"><div><h2>{section.label}</h2><p>{section.question}</p></div>
      {section.href ? <Link className="reporting-text-link" href={section.href}>{dashboardAction(section.key, role)}<ArrowRight size={16} aria-hidden="true" /></Link> : null}
    </div>
    <DataTable columns={section.columns} rows={section.rows} caption={section.label} emptyState={section.emptyState} />
  </section>;
}

function WorkspaceShortcuts({ role }: { role: DashboardView["role"] }) {
  const shortcuts = role === "EMPLOYEE" ? [
    { href: "/schedule", title: "My working day", description: "Your published times and worksites.", Icon: CalendarDays },
    { href: "/leave", title: "Leave & balances", description: "Request time off and follow its status.", Icon: CalendarOff },
    { href: "/profile", title: "My professional profile", description: "Your experience, certifications and CV.", Icon: UserRound },
  ] : [
    { href: "/schedule", title: role === "SUPER_ADMIN" ? "Plan, review, publish" : "View team schedules", description: role === "SUPER_ADMIN" ? "Move a monthly plan from Draft to Published." : "Review schedules within your access. Super Admin prepares and publishes them.", Icon: CalendarDays },
    { href: "/map", title: "See the day on a map", description: "Explore assignments and review coverage.", Icon: MapPinned },
    { href: "/employees", title: "Know your team", description: "Find people, skills and supporting evidence.", Icon: Users },
  ];
  return <nav className="workspace-shortcuts" aria-label="Workspace starting points">{shortcuts.map(({ href, title, description, Icon }) => <Link href={href} key={href}><span className="workspace-shortcut-icon"><Icon size={21} aria-hidden="true" /></span><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={17} aria-hidden="true" /></Link>)}</nav>;
}

export function DashboardCards({ view }: { view: DashboardView }) {
  const cards = view.cards.filter((card) => !card.unavailable);
  const priorityKeys = view.role === "SUPER_ADMIN" ? ["pending-leave", "pending-replacements", "awaiting-review"]
    : view.role === "ADMIN" ? ["my-replacements", "pending-leave"] : ["my-leave", "my-unread"];
  const priorityCards = priorityKeys.flatMap((key) => cards.filter((card) => card.key === key));
  const overviewCards = cards.filter((card) => !priorityKeys.includes(card.key));
  const coreKeys = view.role === "SUPER_ADMIN" ? ["active-employees", "published-periods", "published-assignments"] : ["employees-in-scope", "published-periods", "published-assignments"];
  const coreCards = view.role === "EMPLOYEE" ? overviewCards : overviewCards.filter((card) => coreKeys.includes(card.key));
  const extraCards = overviewCards.filter((card) => !coreCards.includes(card));
  const upcoming = view.role === "EMPLOYEE" ? view.sections.find((section) => section.key === "my-upcoming") : undefined;
  const extraSections = view.sections.filter((section) => section !== upcoming);
  return <section className="reporting-page dashboard-page" aria-labelledby="dashboard-title">
    <header className="operations-heading reporting-page-heading"><div>
      <p className="eyebrow">{view.role === "EMPLOYEE" ? "Your work" : "Team overview"}</p>
      <h1 id="dashboard-title">Home</h1>
      <p>{dashboardIntro(view.role)}</p>
      <p className="reporting-as-of" role="status">{asOfLabel(view.asOf)}</p>
    </div><Link className="button primary" href="/schedule"><CalendarDays size={18} aria-hidden="true" />{view.role === "EMPLOYEE" ? "My timetable" : "Open timetable"}</Link></header>
    {view.cards.some((card) => card.unavailable) ? <p className="reporting-missing-source" role="alert">{missingSourceLabel("a required reporting source")}</p> : null}
    {upcoming ? <DashboardTable section={upcoming} role={view.role} featured /> : null}
    <DashboardCardGroup title={view.role === "SUPER_ADMIN" ? "Ready for review" : view.role === "ADMIN" ? "Requests to follow" : "Your leave and updates"}
      description={view.role === "SUPER_ADMIN" ? "Open a queue to review its requests." : undefined} cards={priorityCards} role={view.role} priority />
    <WorkspaceShortcuts role={view.role} />
    <DashboardCardGroup title={view.role === "EMPLOYEE" ? "Your profile" : "Published plan and team"} cards={coreCards} role={view.role} />
    {extraCards.length || extraSections.length ? <details className="journey-disclosure"><summary>More {view.role === "EMPLOYEE" ? "about your work" : "team insights"}</summary>
      <DashboardCardGroup title="More figures" cards={extraCards} role={view.role} />
      <div className="reporting-dashboard-sections">{extraSections.map((section) => <DashboardTable key={section.key} section={section} role={view.role} />)}</div>
    </details> : null}
    <details className="reporting-explainer"><summary>About these figures</summary><ul className="reporting-notes">{view.notes.map((note) => <li key={note}>{note}</li>)}</ul><p className="reporting-zero-note">{zeroStateNote}</p></details>
  </section>;
}

export function ReportIndex({ entries, options }: { entries: ReportIndexEntry[]; options: ReportIndexOptions }) {
  const [query, setQuery] = useState("");
  const matching = entries.filter((entry) => [entry.label, reportTitle(entry.key, entry.label), entry.question, entry.key].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())));
  const knownKeys = reportGroups.flatMap((group) => [...group.reports]) as string[];
  const groups = [...reportGroups, { key: "other", label: "More reports", description: "Explore other records in your scope.", reports: entries.filter((entry) => !knownKeys.includes(entry.key)).map((entry) => entry.key) }];
  return <section className="operations-page reporting-page" aria-labelledby="report-index-title">
    <header className="operations-heading reporting-page-heading"><div>
      <p className="eyebrow">Team insights</p><h1 id="report-index-title">Reports</h1><p>{reportIndexIntro}</p>
    </div><span className="reporting-header-icon"><ScrollText size={25} aria-hidden="true" /></span></header>
    <label className="journey-search">Find a report<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try hours, leave, skills or plans" /></label>
    <p className="journey-search-count" role="status">{matching.length} report{matching.length === 1 ? "" : "s"}{query.trim() ? " match your search" : " available"}</p>
    {groups.map((group) => {
      const groupEntries = group.reports.flatMap((key) => matching.filter((entry) => entry.key === key));
      return groupEntries.length ? <section className="reporting-index-group" key={group.key} aria-labelledby={`report-group-${group.key}`}>
        <div className="reporting-group-heading"><h2 id={`report-group-${group.key}`}>{group.label}</h2><p>{group.description}</p></div>
        <ul className="reporting-report-list">{groupEntries.map((entry) => <li key={entry.key} className={entry.planning ? "planning" : undefined}>
          <Link className="reporting-report-title" href={`/reports/${entry.key}`}><span>{reportTitle(entry.key, entry.label)}</span><ArrowRight size={18} aria-hidden="true" /></Link>
          <p>{entry.question}</p>
          <div className="reporting-report-meta">{entry.planning ? <span className="reporting-planning-flag">PLANNING (unpublished)</span> : null}<span className="reporting-format">{entry.exportable ? "CSV download" : "View only"}</span></div>
          <details className="reporting-entry-details"><summary>Report details</summary><p>{entry.grain}</p></details>
        </li>)}</ul>
      </section> : null;
    })}
    {matching.length ? null : <p className="operation-empty">{entries.length ? "No report matches your search. Try another topic." : "No report is available for your current role."}</p>}
    {options.clientOptions.length || options.projectOptions.length || options.locationOptions.length ? <details className="reporting-explainer">
      <summary>Clients, projects and locations in your scope</summary>
      <p>Use these options to narrow reports that support them.</p>
      <ul className="reporting-option-list">
        {options.clientOptions.map((option) => <li key={`client-${option.id}`}>Client · {option.name}</li>)}
        {options.projectOptions.map((option) => <li key={`project-${option.id}`}>Project · {option.name}</li>)}
        {options.locationOptions.map((option) => <li key={`location-${option.id}`}>Location · {option.name}</li>)}
      </ul>
    </details> : null}
  </section>;
}

export function ReportView({ view, filters }: { view: ReportView; filters: ReportIndexOptions }) {
  const supported = reportFilters[view.key];
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(view.query)) if (value !== undefined && key !== "page") query.set(key, String(value));
  const pageHref = (page: number) => {
    const selected = new URLSearchParams(query); selected.set("page", String(page));
    return `/reports/${view.key}?${selected}`;
  };
  const hasScopeFilters = supported.some((key) => ["clientId", "projectId", "locationId"].includes(key));
  const hasAuditFilters = supported.includes("action");
  return <section className="operations-page reporting-page" aria-labelledby="report-title">
    <Link className="reporting-back-link" href="/reports"><ArrowLeft size={16} aria-hidden="true" />All reports</Link>
    <header className="operations-heading reporting-page-heading"><div>
      <h1 id="report-title">{reportTitle(view.key, view.label)}</h1><p>{view.question}</p>
      <p className="reporting-as-of" role="status">{asOfLabel(view.asOf)} · {supported.includes("from") ? "Window " : ""}{view.windowLabel}</p>
    </div>{view.exportable ? <a className="button primary" href={`/api/reports/${view.key}/export?${query}`} download><Download size={18} aria-hidden="true" />Download CSV</a> : null}</header>
    {view.planning ? <p className="reporting-planning-banner" role="status">{planningBanner()}</p> : null}
    {view.unavailable ? <p className="reporting-missing-source" role="alert">{missingSourceLabel("a required reporting source")}</p> : null}
    {supported.length ? <form key={query.toString()} className="reporting-filters" method="get" aria-label={`${view.label} filters`}>
      <div className="reporting-filter-heading"><SlidersHorizontal size={18} aria-hidden="true" /><h2>Refine this report</h2><span>Dates and times use Asia/Dubai.</span></div>
      <div className="reporting-filter-groups">
        {supported.includes("from") || supported.includes("to") ? <fieldset><legend>Date range</legend><div className="reporting-filter-fields reporting-filter-date-fields">
          {supported.includes("from") ? <label>From date<input type="date" name="from" defaultValue={view.windowFrom} required /></label> : null}
          {supported.includes("to") ? <label>To date<input type="date" name="to" defaultValue={view.windowTo} required /></label> : null}
        </div></fieldset> : null}
        {hasScopeFilters ? <fieldset><legend>Client, project or location</legend><div className="reporting-filter-fields">
          {supported.includes("clientId") ? <label>Client<select name="clientId" defaultValue={view.query.clientId ?? ""}><option value="">All clients in scope</option>{filters.clientOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label> : null}
          {supported.includes("projectId") ? <label>Project<select name="projectId" defaultValue={view.query.projectId ?? ""}><option value="">All projects in scope</option>{filters.projectOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label> : null}
          {supported.includes("locationId") ? <label>Location<select name="locationId" defaultValue={view.query.locationId ?? ""}><option value="">All locations in scope</option>{filters.locationOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label> : null}
        </div></fieldset> : null}
        {supported.includes("date") ? <fieldset><legend>Check schedule and leave conflicts</legend><div className="reporting-filter-fields">
          <label>Conflict date<input type="date" name="date" defaultValue={view.conflictDate} /></label>
          <label>Window start time<input type="time" name="start" defaultValue={view.query.start} /></label>
          <label>Window end time<input type="time" name="end" defaultValue={view.query.end === "24:00" ? "" : view.query.end} /><small>Blank means the end of the day.</small></label>
        </div></fieldset> : null}
        {hasAuditFilters ? <fieldset><legend>Recorded action</legend><div className="reporting-filter-fields">
          <label>Action<input name="action" defaultValue={view.query.action} maxLength={120} /></label>
          <label>Target type<input name="targetType" defaultValue={view.query.targetType} maxLength={120} /></label>
          <label>Actor ID<input name="actorUserId" defaultValue={view.query.actorUserId} maxLength={160} /></label>
        </div></fieldset> : null}
      </div>
      <div className="reporting-filter-actions"><button className="button primary" type="submit">Apply filters</button><Link className="button" href={`/reports/${view.key}`}>Reset</Link></div>
    </form> : null}
    <div className="reporting-results-heading"><h2>Results{view.totalRows === null ? "" : ` · ${view.totalRows}`}</h2>{view.columns.length > 4 ? <span>Scroll across to see every column.</span> : null}</div>
    <DataTable columns={view.columns} rows={view.rows} caption={`${view.label} rows`} emptyState={view.emptyState} />
    <nav className="notification-pagination reporting-pagination" aria-label="Report pages">
      {view.hasPrevious ? <Link className="button" href={pageHref(view.page - 1)}><ChevronLeft size={16} aria-hidden="true" />Previous</Link> : null}
      <span>Page {view.page}{view.totalRows === null ? "" : ` of ${Math.max(1, Math.ceil(view.totalRows / view.pageSize))}`}</span>
      {view.hasNext ? <Link className="button" href={pageHref(view.page + 1)}>Next<ChevronRight size={16} aria-hidden="true" /></Link> : null}
    </nav>
    <details className="reporting-explainer"><summary>How to read this report</summary><ul className="reporting-notes">{view.notes.map((note) => <li key={note}>{note}</li>)}</ul><p className="reporting-zero-note">{zeroStateNote}</p></details>
  </section>;
}
