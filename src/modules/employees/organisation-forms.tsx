"use client";
import { announceWorkflowSuccess } from "@/shared/components/workflow-feedback";
import { useActionState, useState } from "react";
import { organisationAction, type OrganisationState } from "./organisation-actions";
import type { OrganisationMember } from "./organisation-service";
const initial: OrganisationState = {};
async function applyChange(previous: OrganisationState, data: FormData) { const result = await organisationAction(previous, data); announceWorkflowSuccess(result); return result; }
function Feedback({ state }: { state: OrganisationState }) { return state.error ? <p className="operation-error" role="alert">{state.error}</p> : state.success ? <p className="operation-success" role="status">{state.success}</p> : null; }
export function CatalogueNameForm({ kind, record }: { kind: "team" | "designation"; record?: { id: string; name: string; version: number } }) {
  const [state, action, pending] = useActionState(applyChange, initial);
  return <form className="catalogue-form" action={action}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="operation" value="save" />{record ? <><input type="hidden" name="id" value={record.id} /><input type="hidden" name="expectedVersion" value={record.version} /></> : null}<label>{kind === "team" ? "Team name" : "Designation name"}<input name="name" defaultValue={record?.name ?? ""} maxLength={120} required data-dialog-autofocus /></label><Feedback state={state} /><button className="button primary" disabled={pending}>{pending ? "Saving…" : record ? "Save name" : `Create ${kind}`}</button></form>;
}
export function MembershipForm({ kind, reference, members, remove }: { kind: "team" | "designation"; reference: string; members: OrganisationMember[]; remove?: OrganisationMember }) {
  const [state, action, pending] = useActionState(applyChange, initial); const [person, setPerson] = useState(remove?.id ?? "");
  const selected = remove ?? members.find((member) => member.id === person);
  return <form className="catalogue-form" action={action}><input type="hidden" name="kind" value={kind} /><input type="hidden" name="operation" value="member" /><input type="hidden" name="id" value={reference} /><input type="hidden" name="expectedVersion" value={selected?.version ?? ""} /><input type="hidden" name="remove" value={String(Boolean(remove))} />{remove ? <><input type="hidden" name="userId" value={remove.id} /><p>Remove {remove.name} from this {kind}? Their account and work records remain available.</p></> : <><label>Person<select name="userId" value={person} onChange={(event) => setPerson(event.target.value)} required><option value="">Choose a person</option>{members.filter((member) => member.active && (kind === "team" ? member.team : member.designationId) !== reference).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><p>Each person has one team and one designation. Saving moves them from their previous {kind}, if assigned.</p>{kind === "team" ? <p>Team membership does not grant Admin access. Manage scope permissions on the employee’s page.</p> : <p>A designation describes the job; it does not change the system role.</p>}</>}<Feedback state={state} /><button className="button primary" disabled={pending || !selected}>{pending ? "Saving…" : remove ? "Remove membership" : "Save membership"}</button></form>;
}
