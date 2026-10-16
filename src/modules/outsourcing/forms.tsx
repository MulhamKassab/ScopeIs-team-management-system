"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { displayText } from "@/shared/presentation/display-text";
import { announceWorkflowSuccess } from "@/shared/components/workflow-feedback";
import { createBookingAction, cancelBookingAction, type BookingState } from "./actions";
type Options = { clients: { id: string; companyName: string }[]; employees: { id: string; displayName: string }[] };
export function ClientBookingForm({ options, clientId, initialDate }: { options: Options; clientId?: string; initialDate?: string }) {
  const [state, action, pending] = useActionState(createBookingAction, {} as BookingState);
  const [start, setStart] = useState(initialDate ?? "");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  return <form action={action} className="operation-form" aria-label="Book employees to client">
    {clientId ? <input type="hidden" name="clientId" value={clientId} /> : <label>Client<select name="clientId" required defaultValue=""><option value="">Choose client</option>{options.clients.map((client) => <option key={client.id} value={client.id}>{displayText(client.companyName)}</option>)}</select></label>}
    <label>Find employees<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /></label>
    {selected.map((id) => <input type="hidden" key={id} name="employeeIds" value={id} />)}
    <fieldset className="booking-people"><legend>Employees · {selected.length} selected</legend>{options.employees.filter((person) => person.displayName.toLowerCase().includes(query.toLowerCase())).map((person) => <label className="operation-check" key={person.id}><input type="checkbox" checked={selected.includes(person.id)} onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, person.id] : ids.filter((id) => id !== person.id))} />{displayText(person.displayName)}</label>)}{!options.employees.length ? <p>No employees within your team access.</p> : null}</fieldset>
    <label>Start date<input type="date" name="startDate" required value={start} onChange={(event) => setStart(event.target.value)} /></label>
    <label>End date<input type="date" name="endDate" required min={start || undefined} defaultValue={initialDate} /></label>
    <p>Reserves every calendar day, including weekends, from start through end. Book up to 366 days at a time. Conflicting work, bookings or approved leave must be resolved first.</p>
    <label>Work note (optional)<textarea name="note" rows={2} maxLength={1000} /></label>
    {state.error ? <p role="alert" className="operation-error">{displayText(state.error)}</p> : null}{state.success ? <div role="status"><p>{state.success}</p><Link className="button" href={`/schedule?month=${start.slice(0, 7)}`}>View timetable</Link></div> : null}
    <button className="button primary" disabled={pending || !!state.success || !selected.length || !options.clients.length}>{pending ? "Booking…" : "Book employees"}</button>
  </form>;
}
export function CancelBookingForm({ id, version }: { id: string; version: number }) {
  const [state, action, pending] = useActionState(async (previous: BookingState, data: FormData) => { const result = await cancelBookingAction(previous, data); announceWorkflowSuccess(result); return result; }, {} as BookingState);
  return <form action={action} className="operation-form"><input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} /><p>Cancel this booking to release the employee for the whole period. You can then create a booking with different dates. The original record remains in the activity history.</p>{state.error ? <p role="alert" className="operation-error">{displayText(state.error)}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}<button className="button danger" disabled={pending || !!state.success}>{pending ? "Cancelling…" : "Cancel booking"}</button></form>;
}
