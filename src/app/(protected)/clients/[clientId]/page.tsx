import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { OperationalDomainError } from "@/modules/operations/domain-error";
import { ClientEditForm, LocationCreateForm, ProjectCreateForm, ScopeManagementPanel, SupportingDetailsPanel } from "@/modules/operations/forms";
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
  return <section className="operations-page"><header className="operations-heading"><div><p className="eyebrow">Client · authorization root</p><h2>{view.client.companyName}</h2><p>Version {view.client.version}. Archived descendants and relationships remain historically traceable.</p></div><Link className="button" href="/clients">Back to Clients</Link></header>
      <div className="operation-columns"><div><ClientEditForm client={view.client} employees={options.employees} /></div><div>{view.client.status === "ACTIVE" ? <><ProjectCreateForm clientId={view.client.id} employees={options.employees} /><LocationCreateForm clientId={view.client.id} /></> : <p className="operation-callout">This Client is archived. Reactivate it before adding normal operational records.</p>}</div></div>
      <section className="operation-panel"><h2>Projects</h2><div className="operation-cards compact">{view.projects.map(({ project }) => <article key={project.id}><span className={`directory-status ${project.status === "ARCHIVED" ? "inactive" : "active"}`}>{project.status}</span><h3>{project.name}</h3><Link className="button primary" href={`/projects/${project.id}`}>Manage Project</Link></article>)}</div></section>
      <section className="operation-panel"><h2>Same-client Locations</h2><p>These are reuse candidates. Choosing a Location for a Project is always a separate deliberate action.</p><div className="operation-cards compact">{view.locations.map(({ location }) => <article key={location.id}><span className={`directory-status ${location.status === "ACTIVE" ? "active" : "inactive"}`}>{location.status}</span><h3>{location.name}</h3><p>{location.address}</p><Link className="button primary" href={`/locations/${location.id}`}>Manage Location</Link></article>)}</div></section>
      <SupportingDetailsPanel target={{ type: "CLIENT", id: view.client.id }} details={view.details} employees={options.employees} skills={options.skills} actorId={actor.id} isSuperAdmin={actor.role === "SUPER_ADMIN"} />
      {actor.role === "SUPER_ADMIN" ? <ScopeManagementPanel target={{ type: "CLIENT", id: view.client.id }} employees={options.employees} grants={grants} /> : null}
  </section>;
}
