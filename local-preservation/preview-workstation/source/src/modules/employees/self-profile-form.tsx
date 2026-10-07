"use client";

import { useActionState } from "react";
import type { OwnEmployeeProfileView } from "@/modules/employees/employee-services";
import { updateOwnProfileAction } from "@/modules/employees/employee-management-actions";

export function SelfProfileForm({ profile }: { profile: OwnEmployeeProfileView }) {
  const [state, action, pending] = useActionState(updateOwnProfileAction, {});
  return <form className="employee-self-profile-form" action={action} noValidate><input type="hidden" name="expectedVersion" value={profile.version} />
    <label>Work email<input name="workEmail" type="email" defaultValue={profile.workEmail ?? ""} maxLength={254} autoComplete="email" /></label>
    <label>Work phone<input name="workPhone" type="tel" defaultValue={profile.workPhone ?? ""} maxLength={40} autoComplete="tel" /></label>
    <label>Professional summary<textarea name="professionalSummary" defaultValue={profile.professionalSummary ?? ""} maxLength={2000} rows={5} /></label>
    {state.error ? <p className="employee-form-error" role="alert">{state.error}</p> : null}{state.success ? <p className="employee-form-success" role="status">{state.success}</p> : null}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
  </form>;
}
