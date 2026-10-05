import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { CoverageDomainError } from "@/modules/coverage/domain-error";
import { coverageService } from "@/modules/coverage/service";
import { ReplacementRequestForm } from "@/modules/coverage/forms";
import { TaskDialog } from "@/shared/components/task-dialog";

export default async function CoveragePage({ searchParams }: { searchParams: Promise<{ assignment?: string }> }) {
  const actor = await getCurrentActor(); if (!actor) redirect("/login");
  if (actor.role === "EMPLOYEE") return <section className="operations-page workflow-page"><h2>Coverage is management-only</h2><p>Your published work is available in <Link href="/schedule">My Schedule</Link>.</p></section>;
  const params = await searchParams;
  let context: Awaited<ReturnType<typeof coverageService.assignmentContext>> | null = null;
  let gaps: Awaited<ReturnType<typeof coverageService.gaps>> = [];
  let candidates: Awaited<ReturnType<typeof coverageService.candidates>>["candidates"] = [];
  let unavailable = false;
  if (params.assignment) {
    try { context = await coverageService.assignmentContext(actor, params.assignment); gaps = await coverageService.gaps(actor, params.assignment); candidates = (await coverageService.candidates(actor, params.assignment)).candidates; }
    catch (error) { if (!(error instanceof CoverageDomainError)) throw error; unavailable = true; context = null; }
  }
  return <section className="operations-page workflow-page">
    <header className="operations-heading"><div><p className="eyebrow">Team planning</p><h2>Coverage review</h2><p>Review staffing and recorded-skill gaps, then request support where it is needed.</p></div><Link className="button" href="/replacements">Replacement requests</Link></header>
    {context ? <><Link className="workflow-back-link" href={`/schedule?month=${context.month}&period=${context.periodId}`}>Back to schedule</Link><section className="operation-panel workflow-assignment-context"><div className="schedule-panel-heading"><div><p className="eyebrow">{context.clientName}</p><h3>{context.employeeName}</h3></div><span className={`schedule-status ${context.status.toLowerCase()}`}>{context.status}</span></div><p><strong>{context.assignmentDate} · {context.startTime}–{context.endTime}</strong> · Asia/Dubai</p><p>{context.projectName} · {context.locationName}</p></section>
    <section className="operation-panel"><div className="schedule-panel-heading"><h3>Coverage and skills</h3><span className="workflow-count">{gaps.length} gap{gaps.length === 1 ? "" : "s"}</span></div><p>Gaps are non-blocking. They describe recorded staffing and skills; they do not confirm that coverage is sufficient.</p>{gaps.length ? <div className="workflow-gap-list">{gaps.map((gap, index) => <article className="workflow-gap" key={`${gap.anchorAssignmentId}-${gap.staffingRequirementId ?? gap.skillName}-${index}`}><div><span className="workflow-meta">{gap.kind === "STAFFING" ? `${gap.source} staffing` : "Recorded-skill warning"}</span><h4>{gap.skillName}</h4><p>{gap.eligibleEmployeeCount} of {gap.requiredEmployeeCount} required employee{gap.requiredEmployeeCount === 1 ? "" : "s"} currently counted</p></div><TaskDialog triggerLabel="Request support" title={`Request support · ${gap.skillName}`} description={`${context!.employeeName} · ${context!.assignmentDate}`} triggerClassName="button"><ReplacementRequestForm gap={gap} candidates={candidates} /></TaskDialog></article>)}</div> : <div className="workflow-empty"><h4>No recorded gaps</h4><p>No current staffing or recorded-skill gap was found for this assignment.</p></div>}</section></> : <section className="workflow-empty workflow-start"><h3>{unavailable ? "This assignment is unavailable" : "Start with a schedule assignment"}</h3><p>{unavailable ? "It may no longer be available or may be outside your access. Choose an assignment from your schedule." : "Open a monthly schedule and choose Review coverage beside an assignment. Its employee, date, project, and location will appear here."}</p><Link className="button primary" href="/schedule">Open schedule</Link></section>}
  </section>;
}
