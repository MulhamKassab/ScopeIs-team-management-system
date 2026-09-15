"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  archiveNotificationAction, markAllNotificationsReadAction, setNotificationReadAction,
  type NotificationAction, type NotificationActionState,
} from "@/modules/notifications/actions";
import type { NotificationPage } from "@/modules/notifications/service";

const initial: NotificationActionState = {};

function Feedback({ state }: { state: NotificationActionState }) {
  return state.error ? <p className="operation-error" role="alert">{state.error}</p> : state.success ? <p className="operation-success" role="status">{state.success}</p> : null;
}

function ActionButton({ action, title, label, fields, danger = false }: { action: NotificationAction; title: string; label: string; fields: Record<string, string>; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return <form action={formAction} className="notification-action" aria-label={title}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <button className={`button ${danger ? "danger" : ""}`} type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>
    <Feedback state={state} />
  </form>;
}

const filterLabels: { key: string; label: string }[] = [
  { key: "all", label: "Active" },
  { key: "unread", label: "Unread" },
  { key: "archived", label: "Archived" },
];

export function NotificationCentre({ view, filter }: { view: NotificationPage; filter: string }) {
  return <section className="operations-page">
    <header className="operations-heading"><div><p className="eyebrow">Phase 10 notification centre</p><h2>Notifications</h2><p>{view.unreadCount} unread notification{view.unreadCount === 1 ? "" : "s"}. Read state and archive state are independent.</p></div>
      <ActionButton action={markAllNotificationsReadAction} title="Mark all notifications read" label="Mark all read" fields={{}} />
    </header>
    <nav className="notification-filters" aria-label="Notification filters">{filterLabels.map((entry) => <Link key={entry.key} className={entry.key === filter ? "button primary" : "button"} href={`/notifications?filter=${entry.key}`}>{entry.label}</Link>)}</nav>
    <ul className="operation-list notification-list">
      {view.items.map((item) => <li key={item.id}>
        <div>
          <strong>{item.title}</strong>
          <span>{item.summary}</span>
          <span className="notification-state">{item.isRead ? "Read" : "Unread"}{item.isArchived ? " · Archived" : ""} · {item.createdAt.slice(0, 16).replace("T", " ")}</span>
          {item.href ? <Link className="button" href={item.href}>Open related record</Link> : <span className="notification-unavailable">This notification has no available destination for your current access.</span>}
        </div>
        <div className="notification-controls">
          <ActionButton action={setNotificationReadAction} title={item.isRead ? "Mark this notification unread" : "Mark this notification read"} label={item.isRead ? "Mark unread" : "Mark read"} fields={{ notificationId: item.id, read: String(!item.isRead) }} />
          {item.isArchived
            ? <ActionButton action={archiveNotificationAction} title="Restore this notification" label="Restore" fields={{ notificationId: item.id, archived: "false" }} />
            : <ActionButton action={archiveNotificationAction} title="Archive this notification" label="Archive" danger fields={{ notificationId: item.id, archived: "true" }} />}
        </div>
      </li>)}
    </ul>
    {view.items.length ? null : <p className="operation-empty">No notification matches this filter.</p>}
    <nav className="notification-pagination" aria-label="Notification pages">
      {view.hasPrevious ? <Link className="button" href={`/notifications?filter=${filter}&page=${view.page - 1}`}>Previous</Link> : null}
      <span>Page {view.page} of {view.totalPages} · {view.total} notification{view.total === 1 ? "" : "s"}</span>
      {view.hasNext ? <Link className="button" href={`/notifications?filter=${filter}&page=${view.page + 1}`}>Next</Link> : null}
    </nav>
  </section>;
}
