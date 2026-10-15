"use client";
import { displayText } from "@/shared/presentation/display-text";

import { useActionState, useState } from "react";
import { cancelLeaveAction, decideLeaveAction, submitLeaveAction, updateLeaveAllowanceAction, type LeaveAction, type LeaveActionState } from "@/modules/leave/actions";
import { announceWorkflowSuccess } from "@/shared/components/workflow-feedback";
import { vacationPreview, type ApprovedVacationDates } from "@/modules/leave/vacation-preview";
const initial: LeaveActionState = {};
function FormStatus({ state }: { state: LeaveActionState }) { return <>{state.error ? <p className="operation-error" role="alert">{displayText(state.error)}</p> : null}{state.success ? <p className="operation-success" role="status">{displayText(state.success)}</p> : null}</>; }
export function LeaveRequestForm({ allowance, approvedVacations = [] }: { allowance: number; approvedVacations?: ApprovedVacationDates[] }) {
  const [state, action, pending] = useActionState(submitLeaveAction as LeaveAction, initial);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [privateReason, setPrivateReason] = useState("");
  const preview = vacationPreview(startDate, endDate, allowance, approvedVacations);
  return <form className="operation-form leave-form" action={action} aria-label="Submit annual leave request">
    <p>Monday–Friday use your annual allowance. If approved, you will be unavailable for every date in this range.</p>
    <div className="operation-form-grid"><label>Start date<input name="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label><label>End date<input name="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label></div>
    <section className="vacation-preview" aria-label="Vacation balance preview" aria-live="polite">
      <h3>Working-day preview</h3>
      {preview ? <>
        <p><strong>{preview.reduce((total, year) => total + year.requested, 0)} working days</strong> in your request.</p>
        <ul>{preview.map((year) => <li key={year.year}><strong>{year.year}</strong><span>{year.requested} working days requested · {year.remaining} available · {year.projectedRemaining} remaining if approved</span></li>)}</ul>
        {preview.some((year) => year.projectedRemaining < 0) ? <p className="operation-error">These dates exceed the currently available balance. Super Admin cannot approve without enough balance.</p> : null}
      </> : <p>{startDate && endDate && endDate < startDate ? "Choose an end date on or after the start date." : "Choose both dates to see working days and the balance if approved."}</p>}
      <p className="workflow-meta">Estimate from your approved vacations and current allowance. Pending requests are not deducted. Each Asia/Dubai calendar year is separate; the server checks the latest balance on approval.</p>
    </section>
    <label>Private reason or note (optional)<textarea name="privateReason" value={privateReason} onChange={(event) => setPrivateReason(event.target.value)} maxLength={1000} /></label><FormStatus state={state} />
    <button className="button primary" disabled={pending}>{pending ? "Submitting…" : "Submit vacation request"}</button>
  </form>;
}
export function CancelLeaveForm({ id, version }: { id: string; version: number }) { const [state, action, pending] = useActionState(cancelLeaveAction as LeaveAction, initial); return <form className="inline-form" action={action}><input type="hidden" name="leaveRequestId" value={id} /><input type="hidden" name="expectedVersion" value={version} /><FormStatus state={state} /><button className="button danger" disabled={pending}>{pending ? "Cancelling…" : "Cancel Pending request"}</button></form>; }
export function LeaveDecisionForm({ id, version, approvalBlocked = false }: { id: string; version: number; approvalBlocked?: boolean }) {
  const [state, action, pending] = useActionState(async (previous: LeaveActionState, data: FormData) => { const result = await decideLeaveAction(previous, data); announceWorkflowSuccess(result); return result; }, initial);
  const [decision, setDecision] = useState("APPROVED");
  return <form className="operation-form" action={action} aria-label="Decide leave request"><input type="hidden" name="leaveRequestId" value={id} /><input type="hidden" name="expectedVersion" value={version} /><label>Decision<select name="decision" value={decision} onChange={(event) => setDecision(event.target.value)}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></label><label>Employee-visible response <textarea name="response" maxLength={1000} required={decision === "REJECTED"} /></label><p>Rejection requires a response.</p>{approvalBlocked && decision === "APPROVED" ? <p className="operation-error">Resolve the Published schedule conflict before approving, or choose Reject.</p> : null}<FormStatus state={state} /><button className="button primary" disabled={pending || (approvalBlocked && decision === "APPROVED")}>{pending ? "Saving…" : "Save decision"}</button></form>;
}
export function AllowanceForm({ allowance, version }: { allowance: number; version: number }) { const [state, action, pending] = useActionState(updateLeaveAllowanceAction as LeaveAction, initial); return <form className="operation-form compact" action={action} aria-label="Annual leave allowance"><h3>Global annual allowance</h3><label>Working days per calendar year<input name="annualWorkingDays" type="number" min="1" max="366" defaultValue={allowance} required /></label><input type="hidden" name="expectedVersion" value={version} /><FormStatus state={state} /><button className="button primary" disabled={pending}>{pending ? "Updating…" : "Update allowance"}</button></form>; }
