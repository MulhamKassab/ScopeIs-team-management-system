"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { ArrowLeft, Archive, FileDown, Paperclip, Pencil, RotateCcw, Users, Plus } from "lucide-react";
import { TaskDialog } from "@/shared/components/task-dialog";
import type { SystemRole } from "@/shared/types/foundation";
import { TicketActionForm, TicketFields, readTicketFields } from "./forms";
import { ticketDate, ticketNumber, ticketPriorityLabels, ticketStatusLabels } from "./presentation";
import type { TicketDetail, TicketFileSummary, TicketWorkspaceData } from "./types";

type WorkLog = TicketDetail["workLogs"][number];
type Feedback = { kind: "idle" | "busy" | "success" | "error"; message?: string; stale?: boolean };
type FileList = { ticketId: string; version: number; files: TicketFileSummary[] };

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function localDubaiTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function readWorkLog(form: FormData) {
  const minutes = String(form.get("durationMinutes") ?? "").trim();
  const loggedAt = String(form.get("loggedAt") ?? "").trim();
  return {
    description: String(form.get("description") ?? "").trim(),
    durationMinutes: minutes ? Number(minutes) : null,
    ...(loggedAt ? { loggedAt: new Date(`${loggedAt}:00+04:00`).toISOString() } : {}),
  };
}

function WorkLogFields({ log, authorName }: { log?: WorkLog; authorName: string }) {
  return <>
    <p className="ticket-file-meta">Recorded by {authorName}. Times use Dubai time.</p>
    <label>Work description<textarea name="description" rows={4} maxLength={5000} defaultValue={log?.description ?? ""} required data-dialog-autofocus /></label>
    <div className="operation-form-grid">
      <label>Work date and time<input name="loggedAt" type="datetime-local" defaultValue={localDubaiTime(log?.loggedAt ?? new Date().toISOString())} required /></label>
      <label>Minutes (optional)<input name="durationMinutes" type="number" min={1} max={1440} step={1} defaultValue={log?.durationMinutes ?? ""} /></label>
    </div>
  </>;
}

function DetailText({ heading, value }: { heading: string; value: string | null }) {
  return <section className="ticket-detail-text"><h3>{heading}</h3><p className={value ? "ticket-text" : "ticket-file-meta"}>{value || "Nothing recorded yet."}</p></section>;
}

/** Bytes always pass through the private, freshly authorized attachment route. */
function TicketFileForm({ ticket, file, action, onSuccess, onReload, maxUploadBytes }: {
  ticket: TicketDetail;
  file?: TicketFileSummary;
  action: "upload" | "archive" | "restore";
  onSuccess: () => Promise<void>;
  onReload: () => Promise<void>;
  maxUploadBytes: number;
}) {
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });
  const fieldId = useId();
  const label = action === "upload" ? "Attach private file" : `${action === "archive" ? "Archive" : "Restore"} ${file?.fileName}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedback.kind === "busy") return;
    const element = event.currentTarget;
    const form = new FormData(element);
    if (action === "upload") {
      const fileInput = element.elements.namedItem("file");
      const chosen = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;
      if (!(chosen instanceof File) || chosen.size < 1) { setFeedback({ kind: "error", message: "Choose a file first." }); return; }
      if (chosen.size > maxUploadBytes) { setFeedback({ kind: "error", message: `Choose a file of ${maxUploadBytes / (1024 * 1024)} MiB or less.` }); return; }
      form.set("file", chosen);
      form.set("version", String(ticket.version));
    }
    setFeedback({ kind: "busy" });
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/files${file ? `/${file.id}` : ""}`, {
        method: "POST",
        ...(action === "upload" ? { body: form } : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, version: ticket.version, fileVersion: file!.version }),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ kind: "error", stale: response.status === 409, message: response.status === 409
          ? "This ticket changed while you were working. Reload the latest record and review it before trying again."
          : typeof body.message === "string" ? body.message : "The file could not be saved. Try again." });
        return;
      }
      await onSuccess();
      if (action === "upload") element.reset();
      setFeedback({ kind: "success", message: action === "upload" ? "Private file attached." : `File ${action === "archive" ? "archived" : "restored"}.` });
    } catch { setFeedback({ kind: "error", message: "The file could not be saved. Check your connection and try again." }); }
  }

  return <form className="operation-form compact" aria-label={label} onSubmit={submit}>
    {action === "upload" ? <>
      <label htmlFor={fieldId}>Choose file<input id={fieldId} name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /></label>
      <p>PDF, JPEG, PNG or Word document, up to {maxUploadBytes / (1024 * 1024)} MiB.</p>
    </> : <p>{action === "archive" ? "Archive this file to retain its history. You can restore it later." : "Restore this private file to the ticket."}</p>}
    {feedback.message ? <p className={feedback.kind === "error" ? "operation-error" : "operation-success"} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
    {feedback.stale ? <button type="button" className="button" onClick={async () => {
      try { await onReload(); setFeedback({ kind: "idle", message: "Latest record loaded. Review it before trying again." }); }
      catch { setFeedback({ kind: "error", stale: true, message: "The latest record could not be loaded. Try again." }); }
    }}>Reload latest record</button> : null}
    <button className={`button ${action === "archive" ? "danger" : "primary"}`} type="submit" disabled={feedback.kind === "busy"}>{feedback.kind === "busy" ? "Saving…" : action === "upload" ? "Upload private file" : action === "archive" ? "Archive file" : "Restore file"}</button>
  </form>;
}

export function TicketDetailView({ initialData, workspace, actor, maxUploadBytes = 5 * 1024 * 1024 }: {
  initialData: TicketDetail;
  workspace: TicketWorkspaceData;
  actor: { id: string; displayName: string; role: SystemRole };
  maxUploadBytes?: number;
}) {
  const router = useRouter();
  const [latest, setLatest] = useState<TicketDetail | null>(null);
  const [fileList, setFileList] = useState<FileList | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [notice, setNotice] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const ticket = latest?.id === initialData.id && latest.version >= initialData.version ? latest : initialData;
  const files = fileList?.ticketId === ticket.id && fileList.version >= ticket.version ? fileList.files : ticket.files;
  const board = workspace.boards.find((entry) => entry.id === ticket.boardId);
  const currentWorkspace = workspace.workspaces.find((entry) => entry.id === ticket.workspaceId);
  const members = new Set(currentWorkspace?.members.map((person) => person.userId) ?? []);
  const candidates = workspace.people.filter((person) => members.has(person.userId) && person.userId !== ticket.creatorUserId);
  const writable = !ticket.archivedAt;

  async function refreshTicket(showArchived = includeArchived, throwOnError = false): Promise<void> {
    setRefreshing(true);
    setRefreshError("");
    try {
      const responses = await Promise.all([
        fetch(`/api/tickets/${ticket.id}`, { cache: "no-store" }),
        fetch(`/api/tickets/${ticket.id}/files?archived=${showArchived}`, { cache: "no-store" }),
      ]);
      if (responses.some((response) => response.status === 401 || response.status === 404 || response.status === 403)) {
        setUnavailable(true);
        router.refresh();
        return;
      }
      if (responses.some((response) => !response.ok)) throw new Error("refresh");
      const [detailBody, fileBody] = await Promise.all(responses.map((response) => response.json()));
      if (!detailBody.ticket || detailBody.ticket.id !== ticket.id || !Array.isArray(fileBody.files)) throw new Error("refresh");
      setLatest(detailBody.ticket as TicketDetail);
      setFileList({ ticketId: ticket.id, version: fileBody.version, files: fileBody.files as TicketFileSummary[] });
      setUnavailable(false);
      router.refresh();
    } catch {
      setRefreshError("The latest ticket could not be loaded. Refresh before making another change.");
      if (throwOnError) throw new Error("The latest ticket could not be loaded.");
    }
    finally { setRefreshing(false); }
  }

  async function saved(message: string) {
    await refreshTicket();
    setNotice(message);
  }

  if (unavailable) return <div className="operations-page tickets-page"><section className="operation-panel"><h2>Ticket unavailable</h2><p>This ticket is no longer available to your account.</p><Link className="button" href="/tickets">Back to tickets</Link></section></div>;

  return <div className="operations-page tickets-page ticket-detail-page">
    <Link href="/tickets" className="button ticket-back"><ArrowLeft size={17} aria-hidden="true" />Back to tickets</Link>
    <header className="operations-heading ticket-detail-heading">
      <div>
        <p className="eyebrow">{ticketNumber(ticket.number)} · {currentWorkspace?.name ?? "Company workspace"}{board ? ` / ${board.name}` : ""}</p>
        <h1>{ticket.subject}</h1>
        <div className="ticket-badges"><span className={`ticket-badge ticket-status-${ticket.status.toLowerCase()}`}>{ticketStatusLabels[ticket.status]}</span><span className={`ticket-badge ticket-priority-${ticket.priority.toLowerCase()}`}>{ticketPriorityLabels[ticket.priority]}</span>{ticket.archivedAt ? <span className="ticket-badge">Archived</span> : null}</div>
      </div>
      <div className="ticket-detail-actions">
        {ticket.permissions.edit && writable ? <TaskDialog triggerLabel="Edit ticket" title="Edit ticket" triggerIcon={<Pencil size={17} aria-hidden="true" />}>
          <TicketActionForm label="Edit ticket" submit="Save changes" getCommand={(form) => ({ action: "updateTicket", ticketId: ticket.id, version: ticket.version, ...readTicketFields(form) })} onSuccess={() => saved("Ticket saved.")} onConflict={() => refreshTicket(includeArchived, true)}>
            <TicketFields key={ticket.version} ticket={ticket} />
          </TicketActionForm>
        </TaskDialog> : null}
        {ticket.permissions.archive && writable ? <TaskDialog triggerLabel="Archive ticket" title="Archive ticket" triggerClassName="button" triggerIcon={<Archive size={17} aria-hidden="true" />}>
          <TicketActionForm label="Archive ticket" submit="Archive ticket" danger getCommand={() => ({ action: "archiveTicket", ticketId: ticket.id, version: ticket.version })} onSuccess={() => saved("Ticket archived. Its history is retained.")} onConflict={() => refreshTicket(includeArchived, true)}><p>Archive this ticket to keep it out of active work. Its details, work logs and private files remain in its history.</p></TicketActionForm>
        </TaskDialog> : null}
        {ticket.permissions.restore && ticket.archivedAt ? <TaskDialog triggerLabel="Restore ticket" title="Restore ticket" triggerIcon={<RotateCcw size={17} aria-hidden="true" />}>
          <TicketActionForm label="Restore ticket" submit="Restore ticket" getCommand={() => ({ action: "restoreTicket", ticketId: ticket.id, version: ticket.version })} onSuccess={() => saved("Ticket restored.")} onConflict={() => refreshTicket(includeArchived, true)}><p>Restore this ticket to active work with its existing details and people.</p></TicketActionForm>
        </TaskDialog> : null}
        <button type="button" className="button" disabled={refreshing} onClick={() => { setNotice(""); void refreshTicket(); }}><RotateCcw size={17} aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh ticket"}</button>
      </div>
    </header>
    {notice ? <p className="operation-success" role="status">{notice}</p> : null}
    {refreshError ? <p className="operation-error" role="alert">{refreshError}</p> : null}
    {ticket.archivedAt ? <p className="operation-callout">Archived on {dateTime(ticket.archivedAt)}. This ticket is read-only until restored.</p> : !ticket.permissions.edit ? <p className="operation-callout">You have read-only access to this ticket.</p> : null}
    <div className="ticket-detail-grid">
      <div className="ticket-detail-content">
        <section className="operation-panel" aria-label="Ticket details">
          <h2>Details</h2>
          {ticket.status === "ON_HOLD" ? <div className="operation-callout"><strong>On hold</strong><p className="ticket-text">{ticket.onHoldReason}</p></div> : null}
          <DetailText heading="Summary" value={ticket.summary} />
          <DetailText heading="Planning" value={ticket.planning} />
          <DetailText heading="Work completed" value={ticket.workCompleted} />
          <DetailText heading="Notes" value={ticket.notes} />
        </section>
        <section className="operation-panel" aria-labelledby="ticket-work-logs-heading">
          <div className="ticket-section-heading"><div><h2 id="ticket-work-logs-heading">Work logs</h2><p className="ticket-file-meta">Recorded work and its author.</p></div>
            {ticket.permissions.log && writable ? <TaskDialog triggerLabel="Add work log" title="Add work log" triggerClassName="button" triggerIcon={<Plus size={17} aria-hidden="true" />}>
              <TicketActionForm label="Add work log" submit="Save work log" getCommand={(form) => ({ action: "addWorkLog", ticketId: ticket.id, version: ticket.version, ...readWorkLog(form) })} onSuccess={() => saved("Work log saved.")} onConflict={() => refreshTicket(includeArchived, true)}><WorkLogFields key={ticket.version} authorName={actor.displayName} /></TicketActionForm>
            </TaskDialog> : null}
          </div>
          {ticket.workLogs.length ? <ul className="operation-list ticket-log-list">{ticket.workLogs.map((log) => <li key={log.id}>
            <div><strong>{log.authorName}</strong><span>{dateTime(log.loggedAt)}{log.durationMinutes ? ` · ${log.durationMinutes} minutes` : ""}</span><p className="ticket-text">{log.description}</p></div>
            {log.canEdit && ticket.permissions.log && writable ? <TaskDialog triggerLabel={`Edit work log by ${log.authorName} on ${dateTime(log.loggedAt)}`} triggerText="Edit" title="Edit work log" triggerClassName="button" triggerIcon={<Pencil size={16} aria-hidden="true" />}>
              <TicketActionForm label="Edit work log" submit="Save changes" getCommand={(form) => ({ action: "editWorkLog", ticketId: ticket.id, workLogId: log.id, version: ticket.version, ...readWorkLog(form) })} onSuccess={() => saved("Work log updated.")} onConflict={() => refreshTicket(includeArchived, true)}><WorkLogFields key={`${log.id}-${log.version}`} log={log} authorName={log.authorName} /></TicketActionForm>
            </TaskDialog> : null}
          </li>)}</ul> : <p className="operation-empty">No work logs yet.</p>}
        </section>
        <section className="operation-panel" aria-labelledby="ticket-files-heading">
          <div className="ticket-section-heading"><div><h2 id="ticket-files-heading">Private files</h2><p className="ticket-file-meta">Files stay within this ticket&apos;s access.</p></div>
            {ticket.permissions.files && writable ? <TaskDialog triggerLabel="Attach file" title="Attach private file" triggerClassName="button" triggerIcon={<Paperclip size={17} aria-hidden="true" />}><TicketFileForm ticket={ticket} action="upload" maxUploadBytes={maxUploadBytes} onSuccess={() => saved("Private file attached.")} onReload={() => refreshTicket(includeArchived, true)} /></TaskDialog> : null}
          </div>
          <label className="operation-check ticket-file-toggle"><input type="checkbox" checked={includeArchived} disabled={refreshing} onChange={(event) => { const checked = event.target.checked; setIncludeArchived(checked); void refreshTicket(checked); }} />Include archived files</label>
          {files.length ? <ul className="operation-list ticket-file-list">{files.filter((file) => includeArchived || !file.archivedAt).map((file) => <li key={file.id}>
            <div><strong>{file.fileName}</strong><span>{Math.max(1, Math.ceil(file.byteSize / 1024))} KB · {file.uploaderName} · {dateTime(file.createdAt)}{file.archivedAt ? " · Archived" : ""}</span></div>
            <div className="ticket-detail-actions">
              {!file.archivedAt ? <a className="button" href={`/api/tickets/${ticket.id}/files/${file.id}`} aria-label={`Download ${file.fileName}`}><FileDown size={16} aria-hidden="true" />Download</a> : null}
              {ticket.permissions.files && writable && (file.canArchive || file.canRestore) ? <TaskDialog triggerLabel={`${file.canRestore ? "Restore" : "Archive"} ${file.fileName}`} triggerText={file.canRestore ? "Restore" : "Archive"} title={file.canRestore ? "Restore private file" : "Archive private file"} triggerClassName="button"><TicketFileForm ticket={ticket} file={file} action={file.canRestore ? "restore" : "archive"} maxUploadBytes={maxUploadBytes} onSuccess={() => saved(file.canRestore ? "File restored." : "File archived.")} onReload={() => refreshTicket(includeArchived, true)} /></TaskDialog> : null}
            </div>
          </li>)}</ul> : <p className="operation-empty">No private files attached.</p>}
        </section>
      </div>
      <aside className="ticket-detail-aside">
        <section className="operation-panel"><h2>At a glance</h2><dl className="ticket-facts"><div><dt>Created by</dt><dd>{ticket.creatorName}</dd></div><div><dt>Ticket date</dt><dd>{ticketDate(ticket.ticketDate)}</dd></div><div><dt>Due date</dt><dd>{ticket.dueDate ? ticketDate(ticket.dueDate) : "No due date"}</dd></div><div><dt>Last updated</dt><dd>{dateTime(ticket.updatedAt)}</dd></div></dl></section>
        <section className="operation-panel" aria-labelledby="ticket-people-heading"><div className="ticket-section-heading"><h2 id="ticket-people-heading">People</h2>
          {ticket.permissions.managePeople && writable ? <TaskDialog triggerLabel="Manage ticket people" triggerText="Manage" title="Manage ticket people" description="Assign work or grant read-only observer access to current workspace members." triggerClassName="button" triggerIcon={<Users size={17} aria-hidden="true" />}>
            <TicketActionForm label="Manage ticket people" submit="Save people" getCommand={(form) => ({ action: "setParticipants", ticketId: ticket.id, version: ticket.version, assigneeIds: candidates.filter((person) => form.get(`participation-${person.userId}`) === "ASSIGNEE").map((person) => person.userId), observerIds: candidates.filter((person) => form.get(`participation-${person.userId}`) === "OBSERVER").map((person) => person.userId) })} onSuccess={() => saved("Ticket people updated.")} onConflict={() => refreshTicket(includeArchived, true)}>
              <p>{ticket.creatorName} retains creator access.</p>
              <div key={ticket.version} className="ticket-people-editor">{candidates.length ? candidates.map((person) => <label key={person.userId}>{person.displayName}<select name={`participation-${person.userId}`} defaultValue={ticket.participants.find((entry) => entry.userId === person.userId)?.participation ?? "NONE"}><option value="NONE">No ticket access</option><option value="ASSIGNEE">Assignee — can work on ticket</option><option value="OBSERVER">Observer — read only</option></select></label>) : <p>No other authorized workspace members are available.</p>}</div>
            </TicketActionForm>
          </TaskDialog> : null}
        </div><ul className="operation-list ticket-person-list">{ticket.participants.map((person) => <li key={person.userId}><div><strong>{person.displayName}</strong><span>{person.participation === "CREATOR" ? "Creator" : person.participation === "ASSIGNEE" ? "Assignee" : "Observer · read only"}</span></div></li>)}</ul></section>
      </aside>
    </div>
  </div>;
}
