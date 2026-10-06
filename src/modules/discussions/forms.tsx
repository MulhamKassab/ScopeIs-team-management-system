"use client";

import { useActionState, useEffect, useRef } from "react";
import { archiveDiscussionMessageAction, postDiscussionMessageAction, type DiscussionAction, type DiscussionActionState } from "@/modules/discussions/actions";
import type { DiscussionThreadView } from "@/modules/discussions/service";
import { formatDubaiDateTime } from "@/shared/format-date";
import { displayDate } from "@/modules/scheduling/calendar-dates";

const initial: DiscussionActionState = {};

function Feedback({ state }: { state: DiscussionActionState }) {
  return state.error ? <p className="operation-error" role="alert">{state.error}</p> : state.success ? <p className="operation-success" role="status">{state.success}</p> : null;
}

function Composer({ action, title, children, submit, danger = false }: { action: DiscussionAction; title: string; children: React.ReactNode; submit: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return <form className="operation-form compact" action={formAction} aria-label={title}>{children}<Feedback state={state} /><button className={`button ${danger ? "danger" : "primary"}`} type="submit" disabled={pending}>{pending ? "Saving…" : submit}</button></form>;
}

/**
 * Participant-only discussion panel. It is mounted only where the actor already holds the module, and
 * the server re-derives participation on every read and write regardless of what is rendered here.
 */
export function DiscussionPanel({ thread, heading }: { thread: DiscussionThreadView; heading: string }) {
  const active = thread.messages.filter((message) => !message.archivedAt);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const anchor = `thread-${thread.threadId ?? thread.requestId}`;
  useEffect(() => {
    const reveal = () => { if (window.location.hash === `#${anchor}` && disclosure.current) disclosure.current.open = true; };
    reveal(); window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [anchor]);
  const work = thread.workContext;
  return <details className="journey-disclosure request-conversation" ref={disclosure} id={anchor}>
    <summary><span>{heading}<small>{thread.requestedAt ? `Requested ${formatDubaiDateTime(thread.requestedAt)} · ` : ""}{active.length} message{active.length === 1 ? "" : "s"}</small>{work ? <small>{work.employeeName} · {displayDate(work.date)} · {work.projectName}</small> : null}</span></summary>
    <section className="discussion-panel" aria-label={heading}>
    {work ? <div className="request-context"><strong>{work.employeeName} · {displayDate(work.date)} · {work.start}–{work.end}</strong><p>{work.clientName} · {work.projectName} · {work.locationName}</p></div> : null}
    <p className="operation-help">Private to the people named on this request. Messages cannot be edited; you can archive your own messages.</p>
    {active.length ? <ol className="discussion-messages">{active.map((message) => <li key={message.id}>
      <div><strong>{message.authorName}</strong><time dateTime={message.createdAt}>{formatDubaiDateTime(message.createdAt)}</time></div>
      <p>{message.content}</p>
      {message.isAuthor ? <Composer action={archiveDiscussionMessageAction} title={`Archive your message ${message.id}`} submit="Archive message" danger>
        <input type="hidden" name="messageId" value={message.id} />
        <input type="hidden" name="expectedVersion" value={message.version} />
      </Composer> : null}
    </li>)}</ol> : <p className="operation-empty">No messages yet.</p>}
    <Composer action={postDiscussionMessageAction} title={`Post a message in ${heading}`} submit="Send message">
      <input type="hidden" name="parentType" value="replacement_request" />
      <input type="hidden" name="parentId" value={thread.requestId} />
      <label>Message<textarea name="content" maxLength={2000} rows={3} required /></label>
    </Composer>
  </section></details>;
}
