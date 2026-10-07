import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { OperationalDomainError } from "@/modules/operations/domain-error";
import { LocationEditForm, ScopeManagementPanel, SupportingDetailsPanel } from "@/modules/operations/forms";
import { RecordStatus } from "@/modules/operations/record-navigation";
import { TaskDialog } from "@/shared/components/task-dialog";
import { operationalService } from "@/modules/operations/service";

type Actor = NonNullable<Awaited<ReturnType<typeof getCurrentActor>>>;

async function loadLocationPage(actor: Actor, locationId: string) {
  try {
    return await Promise.all([
      operationalService.getLocationDetail(actor, locationId),
      operationalService.formOptions(actor),
      actor.role === "SUPER_ADMIN" ? operationalService.listOperationalGrants(actor) : Promise.resolve([]),
      operationalService.listClients(actor, { includeArchived: true }),
      operationalService.listProjects(actor, { includeArchived: true }),
    ]);
  } catch (error) {
    if (error instanceof OperationalDomainError && ["NOT_FOUND", "OUT_OF_SCOPE", "FORBIDDEN"].includes(error.code)) notFound();
    throw error;
  }
}

export default async function LocationDetailPage({ params }: { params: Promise<{ locationId: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); if (actor.role === "EMPLOYEE") notFound(); const { locationId } = await params;
  const [view, options, grants, clients, projects] = await loadLocationPage(actor, locationId);
  const canOpenClient = clients.some((client) => client.id === view.client.id);
  const projectIds = new Set(projects.map(({ project }) => project.id));
  return <section className="operations-page records-workspace">
    <nav className="record-breadcrumbs" aria-label="Breadcrumb"><Link href="/locations">Locations</Link><span aria-hidden="true">/</span>{canOpenClient ? <Link href={`/clients/${view.client.id}`}>{view.client.companyName}</Link> : <span>{view.client.companyName}</span>}<span aria-hidden="true">/</span><span aria-current="page">{view.location.name}</span></nav>
    <header className="operations-heading"><div><p className="eyebrow">Location · {view.client.companyName}</p><h2>{view.location.name}</h2><p>{view.location.address}</p></div><TaskDialog triggerLabel="Edit location" title="Edit location"><LocationEditForm location={view.location} /></TaskDialog></header>
    <dl className="record-summary"><div><dt>Status</dt><dd><RecordStatus status={view.location.status} /></dd></div><div><dt>Site hours</dt><dd>{view.location.siteHours || "Not recorded"}</dd></div><div><dt>Planning coordinates</dt><dd>{view.location.latitude !== null && view.location.longitude !== null ? `${view.location.latitude}, ${view.location.longitude}` : "Not recorded"}</dd></div></dl>
    <div className="record-related-grid"><section className="operation-panel"><h2>Before a visit</h2><dl className="record-facts"><div><dt>Access instructions</dt><dd>{view.location.accessInstructions || "No access instructions recorded."}</dd></div><div><dt>Visit requirements</dt><dd>{view.location.visitRequirements || "No visit requirements recorded."}</dd></div></dl></section>
      <section className="operation-panel"><h2>Projects using this location <span className="record-count">{view.relatedProjects.length}</span></h2><ul className="operation-list">{view.relatedProjects.map(({ project }) => <li key={project.id}><div>{projectIds.has(project.id) ? <Link className="operation-link" href={`/projects/${project.id}`}>{project.name}</Link> : <strong>{project.name}</strong>}<RecordStatus status={project.status} /></div></li>)}</ul>{!view.relatedProjects.length ? <p className="record-empty">Not linked to a project yet. Open a project for this client and choose Link location.</p> : null}</section>
    </div>
    <SupportingDetailsPanel target={{ type: "LOCATION", id: view.location.id }} details={view.details} employees={options.employees} skills={options.skills} actorId={actor.id} isSuperAdmin={actor.role === "SUPER_ADMIN"} />
    {actor.role === "SUPER_ADMIN" ? <ScopeManagementPanel target={{ type: "LOCATION", id: view.location.id }} employees={options.employees} grants={grants} /> : null}
  </section>;
}
