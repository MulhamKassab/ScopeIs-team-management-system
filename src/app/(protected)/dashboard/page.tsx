import { IconArrowRight, IconCheck, IconClock, IconShieldCheck, IconUser, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";

export default async function DashboardPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const isEmployee = actor.role === "EMPLOYEE";
  const primaryHref = isEmployee ? "/profile" : "/employees";
  const primaryLabel = isEmployee ? "Open my profile" : "Open employee directory";
  const roleLabel = actor.role.replaceAll("_", " ");

  return <section className="dashboard-page" aria-labelledby="dashboard-title">
    <header className="page-heading">
      <div><p className="eyebrow">Overview</p><h1 id="dashboard-title">Good to see you, {actor.displayName.split(" ")[0]}</h1><p>Your role-aware home for the working ScopeIs foundation.</p></div>
      <Link className="button primary" href={primaryHref}>{primaryLabel}<IconArrowRight aria-hidden="true" /></Link>
    </header>

    <div className="dashboard-grid">
      <article className="role-card">
        <span className="card-icon"><IconShieldCheck aria-hidden="true" /></span>
        <div><p className="card-kicker">Current access</p><h2>{roleLabel}</h2><p>{actor.role === "SUPER_ADMIN" ? "Global employee management with explicit role and TEAM-scope controls." : actor.role === "ADMIN" ? "Read-only employee access limited to explicit TEAM grants." : "Private access to your own professional profile."}</p></div>
      </article>
      <article className="role-card">
        <span className="card-icon"><IconUsers aria-hidden="true" /></span>
        <div><p className="card-kicker">Working now</p><h2>Phase 1–2</h2><p>{isEmployee ? "Secure session and editable work contact details." : "Secure session, scoped directory, details, and employee workflows."}</p></div>
      </article>
      <article className="role-card">
        <span className="card-icon"><IconClock aria-hidden="true" /></span>
        <div><p className="card-kicker">Preview only</p><h2>Later modules</h2><p>Navigation is visible where authorized, but business actions remain honestly unavailable.</p></div>
      </article>
    </div>

    <section className="dashboard-panel" aria-labelledby="available-title">
      <div className="panel-heading"><div><p className="eyebrow">Available journeys</p><h2 id="available-title">Continue your work</h2></div><span className="status-pill working"><IconCheck aria-hidden="true" />Server-backed</span></div>
      <div className="journey-list">
        {!isEmployee ? <Link href="/employees"><span className="journey-icon"><IconUsers aria-hidden="true" /></span><span><strong>Employee directory</strong><small>{actor.role === "SUPER_ADMIN" ? "Search, filter, create, and manage employees." : "Browse employees in your granted TEAM scope."}</small></span><IconArrowRight aria-hidden="true" /></Link> : null}
        <Link href="/profile"><span className="journey-icon"><IconUser aria-hidden="true" /></span><span><strong>My professional profile</strong><small>Review your employee record and update allowed work details.</small></span><IconArrowRight aria-hidden="true" /></Link>
      </div>
    </section>
  </section>;
}
