"use client";
import { displayText } from "@/shared/presentation/display-text";


import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Archive, ArrowRight, CheckCircle2, Folder, Layers, LayoutGrid, List, Plus, Search, Ticket, Users } from "lucide-react";
import { TaskDialog } from "@/shared/components/task-dialog";
import type { SystemRole } from "@/shared/types/foundation";
import type { TicketBoard, TicketSummary, TicketWorkspace, TicketWorkspaceData } from "./types";
import { TicketActionForm, TicketFields, TicketPeopleFields, readTicketFields } from "./forms";
import { boardStatusLabels, ticketDate, ticketNumber, ticketPriorities, ticketPriorityLabels, ticketStatuses, ticketStatusLabels } from "./presentation";
import { readTicketFilters, ticketDetailHref, ticketRelationLabels, ticketWorkspaceHref, type TicketFilters, type TicketRelation } from "./navigation";

type Filters = TicketFilters;
type Actor = { id: string; displayName: string; role: SystemRole };

export function filterCompanyTickets(data: TicketWorkspaceData, filters: Pick<Filters, "workspace" | "board" | "search" | "status" | "priority" | "view"> & { relation?: TicketRelation }) {
  const search = filters.search.trim().toLocaleLowerCase();
  return data.tickets.filter((ticket) => {
    const board = data.boards.find((entry) => entry.id === ticket.boardId);
    const archived = Boolean(ticket.archivedAt) || board?.status === "ARCHIVED";
    if (filters.view === "archive" ? !archived : archived) return false;
    if (filters.workspace && board?.workspaceId !== filters.workspace) return false;
    if (filters.board && ticket.boardId !== filters.board) return false;
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (filters.relation && filters.relation !== "all" && !ticket.myParticipation[filters.relation]) return false;
    const workspace = data.workspaces.find((entry) => entry.id === board?.workspaceId);
    return !search || [ticket.subject, ticketNumber(ticket.number), ticket.creatorName, workspace?.name ?? "", board?.name ?? "", ...ticket.assignees.map((person) => person.displayName)].some((text) => text.toLocaleLowerCase().includes(search));
  });
}

function NewTicket({ data, actor, refresh, returnTo, preferredBoardId = "", preferredWorkspaceId = "" }: { data: TicketWorkspaceData; actor: Actor; refresh: () => Promise<void>; returnTo: string; preferredBoardId?: string; preferredWorkspaceId?: string }) {
  const available = data.boards.filter((board) => board.status !== "ARCHIVED" && (board.canManage || board.status === "PUBLISHED"));
  const preferred = available.find((board) => board.id === preferredBoardId);
  const workspaces = data.workspaces.filter((workspace) => available.some((board) => board.workspaceId === workspace.id));
  const [workspaceId, setWorkspaceId] = useState(preferred?.workspaceId ?? (workspaces.some((workspace) => workspace.id === preferredWorkspaceId) ? preferredWorkspaceId : workspaces[0]?.id ?? ""));
  const selectedWorkspaceId = workspaces.some((workspace) => workspace.id === workspaceId) ? workspaceId : workspaces[0]?.id;
  const dashboards = available.filter((board) => board.workspaceId === selectedWorkspaceId);
  const [boardId, setBoardId] = useState(preferred?.id ?? "");
  const board = dashboards.find((entry) => entry.id === boardId) ?? dashboards[0];
  const [created, setCreated] = useState<{ id: string; refreshFailed?: boolean } | null>(null);
  const [creationKey, setCreationKey] = useState(0);
  const successHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (created) successHeading.current?.focus(); }, [created]);
  if (created) return <div className="ticket-created">
    <CheckCircle2 size={28} aria-hidden="true" /><h3 ref={successHeading} tabIndex={-1}>Ticket created</h3>
    <p role="status">Your ticket is saved. Open it to see the details and start work.</p>
    {created.refreshFailed ? <p className="operation-help">The ticket list could not be refreshed. Your ticket is saved and can be opened below.</p> : null}
    <Link className="button primary" href={ticketDetailHref(created.id, returnTo)}>Open ticket<ArrowRight size={17} aria-hidden="true" /></Link>
    <button type="button" className="button" onClick={() => { setCreated(null); setCreationKey((key) => key + 1); }}>Create another</button>
  </div>;
  if (!board) return <p className="record-empty">A manager needs to create a workspace and publish a dashboard before you can create tickets.</p>;
  return <TicketActionForm key={creationKey} label="Create ticket" submit="Create ticket" successMessage="Ticket created." onSuccess={async (result) => {
    if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string" || !result.id) throw new Error("Missing ticket ID");
    const id = result.id;
    setCreated({ id });
    try { await refresh(); } catch { setCreated({ id, refreshFailed: true }); }
  }} onConflict={refresh}
    getCommand={(form) => ({ action: "createTicket", boardId: board.id, version: board.version, ...readTicketFields(form),
      assigneeIds: form.getAll("assigneeIds").map(String), observerIds: form.getAll("observerIds").map(String) })}>
    <div className="operation-form-grid">
      <label>Workspace<select value={selectedWorkspaceId} onChange={(event) => { setWorkspaceId(event.target.value); setBoardId(""); }}>{workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{displayText(workspace.name)}</option>)}</select></label>
      <label>Dashboard<select value={board.id} onChange={(event) => setBoardId(event.target.value)}>{dashboards.map((entry) => <option value={entry.id} key={entry.id}>{displayText(entry.name)}</option>)}</select></label>
    </div>
    <TicketFields compact><TicketPeopleFields people={data.people} creatorUserId={actor.id} compact /></TicketFields>
  </TicketActionForm>;
}

function NewWorkspace({ data, actor, refresh }: { data: TicketWorkspaceData; actor: Actor; refresh: () => Promise<void> }) {
  const [clientId, setClientId] = useState("");
  const projects = data.projects.filter((project) => !clientId || project.clientId === clientId);
  return <TicketActionForm label="Create workspace" submit="Create workspace" onSuccess={refresh} resetOnSuccess
    getCommand={(form) => ({ action: "createWorkspace", name: String(form.get("name") ?? ""), description: String(form.get("description") ?? ""), clientId: String(form.get("clientId") ?? "") || null, projectId: String(form.get("projectId") ?? "") || null })}>
    <label>Name<input name="name" maxLength={120} required data-dialog-autofocus /></label>
    <label>Description · optional<textarea name="description" maxLength={1000} rows={3} /></label>
    <label>Client link · optional<select name="clientId" value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">No client link</option>{data.clients.map((client) => <option value={client.id} key={client.id}>{displayText(client.name)}</option>)}</select></label>
    <label>Project link · optional<select name="projectId" key={clientId} defaultValue=""><option value="">No project link</option>{projects.map((project) => <option value={project.id} key={project.id}>{displayText(project.name)}</option>)}</select></label>
    <p className="operation-help">A workspace contains dashboards, and each dashboard contains tickets. {actor.role === "ADMIN" ? "Choose a Client or Project within your current scope." : "Unlinked workspaces are managed by Super Admin."}</p>
  </TicketActionForm>;
}

function WorkspacePeople({ workspace, data, refresh }: { workspace: TicketWorkspace; data: TicketWorkspaceData; refresh: () => Promise<void> }) {
  const eligible = data.membershipPeople[workspace.id] ?? [];
  const available = eligible.filter((person) => !workspace.members.some((member) => member.userId === person.userId));
  return <div className="ticket-container-settings">
    <p className="operation-help">Give workspace access to people available within your scope. Ticket assignees and mentions are selected separately from all company people.</p>
    <ul className="ticket-person-list">{workspace.members.map((member) => <li key={member.userId}><div><strong>{displayText(member.displayName)}</strong><small>{displayText(member.role.replaceAll("_", " ").toLowerCase())}</small></div>
      <TicketActionForm label={displayText(`Remove ${member.displayName} from workspace`)} submit="Remove access" danger onSuccess={refresh} onConflict={refresh}
        getCommand={() => ({ action: "setWorkspaceMember", workspaceId: workspace.id, userId: member.userId, active: false, version: workspace.version })}><span className="sr-only">Membership removal preserves ticket history.</span></TicketActionForm>
    </li>)}</ul>
    {available.length ? <TicketActionForm label="Add workspace access" submit="Add access" onSuccess={refresh} onConflict={refresh}
      getCommand={(form) => ({ action: "setWorkspaceMember", workspaceId: workspace.id, userId: String(form.get("userId")), active: true, version: workspace.version })}>
      <label>Person<select name="userId" required>{available.map((person) => <option key={person.userId} value={person.userId}>{displayText(person.displayName)}</option>)}</select></label>
    </TicketActionForm> : <p className="record-empty">No additional people are available within your scope.</p>}
  </div>;
}

function WorkspaceSettings({ workspace, refresh }: { workspace: TicketWorkspace; refresh: () => Promise<void> }) {
  return <TicketActionForm label={displayText(`Edit workspace ${workspace.name}`)} onSuccess={refresh} onConflict={refresh}
    getCommand={(form) => ({ action: "updateWorkspace", workspaceId: workspace.id, version: workspace.version, name: String(form.get("name")), description: String(form.get("description") ?? "") })}>
    <label>Name<input name="name" defaultValue={workspace.name} maxLength={120} required data-dialog-autofocus /></label>
    <label>Description · optional<textarea name="description" defaultValue={workspace.description ?? ""} maxLength={1000} rows={3} /></label>
  </TicketActionForm>;
}

function BoardSettings({ board, refresh }: { board: TicketBoard; refresh: () => Promise<void> }) {
  return <TicketActionForm label={displayText(`Edit ${board.name}`)} onSuccess={refresh} onConflict={refresh}
    getCommand={(form) => ({ action: "updateBoard", boardId: board.id, version: board.version, name: String(form.get("name")), status: String(form.get("status")) })}>
    <label>Name<input name="name" defaultValue={board.name} maxLength={120} required /></label>
    <label>Dashboard lifecycle<select name="status" defaultValue={board.status}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
    <p className="operation-help">Publishing lets everyone in the company create tickets here. People see the tickets they create, are assigned to or are mentioned in. Archiving retains ticket history.</p>
  </TicketActionForm>;
}

function TicketCard({ ticket, data, returnTo, compact = false }: { ticket: TicketSummary; data: TicketWorkspaceData; returnTo: string; compact?: boolean }) {
  const board = data.boards.find((entry) => entry.id === ticket.boardId);
  const workspace = data.workspaces.find((entry) => entry.id === board?.workspaceId);
  const href = ticketDetailHref(ticket.id, returnTo);
  return <li className={`ticket-card ${compact ? "ticket-card-compact" : ""}`}>
    <div className="ticket-card-main"><span className="ticket-number">{displayText(ticketNumber(ticket.number))}</span><Link href={href} className="ticket-subject">{displayText(ticket.subject)}</Link><span className="ticket-context">{displayText(workspace?.name)} · {displayText(board?.name)}</span><span className="ticket-relationships">{ticket.myParticipation.created ? <span>Created by you</span> : null}{ticket.myParticipation.assigned ? <span>Assigned to you</span> : null}{ticket.myParticipation.mentioned ? <span>Mentioned</span> : null}</span></div>
    <div className="ticket-badges"><span className={`ticket-badge ticket-status-${ticket.status.toLowerCase()}`}>{ticketStatusLabels[ticket.status]}</span><span className={`ticket-badge ticket-priority-${ticket.priority.toLowerCase()}`}>{ticketPriorityLabels[ticket.priority]}</span></div>
    <div className="ticket-card-meta"><span>{displayText(ticket.assignees.map((person) => person.displayName).join(", ") || `Created by ${ticket.creatorName}`)}</span><span>{displayText(ticket.dueDate ? `Due ${ticketDate(ticket.dueDate)}` : ticketDate(ticket.ticketDate))}</span>{ticket.permissions.edit ? <span>Can update</span> : <span>Read only</span>}</div>
    <Link className="ticket-open" href={href} aria-label={displayText(`Open ${ticketNumber(ticket.number)}: ${ticket.subject}`)}><ArrowRight size={18} aria-hidden="true" /></Link>
  </li>;
}

export function TicketWorkspaceView({ initialData, actor, initialQuery = {} }: { initialData: TicketWorkspaceData; actor: Actor; initialQuery?: Record<string, string> }) {
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState<Filters>(() => readTicketFilters(initialQuery));
  useEffect(() => {
    const restore = () => setFilters(readTicketFilters(Object.fromEntries(new URLSearchParams(window.location.search))));
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  async function refresh() {
    const response = await fetch("/api/tickets", { credentials: "same-origin", cache: "no-store" });
    const next = await response.json() as TicketWorkspaceData & { message?: string };
    if (!response.ok) throw new Error(next.message ?? "The workspace could not be reloaded.");
    setData(next); setNotice("The latest ticket workspace is loaded.");
  }
  function change(update: Partial<Filters>) {
    const next = { ...filters, ...update };
    if (update.workspace !== undefined && update.board === undefined) next.board = "";
    setFilters(next);
    window.history.replaceState(window.history.state, "", ticketWorkspaceHref(next));
  }
  const tickets = filterCompanyTickets(data, filters);
  const activeBoards = data.boards.filter((board) => (filters.view === "archive" || filters.view === "workspaces" || board.status !== "ARCHIVED") && (!filters.workspace || board.workspaceId === filters.workspace));
  const returnTo = ticketWorkspaceHref(filters);
  const hasFilters = Boolean(filters.workspace || filters.board || filters.search || filters.status || filters.priority || filters.relation !== "all");
  const clearFilters = () => change({ workspace: "", board: "", search: "", status: "", priority: "", relation: "all" });
  const chips = [
    ...(filters.search ? [{ key: "search" as const, label: `Search: ${filters.search}` }] : []),
    ...(filters.workspace ? [{ key: "workspace" as const, label: data.workspaces.find((entry) => entry.id === filters.workspace)?.name ?? "Workspace filter" }] : []),
    ...(filters.board ? [{ key: "board" as const, label: data.boards.find((entry) => entry.id === filters.board)?.name ?? "Dashboard filter" }] : []),
    ...(filters.status ? [{ key: "status" as const, label: ticketStatusLabels[filters.status as typeof ticketStatuses[number]] }] : []),
    ...(filters.priority ? [{ key: "priority" as const, label: `${ticketPriorityLabels[filters.priority as typeof ticketPriorities[number]]} priority` }] : []),
    ...(filters.relation !== "all" ? [{ key: "relation" as const, label: ticketRelationLabels[filters.relation] }] : []),
  ];
  const canCreate = data.boards.some((board) => board.status !== "ARCHIVED" && (board.canManage || board.status === "PUBLISHED"));
  const isManager = actor.role !== "EMPLOYEE";
  const open = tickets.filter((ticket) => ticket.status !== "CLOSED");
  const critical = open.filter((ticket) => ticket.priority === "CRITICAL" || ticket.priority === "HIGH");
  const holding = tickets.filter((ticket) => ticket.status === "ON_HOLD");
  return <section className="ticket-workspace" aria-labelledby="ticket-workspace-title">
    <header className="ticket-workspace-heading"><div><p className="eyebrow">Company work</p><h1 id="ticket-workspace-title">Tickets</h1><p>All tickets you can access, across every workspace and dashboard.</p></div>
      <div className="ticket-heading-actions">{canCreate ? <TaskDialog triggerLabel="New ticket" title="Create a ticket" dismissOnNavigate triggerIcon={<Plus size={18} aria-hidden="true" />}><NewTicket data={data} actor={actor} refresh={refresh} returnTo={returnTo} preferredBoardId={filters.board} preferredWorkspaceId={filters.workspace} /></TaskDialog> : null}
      <button className="icon-button" type="button" aria-label="Reload tickets" onClick={async () => { try { await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "The workspace could not be reloaded."); } }}><Ticket size={18} aria-hidden="true" /></button></div>
    </header>
    <nav className="ticket-view-tabs" aria-label="Ticket views">
      <button type="button" aria-pressed={filters.view === "tickets"} onClick={() => change({ view: "tickets" })}><Ticket size={17} aria-hidden="true" />Tickets</button>
      <button type="button" aria-pressed={filters.view === "overview"} onClick={() => change({ view: "overview" })}><LayoutGrid size={17} aria-hidden="true" />Overview</button>
      <button type="button" aria-pressed={filters.view === "workspaces"} onClick={() => change({ view: "workspaces" })}><Layers size={17} aria-hidden="true" />Workspaces</button>
      <button type="button" aria-pressed={filters.view === "archive"} onClick={() => change({ view: "archive" })}><Archive size={17} aria-hidden="true" />Archive</button>
    </nav>
    {notice ? <p className="operation-help ticket-notice" role="status">{displayText(notice)}</p> : null}
    <nav className="ticket-relation-tabs" aria-label="Your ticket relationships">{(Object.keys(ticketRelationLabels) as TicketRelation[]).map((relation) => <button type="button" key={relation} aria-pressed={filters.relation === relation} onClick={() => change({ relation })}>{displayText(ticketRelationLabels[relation])}</button>)}</nav>
    <div className="ticket-filter-bar">
        <label className="ticket-search"><span>Search tickets</span><span className="ticket-search-input"><Search size={17} aria-hidden="true" /><input value={filters.search} maxLength={200} placeholder="Subject, ticket number or person" onChange={(event) => change({ search: event.target.value })} /></span></label>
        <label>Workspace<select value={filters.workspace} onChange={(event) => change({ workspace: event.target.value })}><option value="">All workspaces</option>{data.workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{displayText(workspace.name)}</option>)}</select></label>
        <label>Dashboard<select value={filters.board} onChange={(event) => change({ board: event.target.value })}><option value="">All dashboards</option>{activeBoards.map((board) => <option value={board.id} key={board.id}>{displayText(board.name)}</option>)}</select></label>
    </div>
    <details className="ticket-filter-options"><summary>Status and priority{filters.status || filters.priority ? " · filtered" : ""}</summary><div className="ticket-filter-bar ticket-filter-bar-secondary">
      <label>Status<select value={filters.status} onChange={(event) => change({ status: event.target.value })}><option value="">All statuses</option>{ticketStatuses.map((status) => <option key={status} value={status}>{ticketStatusLabels[status]}</option>)}</select></label>
      <label>Priority<select value={filters.priority} onChange={(event) => change({ priority: event.target.value })}><option value="">All priorities</option>{ticketPriorities.map((priority) => <option key={priority} value={priority}>{ticketPriorityLabels[priority]}</option>)}</select></label>
    </div></details>
    {hasFilters ? <div className="ticket-active-filters" aria-label="Active ticket filters">{chips.map((chip) => <button type="button" className="ticket-filter-chip" key={chip.key} aria-label={displayText(`Remove ${chip.label} filter`)} onClick={() => change({ [chip.key]: chip.key === "relation" ? "all" : "" })}>{displayText(chip.label)}<span aria-hidden="true">×</span></button>)}<button className="button" type="button" onClick={clearFilters}>Clear filters</button></div> : null}
    {filters.view === "workspaces" && hasFilters ? <p className="operation-help">Filters are retained. Dashboard counts show matching tickets you can access.</p> : null}
    {filters.view !== "workspaces" ? <>
      {filters.view === "overview" ? <div className="ticket-overview">
        <div className="ticket-metrics" aria-label="Matching ticket overview"><article><Ticket aria-hidden="true" size={20} /><strong>{open.length}</strong><span>Active tickets</span></article><article><Layers aria-hidden="true" size={20} /><strong>{critical.length}</strong><span>High or critical</span></article><article><Archive aria-hidden="true" size={20} /><strong>{holding.length}</strong><span>On hold</span></article><article><CheckCircle2 aria-hidden="true" size={20} /><strong>{tickets.length - open.length}</strong><span>Closed</span></article></div>
        <div className="ticket-overview-heading"><h2>Workspaces</h2><button className="button" type="button" onClick={() => change({ view: "tickets" })}>Open matching tickets<ArrowRight size={16} aria-hidden="true" /></button></div>
        <div className="ticket-workspace-cards">{data.workspaces.filter((workspace) => !filters.workspace || workspace.id === filters.workspace).map((workspace) => {
          const matching = tickets.filter((ticket) => data.boards.some((board) => board.id === ticket.boardId && board.workspaceId === workspace.id));
          const dashboardCount = activeBoards.filter((board) => board.workspaceId === workspace.id).length;
          return <article key={workspace.id}><Folder size={22} aria-hidden="true" /><h3>{displayText(workspace.name)}</h3>{workspace.description ? <p>{displayText(workspace.description)}</p> : null}<span>{dashboardCount} dashboard{dashboardCount === 1 ? "" : "s"} · {matching.length} matching ticket{matching.length === 1 ? "" : "s"}</span><button type="button" className="button" onClick={() => change({ workspace: workspace.id, view: "workspaces" })}>Open dashboards<ArrowRight size={16} aria-hidden="true" /></button></article>;
        })}</div>
        <h2>Needs attention</h2>{tickets.filter((ticket) => ticket.status === "ON_HOLD" || (ticket.status !== "CLOSED" && ["HIGH", "CRITICAL"].includes(ticket.priority))).length ? <ul className="ticket-list">{tickets.filter((ticket) => ticket.status === "ON_HOLD" || (ticket.status !== "CLOSED" && ["HIGH", "CRITICAL"].includes(ticket.priority))).slice(0, 8).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} data={data} returnTo={returnTo} />)}</ul> : <p className="record-empty">No matching tickets need attention.</p>}
      </div> : <>
        <div className="ticket-list-heading"><h2>{filters.view === "archive" ? "Archived tickets" : hasFilters ? "Matching tickets" : "All accessible tickets"}<span>{tickets.length}</span></h2>{filters.view !== "archive" ? <div className="ticket-layout-switch" aria-label="Ticket layout"><button type="button" aria-pressed={filters.layout === "list"} onClick={() => change({ layout: "list" })}><List size={16} aria-hidden="true" />List</button><button type="button" aria-pressed={filters.layout === "board"} onClick={() => change({ layout: "board" })}><LayoutGrid size={16} aria-hidden="true" />Kanban</button></div> : null}</div>
        {!tickets.length ? <div className="ticket-empty"><Ticket size={32} aria-hidden="true" /><h3>{filters.view === "archive" ? "No archived tickets match" : "No tickets match yet"}</h3><p>{hasFilters ? "Clear or change your filters to see more tickets." : data.boards.length ? "Create a ticket on a published dashboard, or wait to be assigned or mentioned." : "A manager will set up a workspace and publish a dashboard for your work."}</p>{hasFilters ? <button className="button" type="button" onClick={clearFilters}>Show all accessible tickets</button> : null}</div> : filters.layout === "board" && filters.view !== "archive" ? <div className="ticket-kanban" role="region" aria-label="Ticket Kanban" tabIndex={0}>{ticketStatuses.map((status) => <section className="ticket-column" key={status} aria-label={ticketStatusLabels[status]}><h3>{ticketStatusLabels[status]}<span>{tickets.filter((ticket) => ticket.status === status).length}</span></h3><ul>{tickets.filter((ticket) => ticket.status === status).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} data={data} returnTo={returnTo} compact />)}</ul></section>)}</div> : <ul className="ticket-list">{tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} data={data} returnTo={returnTo} />)}</ul>}
      </>}
    </> : <>
      <div className="ticket-overview-heading"><div><h2>Workspaces and dashboards</h2><p className="operation-help">Each workspace contains dashboards. Open a dashboard to see your tickets.</p></div>{isManager ? <TaskDialog triggerLabel="New workspace" title="Create a company workspace" triggerIcon={<Plus size={16} aria-hidden="true" />}><NewWorkspace data={data} actor={actor} refresh={refresh} /></TaskDialog> : null}</div>
      {filters.workspace ? <button className="button" type="button" onClick={() => change({ workspace: "", board: "" })}>Show all workspaces</button> : null}
      {data.workspaces.filter((workspace) => !filters.workspace || workspace.id === filters.workspace).map((workspace) => {
        const dashboards = data.boards.filter((board) => board.workspaceId === workspace.id && (!filters.board || board.id === filters.board));
        return <section className="ticket-managed-workspace" key={`${workspace.id}:${workspace.version}`}><header><div><h3>{displayText(workspace.name)}</h3>{workspace.description ? <p>{displayText(workspace.description)}</p> : null}<span>{dashboards.length} dashboard{dashboards.length === 1 ? "" : "s"}{displayText(workspace.canManage ? ` · ${workspace.members.length} people with access` : "")}</span></div>{workspace.canManage ? <div className="ticket-heading-actions"><TaskDialog triggerLabel={displayText(`Edit workspace ${workspace.name}`)} triggerText="Settings" title={displayText(`Workspace · ${workspace.name}`)} triggerClassName="button"><WorkspaceSettings workspace={workspace} refresh={refresh} /></TaskDialog><TaskDialog triggerLabel={displayText(`Workspace access in ${workspace.name}`)} triggerText="Workspace access" title={displayText(`Workspace access · ${workspace.name}`)} triggerClassName="button" triggerIcon={<Users size={17} aria-hidden="true" />}><WorkspacePeople workspace={workspace} data={data} refresh={refresh} /></TaskDialog></div> : null}</header>
          <div className="ticket-board-cards">{dashboards.map((board) => {
            const count = filterCompanyTickets(data, { ...filters, view: board.status === "ARCHIVED" ? "archive" : "tickets" }).filter((ticket) => ticket.boardId === board.id).length;
            return <article key={`${board.id}:${board.version}`}><div><Layers size={19} aria-hidden="true" /><h4>{displayText(board.name)}</h4><span className="ticket-badge">{boardStatusLabels[board.status]}</span><span>{count} ticket{count === 1 ? "" : "s"} you can view</span></div><div><button className="button" type="button" onClick={() => change({ workspace: workspace.id, board: board.id, view: board.status === "ARCHIVED" ? "archive" : "tickets" })}>Open tickets</button>{board.canManage ? <TaskDialog triggerLabel={displayText(`Edit dashboard ${board.name}`)} triggerText="Settings" title={displayText(`Dashboard · ${board.name}`)} triggerClassName="button"><BoardSettings board={board} refresh={refresh} /></TaskDialog> : null}</div></article>;
          })}</div>
          {!dashboards.length ? <p className="record-empty">No dashboards are available here yet.</p> : null}
          {workspace.canManage ? <TaskDialog triggerLabel={displayText(`New dashboard in ${workspace.name}`)} triggerText="New dashboard" title={displayText(`Create a dashboard · ${workspace.name}`)} triggerClassName="button" triggerIcon={<Plus size={17} aria-hidden="true" />}>
            <TicketActionForm label="Create dashboard" submit="Create dashboard" onSuccess={refresh} onConflict={refresh} getCommand={(form) => ({ action: "createBoard", workspaceId: workspace.id, version: workspace.version, name: String(form.get("name")), status: String(form.get("status")) })}><label>Name<input name="name" maxLength={120} required data-dialog-autofocus /></label><label>Lifecycle<select name="status" defaultValue="DRAFT"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label><p className="operation-help">Published dashboards let everyone in the company create tickets. Draft dashboards stay within manager access.</p></TicketActionForm>
          </TaskDialog> : null}
        </section>;
      })}{!data.workspaces.length ? <p className="record-empty">A manager needs to create a workspace and publish a dashboard to get started.</p> : filters.workspace && !data.workspaces.some((workspace) => workspace.id === filters.workspace) ? <div className="ticket-empty"><h3>No workspace matches</h3><button className="button" type="button" onClick={clearFilters}>Show all accessible tickets</button></div> : null}
    </>}
  </section>;
}
