"use client";
import { displayText } from "@/shared/presentation/display-text";

import { useActionState } from "react";
import { planningLocationAction } from "./location-actions";
import { announceWorkflowSuccess } from "@/shared/components/workflow-feedback";

export function PlanningLocationForm({ userId, profileVersion, location, clear = false }: { userId: string; profileVersion: number; location: { latitude: number; longitude: number; version: number } | null; clear?: boolean }) {
  const [state, action, pending] = useActionState(async (previous: { error?: string; success?: string }, data: FormData) => {
    const result = await planningLocationAction(previous, data);
    if (clear) announceWorkflowSuccess(result);
    return result;
  }, {} as { error?: string; success?: string });
  return <form className="operation-form" action={action} aria-label={clear ? "Clear employee planning coordinate" : "Save employee planning coordinate"}>
    <input type="hidden" name="userId" value={userId} /><input type="hidden" name="expectedProfileVersion" value={profileVersion} /><input type="hidden" name="expectedVersion" value={location?.version ?? 0} /><input type="hidden" name="operation" value={clear ? "clear" : "save"} />
    {clear ? <p>Clear this person&apos;s stored planning coordinate. Their schedule and worksite markers remain available.</p> : <><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" required defaultValue={location?.latitude ?? ""} data-dialog-autofocus /></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" required defaultValue={location?.longitude ?? ""} /></label><p>Enter an approved stored planning coordinate. Super Admin sees this exact point; scoped Admin sees only its coarse area. This is not live tracking.</p></>}
    {state.error ? <p className="operation-error" role="alert">{displayText(state.error)}</p> : state.success ? <p className="operation-success" role="status">{displayText(state.success)}</p> : null}<button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : clear ? "Clear coordinate" : "Save coordinate"}</button>
  </form>;
}
