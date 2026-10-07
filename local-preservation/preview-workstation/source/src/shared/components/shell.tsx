"use client";

import {
  IconArrowsExchange,
  IconBeach,
  IconBell,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconChartBar,
  IconChevronLeft,
  IconHistory,
  IconInbox,
  IconLayoutDashboard,
  IconLogout,
  IconMap2,
  IconMapPin,
  IconMenu2,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconTicket,
  IconUser,
  IconUsers,
  IconX,
  type IconProps,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { ModuleKey } from "@/modules/authorization/capabilities";
import type { ModuleDefinition, NavigationGroup } from "@/modules/navigation/navigation";
import { Brand } from "@/shared/components/brand";
import { DirectionToggle, ThemeToggle } from "@/shared/components/theme-provider";
import type { AuthenticatedActor } from "@/shared/types/foundation";

const moduleIcons: Record<ModuleKey, ComponentType<IconProps>> = {
  dashboard: IconLayoutDashboard,
  employees: IconUsers,
  clients: IconBuilding,
  projects: IconBriefcase,
  locations: IconMapPin,
  schedule: IconCalendar,
  map: IconMap2,
  leave: IconBeach,
  coverage: IconShieldCheck,
  replacements: IconArrowsExchange,
  notifications: IconBell,
  reports: IconChartBar,
  audit: IconHistory,
  settings: IconSettings,
  profile: IconUser,
  requests: IconInbox,
};

const groupOrder: NavigationGroup[] = ["Overview", "Workforce", "Operations", "Insights", "Account"];

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

function NavLinks({ items, close }: { items: ModuleDefinition[]; close?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Primary navigation" className="nav-links">
    {groupOrder.map((group) => {
      const groupItems = items.filter((item) => item.group === group);
      if (groupItems.length === 0) return null;
      const groupId = `nav-group-${group.toLowerCase()}`;
      return <section className="nav-group" aria-labelledby={groupId} key={group}>
        <h2 id={groupId}>{group}</h2>
        {groupItems.map((item) => {
          const Icon = moduleIcons[item.key];
          return <Link key={item.key} href={item.href} aria-current={isCurrentPath(pathname, item.href) ? "page" : undefined} onClick={close} title={item.label}>
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>;
        })}
      </section>;
    })}
    <section className="nav-group future-navigation" aria-labelledby="nav-group-future">
      <h2 id="nav-group-future">Future integration</h2>
      <span className="future-link" aria-disabled="true" title="Ticket System — planned for Phase 12">
        <IconTicket aria-hidden="true" />
        <span>Ticket System <small>Phase 12</small></span>
      </span>
    </section>
  </nav>;
}

async function logout(router: ReturnType<typeof useRouter>) {
  await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" } });
  router.push("/login");
  router.refresh();
}

export function ApplicationShell({ actor, navigation, title, children }: { actor: AuthenticatedActor; navigation: ModuleDefinition[]; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const mobilePrimary = navigation.filter((item) => item.mobilePrimary).slice(0, 4);
  const remaining = navigation.filter((item) => !mobilePrimary.includes(item));
  const canSearchEmployees = navigation.some((item) => item.key === "employees");

  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Brand compact={collapsed} />
        <button className="collapse-button" type="button" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}><IconChevronLeft aria-hidden="true" /></button>
      </div>
      <NavLinks items={navigation} />
      <div className="mock-badge"><span aria-hidden="true" />Mock authentication · Fictional data</div>
    </aside>

    <header className="top-header">
      <div className="mobile-brand"><Brand compact /></div>
      {canSearchEmployees ? <form className="global-search" action="/employees" method="get" role="search">
        <IconSearch aria-hidden="true" />
        <label className="visually-hidden" htmlFor="global-employee-search">Search employees</label>
        <input id="global-employee-search" name="query" type="search" placeholder="Search employees" maxLength={80} />
      </form> : <div className="header-context"><p className="eyebrow">ScopeIs</p><strong>{title}</strong></div>}
      <div className="header-actions">
        <Link href="/notifications" className="icon-button" aria-label="Open notifications" title="Open notifications"><IconBell aria-hidden="true" /></Link>
        <DirectionToggle />
        <ThemeToggle />
        <div className="persona" aria-label={`Signed in as ${actor.displayName}`}>
          <span className="persona-avatar" aria-hidden="true">{initials(actor.displayName)}</span>
          <span className="persona-copy"><strong>{actor.displayName}</strong><small>{actor.role.replaceAll("_", " ")}</small></span>
        </div>
        <button className="icon-button desktop-logout" type="button" aria-label="Log out" title="Log out" onClick={() => logout(router)}><IconLogout aria-hidden="true" /></button>
      </div>
    </header>

    <main id="main-content" className="main-content">
      <a className="skip-link" href="#page-content">Skip to content</a>
      <div id="page-content">{children}</div>
    </main>

    <nav className="bottom-nav" aria-label="Mobile primary navigation">
      {mobilePrimary.map((item) => {
        const Icon = moduleIcons[item.key];
        return <Link key={item.key} href={item.href} aria-current={isCurrentPath(pathname, item.href) ? "page" : undefined}>
          <Icon aria-hidden="true" />
          <small>{item.shortLabel ?? item.label}</small>
        </Link>;
      })}
      <button type="button" aria-label="Open more navigation" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}><IconMenu2 aria-hidden="true" /><small>More</small></button>
    </nav>

    {moreOpen ? <div className="mobile-sheet-backdrop" role="presentation" onMouseDown={() => setMoreOpen(false)}>
      <section className="mobile-sheet" role="dialog" aria-modal="true" aria-label="More navigation" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-header"><strong>More</strong><button className="icon-button" type="button" aria-label="Close more navigation" onClick={() => setMoreOpen(false)}><IconX aria-hidden="true" /></button></div>
        <NavLinks items={remaining} close={() => setMoreOpen(false)} />
        <button className="logout-button" type="button" onClick={() => logout(router)}><IconLogout aria-hidden="true" />Log out</button>
      </section>
    </div> : null}
  </div>;
}
