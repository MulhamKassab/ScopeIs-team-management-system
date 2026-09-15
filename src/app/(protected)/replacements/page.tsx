import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { coverageService } from "@/modules/coverage/service";
import { ReplacementDecisionForm } from "@/modules/coverage/forms";
import { DiscussionPanel } from "@/modules/discussions/forms";
import { discussionService } from "@/modules/discussions/service";

export const dynamic = "force-dynamic";

export default async function ReplacementsPage() {
  const actor = await getCurrentActor(); if (!actor) redirect("/login");
  if (actor.role === "EMPLOYEE") return <section className="operations-page"><h2>Replacement requests are management-only</h2><p>Employees receive assignment information only when a normal Published schedule change notifies them.</p></section>;
  const requests = await coverageService.mine(actor);
  // Phase 10 discussions: only the requests this actor actually participates in, re-authorized on read.
  const participating = await discussionService.listMine(actor);
  const threads = await Promise.all(participating.threads.map((thread) => discussionService.openThread(actor, thread.requestId)));
  return <section className="operations-page">
    <header className="operations-heading"><div><p className="eyebrow">Phase 7 replacement workflow</p><h2>{actor.role === "SUPER_ADMIN" ? "Pending replacement decisions" : "My replacement requests"}</h2><p>Approval applies an editable schedule effect only. It never changes Published assignments in place or auto-publishes.</p></div></header>
    <section className="operation-panel"><div className="operation-list">{requests.length ? await Promise.all(requests.map(async (request) => { let candidates: { id: string; displayName: string }[] = []; if (actor.role === "SUPER_ADMIN" && request.status === "PENDING") { try { candidates = (await coverageService.candidates(actor, request.anchorAssignmentId)).candidates; } catch {} } return <article key={request.id}><div><strong>{request.intent === "REPLACE_ASSIGNMENT" ? "Replace assignment employee" : "Add coverage assignment"}</strong><span>{request.status} · schedule effect {request.effectStatus} · requested count {request.observedRequiredEmployeeCount}, counted {request.observedEligibleEmployeeCount}</span></div>{actor.role === "SUPER_ADMIN" && request.status === "PENDING" ? <ReplacementDecisionForm request={request} candidates={candidates} /> : null}</article>; })) : <p className="operation-empty">No replacement request is available in this view.</p>}</div></section>
    {threads.length ? <section className="operation-panel"><h2>Replacement discussions</h2><p>Discussions are limited to the requester and the employees named on each request.</p>{threads.map((thread) => <DiscussionPanel key={thread.requestId} thread={thread} heading={`Discussion · ${thread.intent === "REPLACE_ASSIGNMENT" ? "Replace assignment employee" : "Add coverage assignment"} (${thread.status})`} />)}</section> : null}
  </section>;
}
