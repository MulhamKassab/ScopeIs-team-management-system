import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { OperationalDomainError } from "@/modules/operations/domain-error";
import { ProjectEditForm, ProjectLocationPanel, ScopeManagementPanel, SupportingDetailsPanel } from "@/modules/operations/forms";
import { RecordDates, RecordStatus } from "@/modules/operations/record-navigation";
import { TaskDialog } from "@/shared/components/task-dialog";
import { operationalService } from "@/modules/operations/service";

type Actor = NonNullable<Awaited<ReturnType<typeof getCurrentActor>>>;

async function loadProjectPage(actor: Actor, projectId: string) {
  try {
    return await Promise.all([
      operationalService.getProjectDetail(actor, projectId),
      operationalService.formOptions(actor),
      actor.role === "SUPER_ADMIN" ? operationalService.listOperationalGrants(actor) : Promise.resolve([]),
      operationalService.listClients(actor, { includeArchived: true }),
    ]);
  } catch (error) {
    if (error instanceof OperationalDomainError && ["NOT_FOUND", "OUT_OF_SCOPE", "FORBIDDEN"].includes(error.code)) notFound();
    throw error;
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); if (actor.role === "EMPLOYEE") notFound(); const { projectId } = await params;
  const [view, options, grants, clients] = await loadProjectPage(actor, projectId);
  const canOpenClient = clients.some((client) => client.id === view.client.id);
  const coordinator = options.employees.find((employee) => employee.id === view.project.responsibleAdminUserId);
  return <section className="operations-page records-workspace">
    <nav className="record-breadcrumbs" aria-label="Breadcrumb"><Link href="/projects">Projects</Link><span aria-hidden="true">/</span>{canOpenClient ? <Link href={`/clients/${view.client.id}`}>{view.client.companyName}</Link> : <span>{view.client.companyName}</span>}<span aria-hidden="true">/</span><span aria-current="page">{view.project.name}</span></nav>
    <header className="operations-heading"><div><p className="eyebrow">Project · {view.client.companyName}</p><h2>{view.project.name}</h2><p>Connect work locations and record what this project needs.</p></div><TaskDialog triggerLabel="Edit project" title="Edit project"><ProjectEditForm project={view.project} employees={options.employees} /></TaskDialog></header>
    <dl className="record-summary"><div><dt>Status</dt><dd><RecordStatus status={view.project.status} /></dd></div><div><dt>Responsible Admin</dt><dd>{coordinator?.displayName ?? "Not assigned"}</dd></div><div><dt>Project dates</dt><dd><RecordDates start={view.project.startDate} end={view.project.endDate} /></dd></div></dl>
    <ProjectLocationPanel projectId={view.project.id} candidates={view.locationMatches} linked={view.linkedLocations} />
    <SupportingDetailsPanel target={{ type: "PROJECT", id: view.project.id }} details={view.details} employees={options.employees} skills={options.skills} actorId={actor.id} isSuperAdmin={actor.role === "SUPER_ADMIN"} />
    {actor.role === "SUPER_ADMIN" ? <ScopeManagementPanel target={{ type: "PROJECT", id: view.project.id }} employees={options.employees} grants={grants} /> : null}
  </section>;
}
