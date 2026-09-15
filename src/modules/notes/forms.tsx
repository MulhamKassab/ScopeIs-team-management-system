"use client";

import { useActionState } from "react";
import { archiveManagementNoteAction, createManagementNoteAction, type NoteAction, type NoteActionState } from "@/modules/notes/actions";
import type { ManagementNoteView } from "@/modules/notes/service";

const initial: NoteActionState = {};

function Feedback({ state }: { state: NoteActionState }) {
  return state.error ? <p className="operation-error" role="alert">{state.error}</p> : state.success ? <p className="operation-success" role="status">{state.success}</p> : null;
}

function NoteForm({ action, title, children, submit, danger = false }: { action: NoteAction; title: string; children: React.ReactNode; submit: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return <form className="operation-form compact" action={formAction} aria-label={title}>{children}<Feedback state={state} /><button className={`button ${danger ? "danger" : "primary"}`} type="submit" disabled={pending}>{pending ? "Saving…" : submit}</button></form>;
}

/**
 * Employee-management notes. The panel is never rendered for the subject or an unauthorized actor, and
 * the server recomputes visibility on every read regardless of what the UI shows.
 */
export function ManagementNotePanel({ subjectUserId, subjectName, notes, canCreate }: { subjectUserId: string; subjectName: string; notes: ManagementNoteView[]; canCreate: boolean }) {
  const active = notes.filter((note) => !note.archivedAt);
  const archived = notes.filter((note) => note.archivedAt);
  return <section className="operations-page notes-page" aria-labelledby="management-notes-title">
    <header className="operations-heading"><div>
      <p className="eyebrow">Phase 10 · Employee-management notes</p>
      <h2 id="management-notes-title">Management notes</h2>
      <p>Notes about {subjectName} are private to their author unless shared upward. {subjectName} never sees these notes, and peer Admins cannot read each other&apos;s notes. Content is immutable; archive and write a new note to correct one.</p>
    </div></header>
    {canCreate ? <NoteForm action={createManagementNoteAction} title={`Add management note about ${subjectName}`} submit="Save note">
      <input type="hidden" name="subjectUserId" value={subjectUserId} />
      <label>Visibility<select name="visibility" defaultValue="private_to_author"><option value="private_to_author">Private to me</option><option value="shared_upward">Shared upward</option></select></label>
      <label>Note<textarea name="content" maxLength={5000} rows={4} required /></label>
      <p className="operation-help">Plain text only. Do not paste HTML, links to private files, or personal data that is not needed for the record.</p>
    </NoteForm> : null}
    {active.length ? <div className="notes-list">{active.map((note) => <article className="note-item" key={note.id} id={`management-note-${note.id}`}>
      <div className="note-item-head">
        <div><strong>{note.authorName}</strong><span>{note.authorRole.replace("_", " ")} · {note.visibility === "private_to_author" ? "Private to author" : "Shared upward"} · {note.createdAt.slice(0, 10)}</span></div>
        {note.isAuthor ? <span className="note-badge">Your note</span> : null}
      </div>
      <p>{note.content}</p>
      {note.canArchive ? <NoteForm action={archiveManagementNoteAction} title={`Archive note from ${note.authorName}`} submit="Archive note" danger>
        <input type="hidden" name="noteId" value={note.id} />
        <input type="hidden" name="expectedVersion" value={note.version} />
        <input type="hidden" name="subjectUserId" value={subjectUserId} />
        <label>Reason for archiving<input name="reason" minLength={3} maxLength={500} required /></label>
      </NoteForm> : null}
    </article>)}</div> : <p className="operation-empty">No management note is visible to you for this employee.</p>}
    {archived.length ? <details className="notes-archive"><summary>{archived.length} archived note{archived.length === 1 ? "" : "s"}</summary><ul className="operation-list">{archived.map((note) => <li key={note.id}><div><strong>{note.authorName}</strong><span>Archived {note.archivedAt?.slice(0, 10)} · {note.visibility === "private_to_author" ? "Private to author" : "Shared upward"}</span></div></li>)}</ul></details> : null}
  </section>;
}
