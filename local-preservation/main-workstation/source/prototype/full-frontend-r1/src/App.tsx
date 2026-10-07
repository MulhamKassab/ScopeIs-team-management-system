import { useEffect } from "react";
import { DemoProvider, useDemo } from "./DemoContext";
import { personas } from "./fixtures";
import { Shell } from "./Shell";
import { usePathname } from "./router";
import type { Persona } from "./types";
import { AuditPage, NotificationsPage, ReportsPage, RequestDetailPage, RequestsPage, SettingsPage, TicketFuturePage } from "./pages/collaboration";
import { EntityDetailPage, EntityListPage, EntityNewPage } from "./pages/entities";
import { CoveragePage, LeavePage, PlanningMapPage, ReplacementDetailPage, ReplacementsPage } from "./pages/planning";
import { SchedulePage } from "./pages/schedule";
import { AccessDeniedPage, DashboardPage, EmployeeDetailPage, EmployeeNewPage, EmployeesPage, LoginPage, NotFoundPage, ProfilePage, SkillsPage } from "./pages/workforce";

function denied(pathname: string, persona: Persona) {
  if (persona.role === "SUPER_ADMIN") return false;
  const superOnly = ["/audit","/settings"];
  if (superOnly.some((route) => pathname.startsWith(route))) return true;
  if (persona.role === "ADMIN") return false;
  const managementOnly = ["/employees","/skills","/coverage","/replacements","/map","/reports"];
  return managementOnly.some((route) => pathname.startsWith(route));
}

function RouteView({ pathname, persona }: { pathname: string; persona: Persona }) {
  if (denied(pathname,persona)) return <AccessDeniedPage/>;
  if (pathname === "/" || pathname === "/dashboard") return <DashboardPage persona={persona}/>;
  if (pathname === "/employees") return <EmployeesPage persona={persona}/>;
  if (pathname === "/employees/new") return <EmployeeNewPage/>;
  if (pathname.startsWith("/employees/")) return <EmployeeDetailPage persona={persona} employeeId={pathname.split("/")[2]}/>;
  if (pathname === "/profile" || pathname === "/evidence") return <ProfilePage persona={persona}/>;
  if (pathname === "/skills") return <SkillsPage/>;
  if (pathname === "/clients") return <EntityListPage kind="clients" persona={persona}/>;
  if (pathname === "/clients/new") return <EntityNewPage kind="clients"/>;
  if (pathname.startsWith("/clients/")) return <EntityDetailPage kind="clients" id={pathname.split("/")[2]} persona={persona}/>;
  if (pathname === "/projects") return <EntityListPage kind="projects" persona={persona}/>;
  if (pathname === "/projects/new") return <EntityNewPage kind="projects"/>;
  if (pathname.startsWith("/projects/")) return <EntityDetailPage kind="projects" id={pathname.split("/")[2]} persona={persona}/>;
  if (pathname === "/locations") return <EntityListPage kind="locations" persona={persona}/>;
  if (pathname === "/locations/new") return <EntityNewPage kind="locations"/>;
  if (pathname.startsWith("/locations/")) return <EntityDetailPage kind="locations" id={pathname.split("/")[2]} persona={persona}/>;
  if (pathname === "/schedule" || pathname === "/my-schedule") return <SchedulePage persona={persona}/>;
  if (pathname === "/leave") return <LeavePage persona={persona}/>;
  if (pathname === "/coverage") return <CoveragePage/>;
  if (pathname.startsWith("/coverage/")) return <CoveragePage id={pathname.split("/")[2]}/>;
  if (pathname === "/replacements") return <ReplacementsPage persona={persona}/>;
  if (pathname.startsWith("/replacements/")) return <ReplacementDetailPage persona={persona} id={pathname.split("/")[2]}/>;
  if (pathname === "/map") return <PlanningMapPage persona={persona}/>;
  if (pathname === "/requests") return <RequestsPage persona={persona}/>;
  if (pathname.startsWith("/requests/")) return <RequestDetailPage persona={persona} id={pathname.split("/")[2]}/>;
  if (pathname === "/notifications") return <NotificationsPage persona={persona}/>;
  if (pathname === "/reports") return <ReportsPage persona={persona}/>;
  if (pathname === "/audit") return <AuditPage persona={persona}/>;
  if (pathname === "/settings") return <SettingsPage persona={persona}/>;
  if (pathname === "/ticket-system" || pathname === "/tickets") return <TicketFuturePage/>;
  return <NotFoundPage/>;
}

function AppContent() {
  const { state } = useDemo();
  const pathname = usePathname();
  const persona = personas.find((item) => item.id === state.personaId) ?? null;
  useEffect(() => { document.title = "ScopeIs Team Management · Frontend Concept"; },[]);
  if (!persona || pathname === "/login") return <LoginPage/>;
  return <Shell persona={persona} pathname={pathname}><RouteView pathname={pathname} persona={persona}/></Shell>;
}

export function App() {
  return <DemoProvider><AppContent/></DemoProvider>;
}
