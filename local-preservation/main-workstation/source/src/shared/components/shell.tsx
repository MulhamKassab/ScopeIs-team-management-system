"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bell, BriefcaseBusiness, CalendarDays, CalendarOff, ChartNoAxesCombined, ChevronDown, ChevronRight, ClipboardList, FileClock, FolderKanban, House, LogOut, MapPin, MapPinned, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Ticket, UserRound, UsersRound, Wrench, X, ArrowLeftRight, type LucideIcon } from "lucide-react";
import type { ModuleDefinition } from "@/modules/navigation/navigation";
import type { ModuleKey } from "@/modules/authorization/capabilities";
import { Brand } from "@/shared/components/brand";
import { ThemeToggle } from "@/shared/components/theme-provider";
import type { AuthenticatedActor } from "@/shared/types/foundation";
import { navigationGroups } from "@/modules/navigation/workspace-guide";
import { WorkspaceGuide } from "@/shared/components/workspace-guide";

const icons: Record<ModuleKey, LucideIcon> = { dashboard: House, employees: UsersRound, teams: UsersRound, designations: BriefcaseBusiness, accounts: ShieldCheck, skills: Wrench, clients: BriefcaseBusiness, projects: FolderKanban, locations: MapPin, schedule: CalendarDays, map: MapPinned, leave: CalendarOff, coverage: ClipboardList, replacements: ArrowLeftRight, notifications: Bell, reports: ChartNoAxesCombined, audit: FileClock, settings: Settings, profile: UserRound, requests: ClipboardList };
const mobileLabels: Partial<Record<ModuleKey, string>> = { dashboard: "Home", employees: "People", profile: "Profile" };
function initials(name: string) { return name.split(" ").map((word) => word[0]).join("").slice(0, 2); }
function selected(pathname: string, href: string) { return pathname === href || pathname.startsWith(`${href}/`); }
function NavLinks({ items, close }: { items: ModuleDefinition[]; close?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Primary navigation" className="nav-links">{navigationGroups.map((group) => {
    const links = group.keys.flatMap((key) => items.filter((item) => item.key === key));
    return links.length ? <div className="nav-group" key={group.label}><p className="nav-group-title">{group.label}</p>{links.map((item) => {
      const Icon = icons[item.key];
      return <Link key={item.key} href={item.href} title={item.label} aria-label={item.label} aria-current={selected(pathname, item.href) ? "page" : undefined} onClick={close}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span className="nav-label">{item.label}{item.key === "settings" ? <small className="nav-pending">Coming soon</small> : null}</span></Link>;
    })}</div> : null;
  })}<div className="nav-future"><span className="future-link" aria-disabled="true"><Ticket size={19} aria-hidden="true" /><span className="nav-label">Ticket System <small>Coming soon</small></span></span></div></nav>;
}

export function ApplicationShell({ actor, navigation, title, children }: { actor: AuthenticatedActor; navigation: ModuleDefinition[]; title: string; children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false); const [moreOpen, setMoreOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(""); const [loggingOut, setLoggingOut] = useState(false);
  const moreTrigger = useRef<HTMLButtonElement>(null); const moreDialog = useRef<HTMLElement>(null); const accountMenu = useRef<HTMLDetailsElement>(null);
  const moreExit = useRef<(() => void) | null>(null);
  const active = navigation.find((item) => selected(pathname, item.href));
  useEffect(() => {
    if (!moreOpen) return;
    const trigger = moreTrigger.current; const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    moreDialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const desktop = window.matchMedia?.("(min-width: 1025px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => { if (event.matches) setMoreOpen(false); };
    desktop?.addEventListener("change", closeOnDesktop);
    return () => {
      moreExit.current?.(); moreExit.current = null;
      desktop?.removeEventListener("change", closeOnDesktop); document.body.style.overflow = previousOverflow;
      if (desktop?.matches) document.querySelector<HTMLAnchorElement>('.sidebar a[aria-current="page"]')?.focus();
      else trigger?.focus();
    };
  }, [moreOpen]);
  function closeMore(animate = true) {
    const sheet = moreDialog.current;
    const finish = () => { moreExit.current?.(); moreExit.current = null; setMoreOpen(false); };
    if (!animate || !sheet || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || typeof sheet.getAnimations !== "function") { finish(); return; }
    if (moreExit.current) return;
    sheet.dataset.motionState = "closing";
    const style = getComputedStyle(sheet);
    const duration = Number.parseFloat(style.animationDuration) * (style.animationDuration.endsWith("ms") ? 1 : 1000);
    if (style.animationName !== "scopeis-sheet-exit" || !Number.isFinite(duration) || duration <= 0) { finish(); return; }
    const ended = (event: AnimationEvent) => { if (event.target === sheet && !event.pseudoElement && event.animationName === "scopeis-sheet-exit") finish(); };
    sheet.addEventListener("animationend", ended);
    sheet.addEventListener("animationcancel", ended);
    const timeout = window.setTimeout(finish, Math.min(duration, 2000) + 80);
    moreExit.current = () => { window.clearTimeout(timeout); sheet.removeEventListener("animationend", ended); sheet.removeEventListener("animationcancel", ended); };
  }
  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { event.preventDefault(); closeMore(); return; }
    if (event.key !== "Tab") return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]');
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  async function logout() {
    setLoggingOut(true); setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!response.ok) throw new Error("Logout failed");
      router.push("/login"); router.refresh();
    } catch { setLogoutError("We couldn’t sign you out. Please try again."); setLoggingOut(false); }
  }
  const mobilePrimary = navigation.filter((item) => item.mobilePrimary).slice(0, 4); const remaining = navigation.filter((item) => !mobilePrimary.includes(item));
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#page-content" inert={moreOpen}>Skip to content</a>
    <aside className="sidebar" inert={moreOpen}>
      <div className="sidebar-brand"><Brand compact={collapsed} /><button className="collapse-button" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}</button></div>
      <NavLinks items={navigation} />
      <div className="workspace-footer"><span className="workspace-status-dot" aria-hidden="true" /><span>{actor.authenticationMode === "mock" ? "Mock authentication" : "Team workspace"}</span></div>
    </aside>
    <header className="top-header" inert={moreOpen}>
      <div className="workspace-location"><span>Workspace</span><ChevronRight size={14} aria-hidden="true" /><span className="workspace-page-name">{active?.label ?? title}</span></div>
      <div className="header-actions"><WorkspaceGuide navigation={navigation} role={actor.role} /><Link href="/notifications" className="icon-button" aria-label="Open notifications"><Bell size={19} aria-hidden="true" /></Link><ThemeToggle />
        <details ref={accountMenu} className="account-menu" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
          <summary className="persona" aria-label={`Account menu for ${actor.displayName}`}><span className="avatar">{initials(actor.displayName)}</span><span className="persona-copy"><strong>{actor.displayName}</strong><small>{actor.role === "SUPER_ADMIN" ? "Super Admin" : actor.role === "ADMIN" ? "Admin" : "Employee"}</small></span><ChevronDown size={15} aria-hidden="true" /></summary>
          <div className="account-popover"><p>Signed in as <strong>{actor.displayName}</strong></p><Link href="/profile" onClick={() => { if (accountMenu.current) accountMenu.current.open = false; }}><UserRound size={17} aria-hidden="true" />My profile</Link><button type="button" onClick={logout} disabled={loggingOut}><LogOut size={17} aria-hidden="true" />{loggingOut ? "Signing out…" : "Log out"}</button>{logoutError ? <p role="alert" className="form-error">{logoutError}</p> : null}</div>
        </details>
      </div>
    </header>
    <main id="main-content" className="main-content" inert={moreOpen}><div id="page-content" tabIndex={-1}>{children}</div></main>
    <nav className="bottom-nav" aria-label="Mobile primary navigation" style={{ gridTemplateColumns: `repeat(${mobilePrimary.length + 1}, minmax(0, 1fr))` }} inert={moreOpen}>{mobilePrimary.map((item) => { const Icon = icons[item.key]; return <Link key={item.key} href={item.href} aria-label={item.label} aria-current={selected(pathname, item.href) ? "page" : undefined}><Icon size={21} aria-hidden="true" /><small>{mobileLabels[item.key] ?? item.label}</small></Link>; })}<button ref={moreTrigger} type="button" aria-haspopup="dialog" aria-controls="more-navigation" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}><MoreHorizontal size={23} aria-hidden="true" /><small>More</small></button></nav>
    {moreOpen && <div className="mobile-sheet-backdrop" role="presentation" onMouseDown={() => closeMore()}><section ref={moreDialog} id="more-navigation" className="mobile-sheet" role="dialog" aria-modal="true" aria-label="More navigation" onKeyDown={handleDialogKeyDown} onMouseDown={(event) => event.stopPropagation()}><div className="sheet-header"><strong>More</strong><button className="icon-button" aria-label="Close more navigation" onClick={() => closeMore()}><X size={20} aria-hidden="true" /></button></div><NavLinks items={remaining} close={() => closeMore(false)} /><button className="logout-button" onClick={logout} disabled={loggingOut}>{loggingOut ? "Signing out…" : "Log out"}</button>{logoutError ? <p role="alert" className="form-error">{logoutError}</p> : null}</section></div>}
  </div>;
}
