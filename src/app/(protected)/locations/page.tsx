import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { CreateLocationForClient } from "@/modules/operations/forms";
import { RecordNavigation, RecordStatus } from "@/modules/operations/record-navigation";
import { operationalService } from "@/modules/operations/service";
import { TaskDialog } from "@/shared/components/task-dialog";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ query?: string; archived?: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); if (actor.role === "EMPLOYEE") notFound();
  const params = await searchParams;
  const [records, clients] = await Promise.all([operationalService.listLocations(actor, { query: params.query ?? "", includeArchived: params.archived === "true" }), operationalService.listClients(actor)]);
  const filtered = Boolean(params.query || params.archived === "true");
  return <section className="operations-page records-workspace">
    <header className="operations-heading"><div><p className="eyebrow">Client workspace</p><h2>Locations</h2><p>Keep worksite addresses, access instructions and visit details ready for your team.</p></div>{clients.length ? <TaskDialog triggerLabel="Create location" title="Create location" description="A location can be shared by several projects for the same client."><CreateLocationForClient clients={clients} /></TaskDialog> : null}</header>
    <RecordNavigation current="locations" />
    <form className="operation-search" method="get"><label>Search locations<input name="query" placeholder="Location name or address" defaultValue={params.query ?? ""} maxLength={100} /></label><label className="operation-check"><input type="checkbox" name="archived" value="true" defaultChecked={params.archived === "true"} /> Include archived</label><button className="button primary">Search</button></form>
    <div className="record-result-heading"><p>{records.length} {records.length === 1 ? "location" : "locations"}{filtered ? " found" : " in your workspace"}</p>{filtered ? <Link href="/locations">Clear filters</Link> : null}</div>
    {records.length ? <div className="operation-cards">{records.map(({ location, clientName }) => <article key={location.id}><RecordStatus status={location.status} /><h3>{location.name}</h3><p>{clientName}</p><p className="record-card-meta">{location.address}</p><Link className="button" href={`/locations/${location.id}`}>Open location</Link></article>)}</div> : <div className="operation-empty"><h3>{filtered ? "No locations match your search" : "No locations yet"}</h3><p>{filtered ? "Try another name or address, or clear the filters." : clients.length ? "Create a work location, then link it to the projects that use it." : "You need access to an active client to create a location. Ask your Super Admin to help."}</p></div>}
  </section>;
}
