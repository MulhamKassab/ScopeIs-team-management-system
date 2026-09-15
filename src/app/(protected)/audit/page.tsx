import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { AuditDomainError } from "@/modules/audit/domain-error";
import { auditService, type AuditPageView } from "@/modules/audit/service";

export const dynamic = "force-dynamic";

const selectStyle = { display: "block", width: "100%" } as const;

/** Read-only, newest-first audit history. Filters are plain GET parameters so the view is shareable and side-effect free. */
function Filters({ view }: { view: AuditPageView }) {
  const { query, options } = view;
  return <form className="operation-form compact" method="get" aria-label="Audit filters">
    <label>Action<select name="action" defaultValue={query.action ?? ""} style={selectStyle}><option value="">Any action</option>{options.actions.map((action) => <option key={action} value={action}>{action}</option>)}</select></label>
    <label>Target type<select name="targetType" defaultValue={query.targetType ?? ""} style={selectStyle}><option value="">Any target type</option>{options.targetTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
    <label>Actor<select name="actorUserId" defaultValue={query.actorUserId ?? ""} style={selectStyle}><option value="">Any actor</option>{options.actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.displayName}</option>)}</select></label>
    <div className="operation-form-grid">
      <label>From date<input type="date" name="from" defaultValue={query.from ?? ""} /></label>
      <label>To date<input type="date" name="to" defaultValue={query.to ?? ""} /></label>
    </div>
    <button className="button primary" type="submit">Apply filters</button>
    <Link className="button" href="/audit">Clear filters</Link>
  </form>;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "module:audit:view")) notFound();
  const query = await searchParams;
  let view: AuditPageView;
  try { view = await auditService.history(actor, query); }
  catch (error) { if (error instanceof AuditDomainError) notFound(); throw error; }
  const pageHref = (page: number) => { const next = new URLSearchParams(); for (const [key, value] of Object.entries(view.query)) if (value) next.set(key, value); next.set("page", String(page)); return `/audit?${next.toString()}`; };
  return <section className="operations-page">
    <header className="operations-heading"><div><p className="eyebrow">Phase 10 governance</p><h2>Audit history</h2><p>Read-only, newest first, {view.total} event{view.total === 1 ? "" : "s"}. Each action renders only its allowlisted safe metadata; unknown actions show no metadata.</p></div></header>
    <section className="operation-panel"><Filters view={view} /></section>
    <ul className="operation-list audit-list">
      {view.items.map((item) => <li key={item.id}>
        <div>
          <strong>{item.label}</strong>
          <span>{item.occurredAt.slice(0, 19).replace("T", " ")} · {item.actorName ?? "Removed or unknown actor"}{item.actorRole ? ` (${item.actorRole})` : ""} · target {item.targetType}{item.targetId ? ` ${item.targetId}` : ""}</span>
          {item.isRecognizedAction ? <span className="audit-action">{item.action}</span> : <span className="audit-action">Unrecognized action type — no metadata is shown.</span>}
          {item.fields.length ? <dl className="audit-fields">{item.fields.map((field) => <div key={field.key}><dt>{field.key}</dt><dd>{field.value}</dd></div>)}</dl> : null}
        </div>
      </li>)}
    </ul>
    {view.items.length ? null : <p className="operation-empty">No audit event matches these filters.</p>}
    <nav className="notification-pagination" aria-label="Audit pages">
      {view.hasPrevious ? <Link className="button" href={pageHref(view.page - 1)}>Previous</Link> : null}
      <span>Page {view.page} of {view.totalPages}</span>
      {view.hasNext ? <Link className="button" href={pageHref(view.page + 1)}>Next</Link> : null}
    </nav>
  </section>;
}
