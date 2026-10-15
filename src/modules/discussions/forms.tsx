"use client";
import { displayText } from "@/shared/presentation/display-text";


import { useActionState, useEffect, useRef } from "react";
import { archiveDiscussionMessageAction, postDiscussionMessageAction, type DiscussionAction, type DiscussionActionState } from "@/modules/discussions/actions";
import type { DiscussionThreadView } from "@/modules/discussions/service";
import { formatDubaiDateTime } from "@/shared/format-date";
import { displayDate } from "@/modules/scheduling/calendar-dates";

const initial: DiscussionActionState = {};

function Feedback({ state }: { state: DiscussionActionState }) {
  return state.error ? <p className="operation-error" role="alert">{displayText(state.error)}</p> : state.success ? <p className="operation-success" role="status">{displayText(state.success)}</p> : null;
}

function Composer({ action, title, children, submit, danger = false }: { action: DiscussionAction; title: string; children: React.ReactNode; submit: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return <form className="operation-form compact" action={formAction} aria-label={displayText(title)}>{displayText(children)}<Feedback state={state} /><button className={`button ${danger ? "danger" : "primary"}`} type="submit" disabled={pending}>{displayText(pending ? "Saving…" : submit)}</button></form>;
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
    <summary><span>{displayText(heading)}<small>{displayText(thread.requestedAt ? `Requested ${formatDubaiDateTime(thread.requestedAt)} · ` : "")}{active.length} message{active.length === 1 ? "" : "s"}</small>{work ? <small>{displayText(work.employeeName)} · {displayText(displayDate(work.date))} · {displayText(work.projectName)}</small> : null}</span></summary>
    <section className="discussion-panel" aria-label={displayText(heading)}>
    {work ? <div className="request-context"><strong>{displayText(work.employeeName)} · {displayText(displayDate(work.date))} · {displayText(work.start)}–{displayText(work.end)}</strong><p>{displayText(work.clientName)} · {displayText(work.projectName)} · {displayText(work.locationName)}</p></div> : null}
    <p className="operation-help">Private to the people named on this request. Messages cannot be edited; you can archive your own messages.</p>
    {active.length ? <ol className="discussion-messages">{active.map((message) => <li key={message.id}>
      <div><strong>{displayText(message.authorName)}</strong><time dateTime={message.createdAt}>{displayText(formatDubaiDateTime(message.createdAt))}</time></div>
      <p>{displayText(message.content)}</p>
      {message.isAuthor ? <Composer action={archiveDiscussionMessageAction} title={displayText(`Archive your message ${message.id}`)} submit="Archive message" danger>
        <input type="hidden" name="messageId" value={message.id} />
        <input type="hidden" name="expectedVersion" value={message.version} />
      </Composer> : null}
    </li>)}</ol> : <p className="operation-empty">No messages yet.</p>}
    <Composer action={postDiscussionMessageAction} title={displayText(`Post a message in ${heading}`)} submit="Send message">
      <input type="hidden" name="parentType" value="replacement_request" />
      <input type="hidden" name="parentId" value={thread.requestId} />
      <label>Message<textarea name="content" maxLength={2000} rows={3} required /></label>
    </Composer>
  </section></details>;
}
