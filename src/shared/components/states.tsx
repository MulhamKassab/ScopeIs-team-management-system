import Link from "next/link";

export function EmptyModule({ title, purpose, phase }: { title: string; purpose: string; phase: number }) {
  return <section className="empty-module" aria-labelledby="module-title"><span className="status-pill">Planned for Phase {phase}</span><h2 id="module-title">{title}</h2><p>{purpose}</p><p className="phase-note">Not implemented in Phase 1</p></section>;
}

export function SafeState({ title, message }: { title: string; message: string }) { return <main className="state-page"><h1>{title}</h1><p>{message}</p><Link className="button primary" href="/">Return to a safe page</Link></main>; }
