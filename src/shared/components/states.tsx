import Link from "next/link";

export function EmptyModule({ title, purpose, phase }: { title: string; purpose: string; phase: number }) {
  return <section className="empty-module" aria-labelledby="module-title"><span className="status-pill">Coming soon</span><h2 id="module-title">{title}</h2><p>{title === "Settings" ? "Workspace settings are not available yet. You can already manage your people, accounts and schedules from the navigation." : purpose}</p><Link className="button primary" href="/dashboard">Back to dashboard</Link><details className="supporting-details"><summary>About this section</summary><p>This section is planned and has no editable settings yet. Implementation reference: Phase {phase}.</p></details></section>;
}

export function SafeState({ title, message }: { title: string; message: string }) { return <main className="state-page"><h1>{title}</h1><p>{message}</p><Link className="button primary" href="/">Return to a safe page</Link></main>; }
