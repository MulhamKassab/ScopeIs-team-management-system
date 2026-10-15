import { displayText } from "@/shared/presentation/display-text";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { employeeCatalogueService } from "@/modules/employees/employee-services";
import { ArrangementForm } from "@/modules/employees/arrangement-forms";
import { TaskDialog } from "@/shared/components/task-dialog";

export default async function ArrangementsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); if (actor.role !== "SUPER_ADMIN") notFound();
  const raw = Number((await searchParams).page); const page = Number.isSafeInteger(raw) && raw > 0 && raw <= 10000 ? raw : 1;
  const labels = await employeeCatalogueService.listArrangementLabels(actor, { page, includeArchived: true });
  return <section className="operations-page"><header className="operations-heading"><div><p className="eyebrow">People management</p><h1>Assignment labels</h1><p>Manage descriptive arrangements separately from system roles and actual work assignments.</p></div><TaskDialog triggerLabel="New label" title="Create assignment label"><ArrangementForm /></TaskDialog></header>
    <div className="catalogue-grid">{labels.items.map((record) => <article className="operation-panel" key={record.id}><h2>{displayText(record.name)}</h2><p>{record.active ? "Active" : "Archived"} · Order {record.sortOrder} · Colour {displayText(record.color)}</p><div className="workflow-row-actions"><TaskDialog triggerLabel={displayText(`Edit ${record.name}`)} triggerText="Edit" title={displayText(`Edit ${record.name}`)} triggerClassName="button"><ArrangementForm record={record} /></TaskDialog><TaskDialog triggerLabel={displayText(`${record.active ? "Archive" : "Reactivate"} ${record.name}`)} triggerText={record.active ? "Archive" : "Reactivate"} title={displayText(`${record.active ? "Archive" : "Reactivate"} label`)} triggerClassName="button"><ArrangementForm record={record} lifecycle /></TaskDialog></div></article>)}</div>
    {!labels.total ? <p className="operation-empty">No assignment labels yet. Create the first descriptive label.</p> : null}<nav className="notification-pagination" aria-label="Assignment label pages">{page > 1 ? <Link className="button" href={`/arrangements?page=${page - 1}`}>Previous</Link> : null}<span>Page {page} · {labels.total} labels</span>{page * labels.pageSize < labels.total ? <Link className="button" href={`/arrangements?page=${page + 1}`}>Next</Link> : null}</nav>
  </section>;
}
