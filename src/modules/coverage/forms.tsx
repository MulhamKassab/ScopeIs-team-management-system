"use client";
import { useActionState, useState } from "react";
import { createReplacementRequestAction, decideReplacementRequestAction, type CoverageAction, type CoverageActionState } from "@/modules/coverage/actions";
import { announceWorkflowSuccess } from "@/shared/components/workflow-feedback";
const initial: CoverageActionState = {};
function Feedback({ state }: { state: CoverageActionState }) { return state.error ? <p className="form-error" role="alert">{state.error}</p> : state.success ? <p className="form-success" role="status">{state.success}</p> : null; }
export function ReplacementRequestForm({ gap, candidates }: { gap: { kind: "STAFFING" | "QUALIFICATION"; staffingRequirementId?: string; anchorAssignmentId: string; skillName: string; source: string; missingEmployeeCount: number }; candidates: { id: string; displayName: string }[] }) {
  const [state, action, pending] = useActionState(createReplacementRequestAction as CoverageAction, initial);
  return <form className="operation-form compact" action={action} aria-label="Request coverage support"><input type="hidden" name="staffingRequirementId" value={gap.staffingRequirementId ?? ""} /><input type="hidden" name="anchorAssignmentId" value={gap.anchorAssignmentId} />
    <label>Request intent<select name="intent" defaultValue={gap.kind === "STAFFING" ? "ADD_COVERAGE_ASSIGNMENT" : "REPLACE_ASSIGNMENT"}><option value="REPLACE_ASSIGNMENT">Replace assignment employee</option>{gap.kind === "STAFFING" ? <option value="ADD_COVERAGE_ASSIGNMENT">Add coverage assignment</option> : null}</select></label>
    {candidates.length ? <label>Nominate an eligible Employee (optional)<select name="nominatedEmployeeUserId" defaultValue=""><option value="">Let Super Admin choose</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.displayName}</option>)}</select></label> : <p className="workflow-inline-note">No employee currently matches the recorded skills and scheduling checks. You can still send a request without a nominee.</p>}
    <p>{gap.source} requires {gap.skillName}; {gap.missingEmployeeCount} gap{gap.missingEmployeeCount === 1 ? "" : "s"}. Your request does not publish a change.</p><Feedback state={state} /><button className="button primary" disabled={pending}>{pending ? "Sending…" : "Request Super Admin decision"}</button>
  </form>;
}
export function ReplacementDecisionForm({ request, candidates }: { request: { id: string; version: number; nominatedEmployeeUserId: string | null; intent: string }; candidates: { id: string; displayName: string }[] }) {
  const [state, action, pending] = useActionState(async (previous: CoverageActionState, data: FormData) => { const result = await decideReplacementRequestAction(previous, data); announceWorkflowSuccess(result); return result; }, initial);
  const [decision, setDecision] = useState(candidates.length ? "APPROVED" : "REJECTED");
  const nominee = candidates.some((candidate) => candidate.id === request.nominatedEmployeeUserId) ? request.nominatedEmployeeUserId! : "";
  return <form className="operation-form compact" action={action} aria-label="Decide replacement request"><input type="hidden" name="replacementRequestId" value={request.id} /><input type="hidden" name="expectedVersion" value={request.version} />
    <label>Decision<select name="decision" value={decision} onChange={(event) => setDecision(event.target.value)}><option value="APPROVED">Approve and update Draft</option><option value="REJECTED">Reject</option></select></label>
    {candidates.length === 0 ? <p className="workflow-inline-note">No eligible employee is currently available for approval. You can reject this request, or return after the team’s skills or schedule change.</p> : null}
    {decision === "APPROVED" && candidates.length ? <label>Selected eligible Employee<select name="selectedEmployeeUserId" defaultValue={nominee} required><option value="">Choose employee</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.displayName}</option>)}</select></label> : null}
    <p>{decision === "APPROVED" ? "Approval updates an editable Draft. A Published schedule gets a new Draft revision; nothing is auto-published." : "The requester will be notified. The schedule stays as it is."}</p><Feedback state={state} /><button className="button primary" disabled={pending || (decision === "APPROVED" && candidates.length === 0)}>{pending ? "Saving…" : "Save Super Admin decision"}</button>
  </form>;
}
