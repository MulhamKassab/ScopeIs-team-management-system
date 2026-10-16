import Link from "next/link";
import { outsourcingService } from "./service";
import { ClientBookingForm, CancelBookingForm } from "./forms";
import { TaskDialog } from "@/shared/components/task-dialog";
import { displayText } from "@/shared/presentation/display-text";
import { displayDate } from "@/modules/scheduling/calendar-dates";
import type { AuthenticatedActor } from "@/shared/types/foundation";
export async function ClientBookingsPanel({ actor, clientId, month, initialDate }: { actor: AuthenticatedActor; clientId?: string; month?: string; initialDate?: string }) {
  const range = month ? { start: `${month}-01`, end: `${month}-${new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate()}` } : undefined;
  const [options, bookings] = await Promise.all([outsourcingService.options(actor), outsourcingService.list(actor, range, clientId)]);
  const canCreate = options.clients.some((client) => !clientId || client.id === clientId) && options.employees.length > 0;
  return <section className="operation-panel" id="client-bookings"><header className="record-panel-heading"><div><h2>Outsource bookings <span className="record-count">{bookings.length}</span></h2><p>Reserve employees for a client over a date range. Bookings appear immediately on the timetable.</p></div>{canCreate ? <TaskDialog triggerLabel="Book employees to client" title="Book employees to client" dismissOnNavigate><ClientBookingForm options={options} clientId={clientId} initialDate={initialDate} /></TaskDialog> : null}</header>
    {bookings.length ? <ul className="workflow-queue">{bookings.map(({ booking, employeeName, clientName }) => <li key={booking.id}><div><strong>{displayText(employeeName)}</strong><span>{displayText(clientName)} · {displayText(displayDate(booking.startDate))} to {displayText(displayDate(booking.endDate))}</span>{booking.note ? <span>{displayText(booking.note)}</span> : null}</div><div className="workflow-row-actions"><Link className="button" href={`/schedule?month=${booking.startDate.slice(0, 7)}`}>View timetable</Link><TaskDialog triggerLabel="Cancel booking" title={displayText(`Cancel booking for ${employeeName}`)} triggerClassName="button"><CancelBookingForm id={booking.id} version={booking.version} /></TaskDialog></div></li>)}</ul> : <p className="record-empty">No client bookings{month ? " this month" : ""}.{!canCreate ? " Booking requires client access and employees within your team access." : " Choose Book employees to client to add one or more people."}</p>}
  </section>;
}
