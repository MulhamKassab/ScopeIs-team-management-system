"use client";
import { displayText } from "@/shared/presentation/display-text";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createReplacementRequestAction, decideReplacementRequestAction, editReplacementRequestAction, cancelReplacementRequestAction, type CoverageAction, type CoverageActionState } from "@/modules/coverage/actions";
import type { TimetableEntry } from "@/modules/scheduling/timetable-service";
import { announceWorkflowSuccess } from "@/shared/components/workflow-feedback";
const initial: CoverageActionState = {};
function Feedback({ state }: { state: CoverageActionState }) { return state.error ? <p className="form-error" role="alert">{displayText(state.error)}</p> : state.success ? <p className="form-success" role="status">{displayText(state.success)}</p> : null; }
export function ReplacementRequestForm({ gap, candidates, isSuperAdmin = false }: { gap: { kind: "STAFFING" | "QUALIFICATION" | "MANUAL"; staffingRequirementId?: string; anchorAssignmentId: string; skillName: string; source: string; missingEmployeeCount: number }; candidates: { id: string; displayName: string }[]; isSuperAdmin?: boolean }) {
  const [state, action, pending] = useActionState(createReplacementRequestAction as CoverageAction, initial);
  return <form className="operation-form compact" action={action} aria-label="Request coverage support"><input type="hidden" name="staffingRequirementId" value={gap.staffingRequirementId ?? ""} /><input type="hidden" name="anchorAssignmentId" value={gap.anchorAssignmentId} />
    <label>What needs to change?<select name="intent" defaultValue={gap.kind === "STAFFING" ? "ADD_COVERAGE_ASSIGNMENT" : "REPLACE_ASSIGNMENT"}><option value="REPLACE_ASSIGNMENT">Replace this person</option>{gap.kind === "STAFFING" ? <option value="ADD_COVERAGE_ASSIGNMENT">Add another person alongside them</option> : null}</select></label>
    {candidates.length ? <label>Proposed person (optional)<select name="nominatedEmployeeUserId" defaultValue=""><option value="">Choose during review</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{displayText(candidate.displayName)}</option>)}</select></label> : <p className="workflow-inline-note">Super Admin chooses an available person during review.</p>}
    <p>{displayText(gap.kind === "MANUAL" ? "Request a replacement for this assignment. No staffing gap is required." : `${gap.source} requires ${gap.skillName}; ${gap.missingEmployeeCount} gap(s).`)} Approval prepares a Draft; publication is separate.</p><Feedback state={state} />{state.success ? <Link className="button" href="/coverage#current-requests">View current requests</Link> : null}<button className="button primary" disabled={pending || Boolean(state.success)}>{pending ? "Creating…" : isSuperAdmin ? "Create cover request" : "Send cover request"}</button>
  </form>;
}
export function CoverRequestComposer({ entries, isSuperAdmin }: { entries: TimetableEntry[]; isSuperAdmin: boolean }) {
  const [assignment, setAssignment] = useState(entries[0]?.id ?? "");
  const entry = entries.find((item) => item.id === assignment);
  return <div><label className="operation-form">Assignment<select value={assignment} onChange={(event) => setAssignment(event.target.value)}>{entries.map((item) => <option key={item.id} value={item.id}>{displayText(item.date)} · {displayText(item.employeeName)} · {displayText(item.start)}–{displayText(item.end)} · {displayText(item.projectName)}</option>)}</select></label>{entry ? <><p>{displayText(entry.clientName)} · {displayText(entry.locationName)}</p><ReplacementRequestForm key={entry.id} gap={{ kind: "MANUAL", anchorAssignmentId: entry.id, source: "Assignment", skillName: "", missingEmployeeCount: 0 }} candidates={[]} isSuperAdmin={isSuperAdmin} /><p>Need an additional person? <Link href={`/coverage?month=${entry.date.slice(0, 7)}&assignment=${entry.id}#selected-work`}>Check staffing and request extra support</Link>.</p></> : <p>No assignments this month. Choose another month in Cover.</p>}</div>;
}
export function ReplacementDecisionForm({ request, candidates, reviewError }: { request: { id: string; version: number; nominatedEmployeeUserId: string | null; intent: string }; candidates: { id: string; displayName: string }[]; reviewError?: string }) {
  const [state, action, pending] = useActionState(async (previous: CoverageActionState, data: FormData) => { const result = await decideReplacementRequestAction(previous, data); announceWorkflowSuccess(result); return result; }, initial);
  const nominee = candidates.some((candidate) => candidate.id === request.nominatedEmployeeUserId) ? request.nominatedEmployeeUserId! : "";
  return <form className="operation-form compact cover-decision" action={action} aria-label="Decide replacement request"><input type="hidden" name="replacementRequestId" value={request.id} /><input type="hidden" name="expectedVersion" value={request.version} />
    {reviewError ? <p className="workflow-inline-note" role="status">{displayText(reviewError)} You can reject this outdated request.</p> : candidates.length === 0 ? <p className="workflow-inline-note">No eligible person is available. You can reject this request or review it later.</p> : null}
    {candidates.length ? <label>Covering person<select name="selectedEmployeeUserId" defaultValue={nominee} required><option value="">Choose person</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{displayText(candidate.displayName)}</option>)}</select></label> : null}
    <Feedback state={state} /><div className="workflow-row-actions"><button name="decision" value="APPROVED" className="button primary" disabled={pending || !candidates.length || Boolean(state.success)}>{pending ? "Saving…" : "Approve cover"}</button><button name="decision" value="REJECTED" formNoValidate className="button danger" disabled={pending || Boolean(state.success)}>Reject request</button></div><p className="workflow-meta">Approval rechecks skills and availability and prepares a Draft. Publish from Timetable when ready.</p>
  </form>;
}
export function EditCoverRequestForm({ request, candidates }: { request: { id: string; version: number; nominatedEmployeeUserId: string | null }; candidates: { id: string; displayName: string }[] }) {
  const [state, action, pending] = useActionState(editReplacementRequestAction, initial);
  return <form className="operation-form compact" action={action} aria-label="Edit cover request"><input type="hidden" name="replacementRequestId" value={request.id} /><input type="hidden" name="expectedVersion" value={request.version} /><label>Proposed person<select name="nominatedEmployeeUserId" defaultValue={request.nominatedEmployeeUserId ?? ""}><option value="">Choose during review</option>{candidates.map((person) => <option key={person.id} value={person.id}>{displayText(person.displayName)}</option>)}</select></label><p>To change the assignment or request type, cancel this request and create another.</p><Feedback state={state} /><button className="button primary" disabled={pending || Boolean(state.success)}>{pending ? "Saving…" : "Save request"}</button></form>;
}
export function CancelCoverRequestForm({ id, version }: { id: string; version: number }) {
  const [state, action, pending] = useActionState(cancelReplacementRequestAction, initial);
  return <form className="operation-form compact" action={action} aria-label="Cancel cover request"><input type="hidden" name="replacementRequestId" value={id} /><input type="hidden" name="expectedVersion" value={version} /><p>Remove this pending request from the decision queue. The timetable stays as it is and the request history is kept.</p><Feedback state={state} /><button className="button danger" disabled={pending || Boolean(state.success)}>{pending ? "Cancelling…" : "Cancel request"}</button></form>;
}
