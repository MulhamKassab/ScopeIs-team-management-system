import {
  IconAdjustments, IconBell, IconBriefcase, IconBuilding, IconCalendarMonth, IconChartBar,
  IconChevronLeft, IconClipboardCheck, IconFileDescription, IconGauge, IconHelpHexagon,
  IconHome, IconMap, IconMessageCircle, IconMoon, IconReportAnalytics, IconRotate, IconSearch,
  IconSettings, IconShieldLock, IconSun, IconTicket, IconTool, IconUsers, IconUser,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { useState } from "react";
import { personas } from "./fixtures";
import { useDemo } from "./DemoContext";
import { AppLink, navigate } from "./router";
import type { Persona, Role } from "./types";

type NavItem = { label: string; href: string; icon: ComponentType<{ size?: number; stroke?: number }>; roles: Role[]; mobile?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const all: Role[] = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"];
const manage: Role[] = ["SUPER_ADMIN", "ADMIN"];
const navGroups: NavGroup[] = [
  { label:"Overview", items:[{ label:"Dashboard", href:"/dashboard", icon:IconGauge, roles:all, mobile:true }] },
  { label:"Workforce", items:[{ label:"Employees", href:"/employees", icon:IconUsers, roles:manage, mobile:true },{ label:"Skills & capabilities", href:"/skills", icon:IconTool, roles:manage }] },
  { label:"Operations", items:[{ label:"Clients", href:"/clients", icon:IconBuilding, roles:all },{ label:"Projects", href:"/projects", icon:IconBriefcase, roles:all },{ label:"Locations", href:"/locations", icon:IconMap, roles:all }] },
  { label:"Planning", items:[{ label:"Schedule", href:"/schedule", icon:IconCalendarMonth, roles:all, mobile:true },{ label:"Leave", href:"/leave", icon:IconClipboardCheck, roles:all, mobile:true },{ label:"Coverage", href:"/coverage", icon:IconChartBar, roles:manage },{ label:"Replacements", href:"/replacements", icon:IconRotate, roles:manage, mobile:true },{ label:"Planning map", href:"/map", icon:IconMap, roles:manage }] },
  { label:"Collaboration", items:[{ label:"Requests & assignments", href:"/requests", icon:IconMessageCircle, roles:all, mobile:true },{ label:"Notifications", href:"/notifications", icon:IconBell, roles:all }] },
  { label:"Governance", items:[{ label:"Reports", href:"/reports", icon:IconReportAnalytics, roles:manage },{ label:"Audit", href:"/audit", icon:IconShieldLock, roles:["SUPER_ADMIN"] },{ label:"Settings", href:"/settings", icon:IconSettings, roles:["SUPER_ADMIN"] }] },
];

function initials(name: string) { return name.split(" ").map((word) => word[0]).join("").slice(0,2); }

function navFor(persona: Persona) {
  if (persona.role === "EMPLOYEE") {
    return navGroups.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(persona.role)) })).filter((group) => group.items.length > 0);
  }
  return navGroups.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(persona.role)) })).filter((group) => group.items.length > 0);
}

export function Shell({ persona, pathname, children }: { persona: Persona; pathname: string; children: React.ReactNode }) {
  const { state, theme, direction, collapsed, toggleTheme, toggleDirection, toggleCollapsed, setPersona, reset, toast } = useDemo();
  const [moreOpen, setMoreOpen] = useState(false);
  const groups = navFor(persona);
  const mobileItems = groups.flatMap((group) => group.items).filter((item) => item.mobile).slice(0,4);
  const unread = state.notifications.filter((item) => !item.read && !item.archived && (persona.role === "SUPER_ADMIN" ? item.recipient === "Nora Albright" || item.recipient === "All affected employees" : item.recipient === persona.name || item.recipient === "All affected employees")).length;

  return <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar" aria-label="Application navigation">
      <div className="brand-row"><AppLink href="/dashboard" className="brand-link"><span className="logo-surface"><img src="/brand/scopeis-logo.png" alt="SCOPE Information Systems" /></span>{!collapsed ? <span>Team Management</span> : null}</AppLink><button className="icon-button collapse" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} onClick={toggleCollapsed}><IconChevronLeft size={19} /></button></div>
      <nav>{groups.map((group) => <section className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map((item) => { const Icon = item.icon; const selected = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)); return <AppLink key={item.href} href={item.href} className={`nav-item ${selected ? "selected" : ""}`} title={collapsed ? item.label : undefined}><Icon size={18} stroke={1.8} /><span>{item.label}</span></AppLink>; })}</section>)}</nav>
      <section className="nav-group later"><p>Later</p><button className="nav-item future" disabled title="Later integration after workforce journeys are stable."><IconTicket size={18} /><span>Ticket System · Phase 12</span></button></section>
      <button className="sidebar-reset" onClick={() => { if (window.confirm("Reset all fictional demo changes?")) reset(); }}><IconRotate size={16} /><span>Reset demo data</span></button>
    </aside>
    <header className="topbar">
      <div className="global-search"><IconSearch size={18} aria-hidden="true" /><input aria-label="Search employees, clients, and projects" placeholder="Search employees, clients, projects…" /></div>
      <span className="concept-badge">Frontend concept · fictional data · no production backend</span>
      <div className="top-actions">
        <AppLink href="/notifications" className="icon-button notification-button" title="Notifications"><IconBell size={20} /><span>{unread}</span></AppLink>
        <button className="icon-button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={toggleTheme}>{theme === "light" ? <IconMoon size={20} /> : <IconSun size={20} />}</button>
        <button className="icon-button rtl-toggle" aria-label={`Preview ${direction === "ltr" ? "right-to-left" : "left-to-right"} layout`} onClick={toggleDirection}>{direction === "ltr" ? "RTL" : "LTR"}</button>
        <label className="persona-control"><span className="avatar">{initials(persona.name)}</span><span className="persona-copy"><strong>{persona.name}</strong><small>{persona.role.replace("_"," ")} · {persona.scope}</small></span><select aria-label="Switch fictional persona" value={persona.id} onChange={(event) => { setPersona(event.target.value); navigate("/dashboard"); }}>{personas.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.role.replace("_"," ")}</option>)}</select></label>
        <button className="signout-button" onClick={() => { setPersona(null); navigate("/login"); }}>Sign out</button>
      </div>
    </header>
    <main id="main-content" className="main-content">{children}</main>
    <nav className="bottom-nav" aria-label="Mobile primary navigation">{mobileItems.map((item) => { const Icon = item.icon; return <AppLink key={item.href} href={item.href} className={pathname === item.href ? "selected" : ""}><Icon size={22} /><span>{item.label === "Requests & assignments" ? "Requests" : item.label}</span></AppLink>; })}<button onClick={() => setMoreOpen(true)}><IconAdjustments size={22} /><span>More</span></button></nav>
    {moreOpen ? <div className="mobile-more-backdrop" onMouseDown={() => setMoreOpen(false)}><section className="mobile-more" role="dialog" aria-modal="true" aria-label="More navigation" onMouseDown={(event) => event.stopPropagation()}><header><strong>More</strong><button className="icon-button" onClick={() => setMoreOpen(false)} aria-label="Close more navigation">×</button></header>{groups.flatMap((group) => group.items).map((item) => { const Icon = item.icon; return <AppLink key={item.href} href={item.href} className="nav-item" title={item.label}><Icon size={19} /><span>{item.label}</span></AppLink>; })}<button className="nav-item" onClick={() => { setPersona(null); navigate("/login"); }}><IconUser size={19}/><span>Return to persona screen</span></button><button className="nav-item" onClick={() => setMoreOpen(false)}><IconHelpHexagon size={19}/><span>Close menu</span></button></section></div> : null}
    {toast ? <div className="toast" role="status" aria-live="polite">{toast}</div> : null}
  </div>;
}
