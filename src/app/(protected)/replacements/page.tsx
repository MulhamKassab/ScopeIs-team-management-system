import Link from "next/link";
import { schedulingRepository } from "@/modules/scheduling/repositories";
import { db } from "@/db/client";
import { WorkflowFeedback } from "@/shared/components/workflow-feedback";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { coverageService } from "@/modules/coverage/service";
import { CoverageDomainError } from "@/modules/coverage/domain-error";
import { ReplacementDecisionForm } from "@/modules/coverage/forms";
import { DiscussionPanel } from "@/modules/discussions/forms";
import { discussionService } from "@/modules/discussions/service";
import { displayDate } from "@/modules/scheduling/calendar-dates";
import { TaskDialog } from "@/shared/components/task-dialog";

export const dynamic = "force-dynamic";

export default async function ReplacementsPage() {
  const actor = await getCurrentActor(); if (!actor) redirect("/login");
  if (actor.role === "EMPLOYEE") return <section className="operations-page workflow-page"><h2>Replacement requests are management-only</h2><p>Your published work is available in <Link href="/schedule">My Schedule</Link>.</p></section>;
  const requests = await coverageService.mine(actor);
  const people = await schedulingRepository.visibleEmployees(db, actor.role === "SUPER_ADMIN" ? undefined : actor.scopes.filter((scope) => scope.type === "TEAM").map((scope) => scope.reference));
  const participating = await discussionService.listMine(actor);
  const threads = actor.role === "SUPER_ADMIN" ? [] : await Promise.all(participating.threads.map((thread) => discussionService.openThread(actor, thread.requestId)));
  const cards = await Promise.all(requests.map(async (request) => {
    let context: Awaited<ReturnType<typeof coverageService.assignmentContext>> | null = null;
    let candidates: { id: string; displayName: string }[] = [];
    try { context = await coverageService.assignmentContext(actor, request.anchorAssignmentId); if (actor.role === "SUPER_ADMIN" && request.status === "PENDING") candidates = (await coverageService.candidates(actor, request.anchorAssignmentId)).candidates; }
    catch (error) { if (!(error instanceof CoverageDomainError)) throw error; }
    return { request, context, candidates };
  }));
  return <section className="operations-page workflow-page">
    <WorkflowFeedback /><header className="operations-heading"><div><p className="eyebrow">Team planning</p><h2>{actor.role === "SUPER_ADMIN" ? "Cover requests" : "My cover requests"}</h2><p>{actor.role === "SUPER_ADMIN" ? "Review requests waiting for your decision. Approval prepares a Draft; publish it from Timetable to update the working plan." : "Follow the cover requests you created. Super Admin reviews them and publishes any approved changes."}</p></div><Link className="button" href="/schedule">Open timetable</Link></header>
    {cards.length ? <div className="workflow-request-list">{cards.map(({ request, context, candidates }) => <article className="operation-panel workflow-request-card" key={request.id}>
      <div className="schedule-panel-heading"><div><p className="eyebrow">{request.intent === "REPLACE_ASSIGNMENT" ? "Employee replacement" : "Additional coverage"}</p><h3>{context ? request.intent === "REPLACE_ASSIGNMENT" ? `Replace ${context.employeeName}` : `Add support alongside ${context.employeeName}` : "Assignment details unavailable"}</h3></div><span className={`workflow-status ${request.status.toLowerCase()}`}>{request.status === "PENDING" ? "Needs a decision" : request.status === "APPROVED" ? "Draft prepared" : "Declined"}</span></div>
      {context ? <><p><strong>{displayDate(context.assignmentDate)} · {context.startTime.slice(0, 5)}–{context.endTime.slice(0, 5)}</strong> · Asia/Dubai</p><p>{context.clientName} · {context.projectName} · {context.locationName}</p></> : <p>The assignment is unavailable or outside your current access.</p>}
      <p><strong>Proposed person:</strong> {people.find((person) => person.id === request.nominatedEmployeeUserId)?.displayName ?? (request.nominatedEmployeeUserId ? "No longer visible or active — select again during review" : actor.role === "SUPER_ADMIN" ? "Choose when reviewing this request" : "Super Admin will choose")}</p><p>{request.intent === "ADD_COVERAGE_ASSIGNMENT" ? "The original person keeps their assignment; the selected person receives an additional assignment." : "The selected person takes over the original assignment."}</p><p className="workflow-meta">When requested: {request.observedEligibleEmployeeCount} of {request.observedRequiredEmployeeCount} required employees counted.</p>
      {request.status === "APPROVED" ? <p className="operation-success">{request.effectStatus === "PUBLISHED_REVISION_CREATED" ? "A Draft revision was created for publication review." : "The Draft schedule was updated."}</p> : null}
      <div className="workflow-row-actions">{actor.role === "SUPER_ADMIN" && request.status === "PENDING" ? <TaskDialog triggerLabel="Review request" title={context ? `Review request · ${context.employeeName}` : "Review replacement request"} description={context ? `${context.assignmentDate} · ${context.projectName} · ${context.locationName}` : undefined}><ReplacementDecisionForm request={request} candidates={candidates} /></TaskDialog> : null}{context ? <Link className="button" href={`/coverage?assignment=${context.id}`}>Review coverage</Link> : null}</div>
    </article>)}</div> : <section className="workflow-empty workflow-start"><h3>{actor.role === "SUPER_ADMIN" ? "No requests waiting for a decision" : "No replacement requests yet"}</h3><p>To request a replacement or extra support, open an assignment and review its coverage.</p><Link className="button" href="/coverage">Find work needing support</Link></section>}
    {actor.role === "SUPER_ADMIN" && participating.threads.length ? <section className="operation-panel"><h3>Your conversations</h3><p>Open My requests to follow the requests you participate in and exchange messages.</p><Link className="button" href="/requests">Open my requests</Link></section> : null}
    {threads.length ? <section className="operation-panel"><h3>Your conversations</h3><p>Only request participants can view these conversations.</p>{threads.map((thread) => <DiscussionPanel key={thread.requestId} thread={thread} heading={`Discussion · ${thread.intent === "REPLACE_ASSIGNMENT" ? "Replacement" : "Extra support"} · ${thread.status === "PENDING" ? "Awaiting decision" : thread.status === "APPROVED" ? "Approved · Draft prepared" : "Declined"}`} />)}</section> : null}
  </section>;
}
