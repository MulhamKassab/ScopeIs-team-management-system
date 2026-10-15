"use client";
import { useActionState } from "react";
import { arrangementAction, type ArrangementState } from "./arrangement-actions";

type Label = { id: string; name: string; color: string; sortOrder: number; active: boolean; version: number };
export function ArrangementForm({ record, lifecycle = false }: { record?: Label; lifecycle?: boolean }) {
  const [state, action, pending] = useActionState(arrangementAction, {} as ArrangementState);
  const color = record?.color ?? "#163b99";
  const inputColor = /^#[0-9a-f]{3}$/i.test(color) ? `#${color.slice(1).split("").map((digit) => digit + digit).join("")}` : color;
  return <form className="operation-form" action={action} aria-label={lifecycle ? `${record?.active ? "Archive" : "Reactivate"} ${record?.name}` : record ? `Edit ${record.name}` : "Create assignment label"}>
    <input type="hidden" name="operation" value={lifecycle ? "lifecycle" : record ? "update" : "create"} />
    {record ? <><input type="hidden" name="id" value={record.id} /><input type="hidden" name="expectedVersion" value={record.version} /></> : null}
    {lifecycle ? <><input type="hidden" name="active" value={String(!record?.active)} /><p>{record?.active ? "Archive this descriptive label while retaining its history." : "Make this label available again."}</p></> : <>
      <label>Name<input name="name" defaultValue={record?.name ?? ""} maxLength={120} required data-dialog-autofocus /></label>
      <label>Colour<input name="color" type="color" defaultValue={inputColor} required /></label>
      <label>Display order<input name="sortOrder" type="number" step="1" min="-2147483648" max="2147483647" defaultValue={record?.sortOrder ?? 0} required /></label>
      <p>Lower numbers appear first. Labels describe arrangements and do not change roles, permissions, scheduling or availability.</p>
    </>}
    {state.error ? <p className="operation-error" role="alert">{state.error}</p> : state.success ? <p className="operation-success" role="status">{state.success}</p> : null}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : lifecycle ? record?.active ? "Archive label" : "Reactivate label" : "Save label"}</button>
  </form>;
}
