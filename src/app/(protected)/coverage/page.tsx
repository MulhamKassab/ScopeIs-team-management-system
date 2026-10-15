import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { CoverageDomainError } from "@/modules/coverage/domain-error";
import { coverageService } from "@/modules/coverage/service";
import { coverRequestLabel } from "@/modules/coverage/presentation";
import { CoverRequestComposer, ReplacementRequestForm, ReplacementDecisionForm, EditCoverRequestForm, CancelCoverRequestForm } from "@/modules/coverage/forms";
import { TaskDialog } from "@/shared/components/task-dialog";
import { WorkflowFeedback } from "@/shared/components/workflow-feedback";
import { getTimetable } from "@/modules/scheduling/timetable-service";
import { Timetable, type CoverMarker } from "@/modules/scheduling/timetable";
import { MonthNavigation } from "@/modules/scheduling/month-navigation";
import { displayDate } from "@/modules/scheduling/calendar-dates";

export const dynamic = "force-dynamic";
export default async function CoveragePage({ searchParams }: { searchParams: Promise<{ assignment?: string; month?: string; mode?: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login");
  if (actor.role === "EMPLOYEE") return <section className="operations-page workflow-page"><h2>Cover is management-only</h2><p>Open <Link href="/schedule">your schedule</Link> or <Link href="/requests">your request conversations</Link>.</p></section>;
  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  let context: Awaited<ReturnType<typeof coverageService.assignmentContext>> | null = null;
  let gaps: Awaited<ReturnType<typeof coverageService.gaps>> = [];
  let candidates: Awaited<ReturnType<typeof coverageService.candidates>>["candidates"] = [];
  let selectionError = "";
  if (params.assignment) {
    try {
      context = await coverageService.assignmentContext(actor, params.assignment);
      [gaps, { candidates }] = await Promise.all([coverageService.gaps(actor, context.id), coverageService.candidates(actor, context.id)]);
    } catch (error) { if (!(error instanceof CoverageDomainError)) throw error; selectionError = error.message; context = null; gaps = []; candidates = []; }
  }
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : context?.month ?? today.slice(0, 7);
  const planning = actor.role === "SUPER_ADMIN" && params.mode === "planning";
  const [entries, requests] = await Promise.all([getTimetable(actor, month, planning), coverageService.mine(actor)]);
  const cards = await Promise.all(requests.map(async (request) => {
    let work: Awaited<ReturnType<typeof coverageService.requestContext>> | null = null;
    let people: { id: string; displayName: string }[] = [];
    let reviewError: string | undefined;
    try {
      work = await coverageService.requestContext(actor, request.id);
      if (request.status === "PENDING") people = (await coverageService.candidates(actor, work.id)).candidates;
    } catch (error) { if (!(error instanceof CoverageDomainError)) throw error; reviewError = error.message; }
    return { request, work, people, reviewError };
  }));
  const markers: Record<string, CoverMarker> = {};
  for (const { request, work } of cards) if (work && (request.status === "PENDING" || (request.status === "APPROVED" && ["DRAFT", "PROPOSED"].includes(request.effectPeriodStatus ?? "")))) {
    for (const id of [work.id, work.sourceAssignmentId].filter((id): id is string => Boolean(id))) {
      if (markers[id] !== "pending") markers[id] = request.status === "PENDING" ? "pending" : "approved";
    }
  }
  function requestCard({ request, work, people, reviewError }: typeof cards[number]) {
    const canManage = request.status === "PENDING" && (actor!.role === "SUPER_ADMIN" || request.requesterUserId === actor!.id);
    return <article id={`request-${request.id}`} className="operation-panel workflow-request-card" key={request.id}>
      <div className="schedule-panel-heading"><div><p className="eyebrow">{request.intent === "REPLACE_ASSIGNMENT" ? "Replacement" : "Extra support"}</p><h4>{work ? `${request.intent === "REPLACE_ASSIGNMENT" ? "Cover for" : "Support for"} ${work.employeeName}` : "Cover request"}</h4></div><span className={`workflow-status ${request.status.toLowerCase()}`}>{coverRequestLabel(request)}</span></div>
      {work ? <><p><strong>{displayDate(work.assignmentDate)} · {work.startTime}–{work.endTime}</strong></p><p>{work.clientName} · {work.projectName} · {work.locationName}</p></> : <p>Assignment details are unavailable within your current access.</p>}
      {request.status === "APPROVED" ? request.effectPeriodStatus === "PUBLISHED" ? <p>The schedule revision for this request has been published. <Link href={`/schedule?month=${work?.month ?? month}`}>View timetable</Link></p> : ["DRAFT", "PROPOSED"].includes(request.effectPeriodStatus ?? "") ? <p>Approved changes are prepared in a Draft. {actor!.role === "SUPER_ADMIN" && request.effectSchedulePeriodId ? <Link href={`/schedule?month=${work?.month ?? month}&mode=planning&period=${request.effectSchedulePeriodId}#schedule-editor`}>Open Draft to publish</Link> : "Super Admin publishes the timetable separately."}</p> : <p>This request was approved. Open the timetable to check the current published work.</p> : null}
      {actor!.role === "SUPER_ADMIN" && request.status === "PENDING" ? <ReplacementDecisionForm request={{ id: request.id, version: request.version, nominatedEmployeeUserId: request.nominatedEmployeeUserId, intent: request.intent }} candidates={people} reviewError={reviewError} /> : null}
      <div className="workflow-row-actions">{canManage ? <><TaskDialog triggerLabel="Edit request" triggerClassName="button" title="Edit cover request"><EditCoverRequestForm request={{ id: request.id, version: request.version, nominatedEmployeeUserId: request.nominatedEmployeeUserId }} candidates={people} /></TaskDialog><TaskDialog triggerLabel="Cancel request" triggerClassName="button" title="Cancel cover request"><CancelCoverRequestForm id={request.id} version={request.version} /></TaskDialog></> : null}{work ? <Link className="button" href={`/coverage?month=${work.month}&assignment=${work.id}#selected-work`}>Assignment details</Link> : null}{request.requesterUserId === actor!.id ? <Link href={`/requests?request=${request.id}`}>Conversation</Link> : null}</div>
    </article>;
  }
  const current = cards.filter(({ request }) => request.status === "PENDING");
  const history = cards.filter(({ request }) => request.status !== "PENDING").reverse();
  return <section className="operations-page workflow-page cover-workspace"><WorkflowFeedback />
    <header className="operations-heading"><div><p className="eyebrow">Team planning</p><h2>Cover</h2><p>Choose work on the timetable, request cover and follow the decision here.</p></div><TaskDialog triggerLabel="Create request" title="Create cover request" description="Choose the assignment that needs a replacement."><CoverRequestComposer entries={entries} isSuperAdmin={actor.role === "SUPER_ADMIN"} /></TaskDialog></header>
    <div className="workflow-toolbar"><MonthNavigation month={month} basePath="/coverage" planning={planning} />{actor.role === "SUPER_ADMIN" ? <nav className="timetable-mode" aria-label="Cover timetable status"><Link className="button" aria-current={!planning ? "page" : undefined} href={`/coverage?month=${month}`}>Published</Link><Link className="button" aria-current={planning ? "page" : undefined} href={`/coverage?month=${month}&mode=planning`}>Planning · unpublished</Link></nav> : null}</div>
    <div className="cover-legend" aria-label="Cover request colours"><span><i className="cover-dot pending" />Awaiting decision</span><span><i className="cover-dot approved" />Approved · Draft prepared</span><span>Changes go live after publication</span></div>
    <Timetable entries={entries} month={month} manager planning={planning} today={today} coverMarkers={markers} cover />
    {selectionError ? <p className="operation-error" role="alert">{selectionError}</p> : null}
    {context ? <section className="operation-panel cover-selected" id="selected-work"><div className="schedule-panel-heading"><div><p className="eyebrow">Selected work</p><h3>{context.employeeName} · {displayDate(context.assignmentDate)}</h3><p>{context.startTime}–{context.endTime} · {context.projectName} · {context.locationName}</p></div><Link href={`/coverage?month=${month}${planning ? "&mode=planning" : ""}`}>Close details</Link></div><div className="cover-selected-grid"><section><h4>Request cover</h4><ReplacementRequestForm key={context.id} gap={{ kind: "MANUAL", anchorAssignmentId: context.id, source: "Assignment", skillName: "", missingEmployeeCount: 0 }} candidates={candidates} isSuperAdmin={actor.role === "SUPER_ADMIN"} /></section><section><h4>Staffing and skills</h4>{gaps.length ? gaps.map((gap, index) => <div className="cover-gap" key={index}><p><strong>{gap.skillName}</strong> · {gap.kind === "STAFFING" ? `${gap.missingEmployeeCount} more needed` : "Skill missing"}</p>{gap.kind === "STAFFING" ? <TaskDialog triggerLabel="Request extra support" title="Request extra support"><ReplacementRequestForm gap={gap} candidates={candidates} isSuperAdmin={actor.role === "SUPER_ADMIN"} /></TaskDialog> : null}</div>) : <p>No recorded gaps. You can still request a replacement.</p>}</section></div></section> : null}
    <section id="current-requests" className="cover-current"><div className="schedule-panel-heading"><div><h3>Current requests <span className="workflow-count">{current.length}</span></h3><p>{actor.role === "SUPER_ADMIN" ? "Approve or reject pending requests across all months." : "Your pending requests across all months."}</p></div><TaskDialog triggerLabel="Create request" title="Create cover request"><CoverRequestComposer entries={entries} isSuperAdmin={actor.role === "SUPER_ADMIN"} /></TaskDialog></div>{current.length ? <div className="workflow-request-list">{current.map(requestCard)}</div> : <div className="workflow-empty"><h4>No pending requests</h4><p>Select a timetable cell or use Create request to arrange cover.</p></div>}</section>
    {history.length ? <details className="operation-panel cover-history"><summary>Request history · {history.length}</summary><div className="workflow-request-list">{history.map(requestCard)}</div></details> : null}
  </section>;
}
