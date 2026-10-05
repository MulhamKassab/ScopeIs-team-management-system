import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { ClientCreateForm } from "@/modules/operations/forms";
import { RecordNavigation, RecordStatus } from "@/modules/operations/record-navigation";
import { operationalService } from "@/modules/operations/service";
import { TaskDialog } from "@/shared/components/task-dialog";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ query?: string; archived?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.role === "EMPLOYEE") notFound();
  const params = await searchParams;
  const [records, options] = await Promise.all([
    operationalService.listClients(actor, { query: params.query ?? "", includeArchived: params.archived === "true" }),
    operationalService.formOptions(actor),
  ]);
  const filtered = Boolean(params.query || params.archived === "true");
  return <section className="operations-page records-workspace">
    <header className="operations-heading"><div><p className="eyebrow">Client workspace</p><h2>Clients</h2><p>Keep each client’s projects, work locations and contacts together.</p></div>
      {actor.role === "SUPER_ADMIN" ? <TaskDialog triggerLabel="Create client" title="Create client" description="Start with the company name. You can add projects and work locations next."><ClientCreateForm employees={options.employees} /></TaskDialog> : null}
    </header>
    <RecordNavigation current="clients" />
    <form className="operation-search" method="get"><label>Search clients<input name="query" placeholder="Company name" defaultValue={params.query ?? ""} maxLength={100} /></label><label className="operation-check"><input type="checkbox" name="archived" value="true" defaultChecked={params.archived === "true"} /> Include archived</label><button className="button primary">Search</button></form>
    <div className="record-result-heading"><p>{records.length} {records.length === 1 ? "client" : "clients"}{filtered ? " found" : " in your workspace"}</p>{filtered ? <Link href="/clients">Clear filters</Link> : null}</div>
    {records.length ? <div className="operation-cards">{records.map((client) => <article key={client.id}><RecordStatus status={client.status} /><h3>{client.companyName}</h3><p>{client.serviceSummary || "Add a service summary to help your team understand this client."}</p><Link className="button" href={`/clients/${client.id}`}>Open client</Link></article>)}</div> : <div className="operation-empty"><h3>{filtered ? "No clients match your search" : "No clients yet"}</h3><p>{filtered ? "Try another company name or clear the filters." : actor.role === "SUPER_ADMIN" ? "Create a client to start organising projects and work locations." : "Clients appear here when a Super Admin gives you access."}</p></div>}
  </section>;
}
