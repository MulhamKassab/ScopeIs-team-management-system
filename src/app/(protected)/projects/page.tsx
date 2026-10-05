import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { CreateProjectForClient } from "@/modules/operations/forms";
import { RecordDates, RecordNavigation, RecordStatus } from "@/modules/operations/record-navigation";
import { operationalService } from "@/modules/operations/service";
import { TaskDialog } from "@/shared/components/task-dialog";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ query?: string; archived?: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login"); if (actor.role === "EMPLOYEE") notFound();
  const params = await searchParams;
  const [records, clients, options] = await Promise.all([operationalService.listProjects(actor, { query: params.query ?? "", includeArchived: params.archived === "true" }), operationalService.listClients(actor), operationalService.formOptions(actor)]);
  const filtered = Boolean(params.query || params.archived === "true");
  return <section className="operations-page records-workspace">
    <header className="operations-heading"><div><p className="eyebrow">Client workspace</p><h2>Projects</h2><p>Organise the work, set its dates and connect the locations your team will use.</p></div>{clients.length ? <TaskDialog triggerLabel="Create project" title="Create project" description="Choose the client this project belongs to."><CreateProjectForClient clients={clients} employees={options.employees} /></TaskDialog> : null}</header>
    <RecordNavigation current="projects" />
    <form className="operation-search" method="get"><label>Search projects<input name="query" placeholder="Project name" defaultValue={params.query ?? ""} maxLength={100} /></label><label className="operation-check"><input type="checkbox" name="archived" value="true" defaultChecked={params.archived === "true"} /> Include archived</label><button className="button primary">Search</button></form>
    <div className="record-result-heading"><p>{records.length} {records.length === 1 ? "project" : "projects"}{filtered ? " found" : " in your workspace"}</p>{filtered ? <Link href="/projects">Clear filters</Link> : null}</div>
    {records.length ? <div className="operation-cards">{records.map(({ project, clientName }) => <article key={project.id}><RecordStatus status={project.status} /><h3>{project.name}</h3><p>{clientName}</p><p className="record-card-meta"><RecordDates start={project.startDate} end={project.endDate} /></p><Link className="button" href={`/projects/${project.id}`}>Open project</Link></article>)}</div> : <div className="operation-empty"><h3>{filtered ? "No projects match your search" : "No projects yet"}</h3><p>{filtered ? "Try another project name or clear the filters." : clients.length ? "Create a project, then link a work location to prepare it for scheduling." : "You need access to an active client to create a project. Ask your Super Admin to help."}</p></div>}
  </section>;
}
