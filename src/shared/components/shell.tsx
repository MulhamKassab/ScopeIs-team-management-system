"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ModuleDefinition } from "@/modules/navigation/navigation";
import { Brand } from "@/shared/components/brand";
import { ThemeToggle } from "@/shared/components/theme-provider";
import type { AuthenticatedActor } from "@/shared/types/foundation";

function initials(name: string) { return name.split(" ").map((word) => word[0]).join("").slice(0, 2); }
function NavLinks({ items, close }: { items: ModuleDefinition[]; close?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Primary navigation" className="nav-links">{items.map((item) => <Link key={item.key} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={close}><span aria-hidden="true">{item.label[0]}</span><span>{item.label}</span></Link>)}<span className="future-link" aria-disabled="true"><span aria-hidden="true">T</span><span>Ticket System <small>Phase 9</small></span></span></nav>;
}
async function logout(router: ReturnType<typeof useRouter>) { await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" } }); router.push("/login"); router.refresh(); }

export function ApplicationShell({ actor, navigation, title, children }: { actor: AuthenticatedActor; navigation: ModuleDefinition[]; title: string; children: React.ReactNode }) {
  const router = useRouter(); const [collapsed, setCollapsed] = useState(false); const [moreOpen, setMoreOpen] = useState(false);
  const mobilePrimary = navigation.filter((item) => item.mobilePrimary).slice(0, 4); const remaining = navigation.filter((item) => !mobilePrimary.includes(item));
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="sidebar"><div className="sidebar-brand"><Brand compact={collapsed} /><button className="collapse-button" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>‹</button></div><NavLinks items={navigation} /><div className="mock-badge">Mock authentication</div></aside>
    <header className="top-header"><div><p className="eyebrow">ScopeIs Team Management</p><h1>{title}</h1></div><div className="header-actions"><Link href="/notifications" className="icon-button" aria-label="Open notifications">◌</Link><ThemeToggle /><button className="persona" type="button" onClick={() => logout(router)} aria-label="Log out"><span>{initials(actor.displayName)}</span><span className="persona-copy"><strong>{actor.displayName}</strong><small>{actor.role.replace("_", " ")}</small></span></button></div></header>
    <main id="main-content" className="main-content"><a className="skip-link" href="#page-content">Skip to content</a><div id="page-content">{children}</div></main>
    <nav className="bottom-nav" aria-label="Mobile primary navigation">{mobilePrimary.map((item) => <Link key={item.key} href={item.href}><span aria-hidden="true">{item.label[0]}</span><small>{item.label === "Employees & capabilities" ? "Team" : item.label}</small></Link>)}<button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}><span aria-hidden="true">•••</span><small>More</small></button></nav>
    {moreOpen && <div className="mobile-sheet-backdrop" role="presentation" onMouseDown={() => setMoreOpen(false)}><section className="mobile-sheet" role="dialog" aria-modal="true" aria-label="More navigation" onMouseDown={(event) => event.stopPropagation()}><div className="sheet-header"><strong>More</strong><button className="icon-button" aria-label="Close more navigation" onClick={() => setMoreOpen(false)}>×</button></div><NavLinks items={remaining} close={() => setMoreOpen(false)} /><button className="logout-button" onClick={() => logout(router)}>Log out</button></section></div>}
  </div>;
}
