import { IconArrowLeft, IconClock, IconLock } from "@tabler/icons-react";
import Link from "next/link";

export function EmptyModule({ title, purpose, phase }: { title: string; purpose: string; phase: number }) {
  return <section className="empty-module" aria-labelledby="module-title">
    <span className="empty-module-icon"><IconClock aria-hidden="true" /></span>
    <span className="status-pill">Planned for Phase {phase}</span>
    <h1 id="module-title">{title}</h1>
    <p>{purpose}</p>
    <div className="phase-note"><IconLock aria-hidden="true" /><span><strong>No business actions are available here.</strong><small>The current working product scope is Phase 1–2. This page does not simulate persistence or success.</small></span></div>
    <Link className="button secondary" href="/dashboard"><IconArrowLeft aria-hidden="true" />Back to dashboard</Link>
  </section>;
}

export function SafeState({ title, message }: { title: string; message: string }) { return <main className="state-page"><h1>{title}</h1><p>{message}</p><Link className="button primary" href="/">Return to a safe page</Link></main>; }
