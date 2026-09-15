"use client";

import { useActionState } from "react";
import { archiveDiscussionMessageAction, postDiscussionMessageAction, type DiscussionAction, type DiscussionActionState } from "@/modules/discussions/actions";
import type { DiscussionThreadView } from "@/modules/discussions/service";

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
  return <section className="discussion-panel" id={`thread-${thread.threadId ?? thread.requestId}`} aria-label={heading}>
    <h4>{heading}</h4>
    <p className="operation-help">Only the requester and the employees named on this request can see this discussion. Messages are plain text and cannot be edited; a sender may archive their own message.</p>
    {active.length ? <ol className="discussion-messages">{active.map((message) => <li key={message.id}>
      <div><strong>{message.authorName}</strong><span>{message.createdAt.slice(0, 16).replace("T", " ")}</span></div>
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
  </section>;
}
