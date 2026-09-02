import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { ClientCreateForm } from "@/modules/operations/forms";
import { operationalService } from "@/modules/operations/service";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ query?: string; archived?: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); if (actor.role === "EMPLOYEE") notFound(); const params = await searchParams;
  const [records, options] = await Promise.all([operationalService.listClients(actor, { query: params.query ?? "", includeArchived: params.archived === "true" }), operationalService.formOptions(actor)]);
  return <section className="operations-page"><header className="operations-heading"><div><p className="eyebrow">Phase 3 operational structure</p><h2>Clients</h2><p>Clients are authorization roots. Coordination and employee relationships never grant access or create schedule assignments.</p></div><div className="operation-heading-links"><Link className="button" href="/projects">Projects</Link><Link className="button" href="/locations">Locations</Link></div></header>
    <form className="operation-search" method="get"><label>Search company name<input name="query" defaultValue={params.query ?? ""} maxLength={100} /></label><label className="operation-check"><input type="checkbox" name="archived" value="true" defaultChecked={params.archived === "true"} /> Include archived</label><button className="button primary">Search</button></form>
    {actor.role === "SUPER_ADMIN" ? <ClientCreateForm employees={options.employees} /> : <p className="operation-callout">Only Super Admin creates a Client. Your explicit Client scope controls which authorization roots appear here.</p>}
    <div className="operation-cards">{records.map((client) => <article key={client.id}><span className={`directory-status ${client.status === "ACTIVE" ? "active" : "inactive"}`}>{client.status}</span><h3>{client.companyName}</h3><p>{client.serviceSummary || "No service summary"}</p><Link className="button primary" href={`/clients/${client.id}`}>Manage Client</Link></article>)}</div>
    {!records.length ? <div className="operation-empty"><h3>No authorized Clients</h3><p>No record matches the current search and explicit operational scope.</p></div> : null}
  </section>;
}
