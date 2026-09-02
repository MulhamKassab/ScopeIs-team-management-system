import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { OperationalDomainError } from "@/modules/operations/domain-error";
import { LocationEditForm, ScopeManagementPanel, SupportingDetailsPanel } from "@/modules/operations/forms";
import { operationalService } from "@/modules/operations/service";

type Actor = NonNullable<Awaited<ReturnType<typeof getCurrentActor>>>;

async function loadLocationPage(actor: Actor, locationId: string) {
  try {
    return await Promise.all([
      operationalService.getLocationDetail(actor, locationId),
      operationalService.formOptions(actor),
      actor.role === "SUPER_ADMIN" ? operationalService.listOperationalGrants(actor) : Promise.resolve([]),
    ]);
  } catch (error) {
    if (error instanceof OperationalDomainError && ["NOT_FOUND", "OUT_OF_SCOPE", "FORBIDDEN"].includes(error.code)) notFound();
    throw error;
  }
}

export default async function LocationDetailPage({ params }: { params: Promise<{ locationId: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); if (actor.role === "EMPLOYEE") notFound(); const { locationId } = await params;
  const [view, options, grants] = await loadLocationPage(actor, locationId);
  return <section className="operations-page"><header className="operations-heading"><div><p className="eyebrow">Location · {view.client.companyName}</p><h2>{view.location.name}</h2><p>Full address, access instructions, and coordinates are visible only through this server-authorized management projection.</p></div><Link className="button" href="/locations">Back to Locations</Link></header><div className="operation-columns"><LocationEditForm location={view.location} /><section className="operation-panel"><h2>Related Projects</h2><p>Links are same-client and operational only.</p><ul className="operation-list">{view.relatedProjects.map(({ project }) => <li key={project.id}><div><strong>{project.name}</strong><span>{project.status}</span></div></li>)}</ul>{!view.relatedProjects.length ? <p className="operation-empty">No active Project link.</p> : null}</section></div><SupportingDetailsPanel target={{ type: "LOCATION", id: view.location.id }} details={view.details} employees={options.employees} skills={options.skills} actorId={actor.id} isSuperAdmin={actor.role === "SUPER_ADMIN"} />{actor.role === "SUPER_ADMIN" ? <ScopeManagementPanel target={{ type: "LOCATION", id: view.location.id }} employees={options.employees} grants={grants} /> : null}</section>;
}
