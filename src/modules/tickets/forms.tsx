"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import type { TicketDetail } from "./types";
import { ticketPriorities, ticketPriorityLabels, ticketStatuses, ticketStatusLabels, ticketToday } from "./presentation";

export async function sendTicketCommand(input: unknown): Promise<unknown> {
  const response = await fetch("/api/tickets/commands", { method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const result = await response.json() as { message?: string; error?: string };
  if (!response.ok) throw Object.assign(new Error(result.message ?? "The change could not be saved."), { status: response.status });
  return result;
}

export function TicketActionForm({ label, submit = "Save changes", getCommand, onSuccess, onConflict, children, danger = false, resetOnSuccess = false }: {
  label: string; submit?: string; getCommand: (form: FormData) => unknown;
  onSuccess: (result: unknown) => void | Promise<void>; onConflict?: () => void | Promise<void>;
  children: ReactNode; danger?: boolean; resetOnSuccess?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string; conflict?: boolean }>({});
  const feedbackId = useId();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true); setFeedback({});
    try {
      const result = await sendTicketCommand(getCommand(new FormData(form)));
      if (resetOnSuccess) { form.reset(); setResetKey((key) => key + 1); }
      setFeedback({ success: "Saved." });
      try { await onSuccess(result); }
      catch { setFeedback({ success: "Saved. Reload the page to see the latest record." }); }
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : "The change could not be saved.",
        conflict: error instanceof Error && "status" in error && error.status === 409 });
    } finally { setPending(false); }
  }
  return <form className="operation-form ticket-form" aria-label={label} onSubmit={save} aria-describedby={feedbackId}>
    <fieldset key={resetKey} disabled={pending}>{children}</fieldset>
    <div id={feedbackId}>
      {feedback.error ? <p className="operation-error" role="alert">{feedback.error}</p> : null}
      {feedback.success ? <p className="operation-success" role="status">{feedback.success}</p> : null}
      {feedback.conflict && onConflict ? <button type="button" className="button" disabled={pending} onClick={async () => {
        setPending(true);
        try { await onConflict(); setFeedback({}); }
        catch { setFeedback({ error: "The latest record could not be loaded. Try again.", conflict: true }); }
        finally { setPending(false); }
      }}>Reload latest record</button> : null}
    </div>
    <button type="submit" className={`button ${danger ? "danger" : "primary"}`} disabled={pending}>{pending ? "Saving…" : submit}</button>
  </form>;
}

export function readTicketFields(form: FormData) {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  return { subject: value("subject"), ticketDate: value("ticketDate"), dueDate: value("dueDate") || null,
    status: value("status"), priority: value("priority"), summary: value("summary"), planning: value("planning"),
    workCompleted: value("workCompleted"), notes: value("notes"), onHoldReason: value("onHoldReason") };
}

export function TicketFields({ ticket }: { ticket?: Partial<TicketDetail> }) {
  const [status, setStatus] = useState(ticket?.status ?? "OPEN");
  return <>
    <label>Subject<input name="subject" defaultValue={ticket?.subject ?? ""} maxLength={200} required data-dialog-autofocus /></label>
    <div className="operation-form-grid">
      <label>Status<select name="status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{ticketStatuses.map((value) => <option key={value} value={value}>{ticketStatusLabels[value]}</option>)}</select></label>
      <label>Priority<select name="priority" defaultValue={ticket?.priority ?? "MEDIUM"}>{ticketPriorities.map((value) => <option key={value} value={value}>{ticketPriorityLabels[value]}</option>)}</select></label>
      <label>Ticket date<input type="date" name="ticketDate" defaultValue={ticket?.ticketDate ?? ticketToday()} required /></label>
      <label>Due date · optional<input type="date" name="dueDate" defaultValue={ticket?.dueDate ?? ""} /></label>
    </div>
    {status === "ON_HOLD" ? <label>On-hold reason<textarea name="onHoldReason" defaultValue={ticket?.onHoldReason ?? ""} maxLength={2000} rows={3} required /></label> : <input type="hidden" name="onHoldReason" value="" />}
    <label>Summary<textarea name="summary" defaultValue={ticket?.summary ?? ""} maxLength={10000} rows={3} /></label>
    <details className="ticket-extra-fields"><summary>Planning, work completed and notes</summary>
      <label>Planning<textarea name="planning" defaultValue={ticket?.planning ?? ""} maxLength={10000} rows={3} /></label>
      <label>Work completed<textarea name="workCompleted" defaultValue={ticket?.workCompleted ?? ""} maxLength={10000} rows={3} /></label>
      <label>Notes<textarea name="notes" defaultValue={ticket?.notes ?? ""} maxLength={10000} rows={3} /></label>
    </details>
  </>;
}
