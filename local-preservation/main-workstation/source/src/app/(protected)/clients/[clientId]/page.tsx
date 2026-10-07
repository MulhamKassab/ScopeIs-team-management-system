import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { OperationalDomainError } from "@/modules/operations/domain-error";
import { ClientEditForm, LocationCreateForm, ProjectCreateForm, ScopeManagementPanel, SupportingDetailsPanel } from "@/modules/operations/forms";
import { RecordDates, RecordStatus } from "@/modules/operations/record-navigation";
import { TaskDialog } from "@/shared/components/task-dialog";
import { operationalService } from "@/modules/operations/service";

type Actor = NonNullable<Awaited<ReturnType<typeof getCurrentActor>>>;

async function loadClientPage(actor: Actor, clientId: string) {
  try {
    return await Promise.all([
      operationalService.getClientDetail(actor, clientId),
      operationalService.formOptions(actor),
      actor.role === "SUPER_ADMIN" ? operationalService.listOperationalGrants(actor) : Promise.resolve([]),
    ]);
  } catch (error) {
    if (error instanceof OperationalDomainError && ["NOT_FOUND", "OUT_OF_SCOPE", "FORBIDDEN"].includes(error.code)) notFound();
    throw error;
  }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); if (actor.role === "EMPLOYEE") notFound(); const { clientId } = await params;
  const [view, options, grants] = await loadClientPage(actor, clientId);
  const manager = options.employees.find((employee) => employee.id === view.client.accountManagerUserId);
  return <section className="operations-page records-workspace">
    <nav className="record-breadcrumbs" aria-label="Breadcrumb"><Link href="/clients">Clients</Link><span aria-hidden="true">/</span><span aria-current="page">{view.client.companyName}</span></nav>
    <header className="operations-heading"><div><p className="eyebrow">Client</p><h2>{view.client.companyName}</h2><p>{view.client.serviceSummary || "Manage this client’s projects, work locations and contacts."}</p></div><TaskDialog triggerLabel="Edit client" title="Edit client"><ClientEditForm client={view.client} employees={options.employees} /></TaskDialog></header>
    <dl className="record-summary"><div><dt>Status</dt><dd><RecordStatus status={view.client.status} /></dd></div><div><dt>Account manager</dt><dd>{manager?.displayName ?? "Not assigned"}</dd></div><div><dt>Service dates</dt><dd><RecordDates start={view.client.serviceStartDate} end={view.client.serviceEndDate} /></dd></div></dl>
    {view.client.status === "ARCHIVED" ? <p className="operation-callout">This client is archived. Open Edit client to reactivate it before adding projects or locations.</p> : null}
    <div className="record-related-grid">
      <section className="operation-panel"><header className="record-panel-heading"><div><h2>Projects <span className="record-count">{view.projects.length}</span></h2><p>Choose a project to manage its work locations and requirements.</p></div>{view.client.status === "ACTIVE" ? <TaskDialog triggerLabel="Create project" title="Create project" description={`For ${view.client.companyName}`}><ProjectCreateForm clientId={view.client.id} employees={options.employees} /></TaskDialog> : null}</header>
        <div className="operation-cards compact">{view.projects.map(({ project }) => <article key={project.id}><RecordStatus status={project.status} /><h3>{project.name}</h3><Link className="button" href={`/projects/${project.id}`}>Open project</Link></article>)}</div>
        {!view.projects.length ? <p className="record-empty">No projects yet. Create the first project to organise this client’s work.</p> : null}
      </section>
      <section className="operation-panel"><header className="record-panel-heading"><div><h2>Locations <span className="record-count">{view.locations.length}</span></h2><p>Link these locations from a project when you are ready to use them.</p></div>{view.client.status === "ACTIVE" ? <TaskDialog triggerLabel="Create location" title="Create location" description={`For ${view.client.companyName}. Check the existing locations first to avoid duplicates.`}><LocationCreateForm clientId={view.client.id} /></TaskDialog> : null}</header>
        <div className="operation-cards compact">{view.locations.map(({ location }) => <article key={location.id}><RecordStatus status={location.status} /><h3>{location.name}</h3><p>{location.address}</p><Link className="button" href={`/locations/${location.id}`}>Open location</Link></article>)}</div>
        {!view.locations.length ? <p className="record-empty">No locations yet. Add a worksite address, then link it to a project.</p> : null}
      </section>
    </div>
    <SupportingDetailsPanel target={{ type: "CLIENT", id: view.client.id }} details={view.details} employees={options.employees} skills={options.skills} actorId={actor.id} isSuperAdmin={actor.role === "SUPER_ADMIN"} />
    {actor.role === "SUPER_ADMIN" ? <ScopeManagementPanel target={{ type: "CLIENT", id: view.client.id }} employees={options.employees} grants={grants} /> : null}
  </section>;
}
