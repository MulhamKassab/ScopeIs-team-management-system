import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { OperationalDomainError } from "@/modules/operations/domain-error";
import { ProjectEditForm, ProjectLocationPanel, ScopeManagementPanel, SupportingDetailsPanel } from "@/modules/operations/forms";
import { operationalService } from "@/modules/operations/service";

type Actor = NonNullable<Awaited<ReturnType<typeof getCurrentActor>>>;

async function loadProjectPage(actor: Actor, projectId: string) {
  try {
    return await Promise.all([
      operationalService.getProjectDetail(actor, projectId),
      operationalService.formOptions(actor),
      actor.role === "SUPER_ADMIN" ? operationalService.listOperationalGrants(actor) : Promise.resolve([]),
    ]);
  } catch (error) {
    if (error instanceof OperationalDomainError && ["NOT_FOUND", "OUT_OF_SCOPE", "FORBIDDEN"].includes(error.code)) notFound();
    throw error;
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); if (actor.role === "EMPLOYEE") notFound(); const { projectId } = await params;
  const [view, options, grants] = await loadProjectPage(actor, projectId);
  return <section className="operations-page"><header className="operations-heading"><div><p className="eyebrow">Project · {view.client.companyName}</p><h2>{view.project.name}</h2><p>Responsible Admin is coordination only. Project scope grants no Client or sibling authority.</p></div><Link className="button" href="/projects">Back to Projects</Link></header><div className="operation-columns"><ProjectEditForm project={view.project} employees={options.employees} /><ProjectLocationPanel projectId={view.project.id} candidates={view.locationMatches} linked={view.linkedLocations} /></div><SupportingDetailsPanel target={{ type: "PROJECT", id: view.project.id }} details={view.details} employees={options.employees} skills={options.skills} actorId={actor.id} isSuperAdmin={actor.role === "SUPER_ADMIN"} />{actor.role === "SUPER_ADMIN" ? <ScopeManagementPanel target={{ type: "PROJECT", id: view.project.id }} employees={options.employees} grants={grants} /> : null}</section>;
}
