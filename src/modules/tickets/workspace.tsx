"use client";

import Link from "next/link";
import { useState } from "react";
import { Archive, ArrowRight, CheckCircle2, Folder, Layers, LayoutGrid, List, Plus, Search, Ticket, Users } from "lucide-react";
import { TaskDialog } from "@/shared/components/task-dialog";
import type { SystemRole } from "@/shared/types/foundation";
import type { TicketBoard, TicketSummary, TicketWorkspace, TicketWorkspaceData } from "./types";
import { TicketActionForm, TicketFields, readTicketFields } from "./forms";
import { boardStatusLabels, ticketDate, ticketNumber, ticketPriorities, ticketPriorityLabels, ticketStatuses, ticketStatusLabels } from "./presentation";

type Filters = { view: "overview" | "tickets" | "workspaces" | "archive"; layout: "list" | "board"; workspace: string; board: string; search: string; status: string; priority: string };
type Actor = { id: string; displayName: string; role: SystemRole };

export function filterCompanyTickets(data: TicketWorkspaceData, filters: Pick<Filters, "workspace" | "board" | "search" | "status" | "priority" | "view">) {
  const search = filters.search.trim().toLocaleLowerCase();
  return data.tickets.filter((ticket) => {
    const board = data.boards.find((entry) => entry.id === ticket.boardId);
    const archived = Boolean(ticket.archivedAt) || board?.status === "ARCHIVED";
    if (filters.view === "archive" ? !archived : archived) return false;
    if (filters.workspace && board?.workspaceId !== filters.workspace) return false;
    if (filters.board && ticket.boardId !== filters.board) return false;
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    return !search || [ticket.subject, ticketNumber(ticket.number), ticket.creatorName, board?.name ?? "", ...ticket.assignees.map((person) => person.displayName)].some((text) => text.toLocaleLowerCase().includes(search));
  });
}

function NewTicket({ data, actor, refresh }: { data: TicketWorkspaceData; actor: Actor; refresh: () => Promise<void> }) {
  const available = data.boards.filter((board) => board.status !== "ARCHIVED" && (board.canManage || board.status === "PUBLISHED"));
  const [boardId, setBoardId] = useState(available[0]?.id ?? "");
  const board = available.find((entry) => entry.id === boardId) ?? available[0];
  const workspace = data.workspaces.find((entry) => entry.id === board?.workspaceId);
  const choices = data.people.filter((person) => person.userId !== actor.id && workspace?.members.some((member) => member.userId === person.userId));
  if (!board) return <p className="record-empty">A manager needs to create and publish a board before you can create a ticket.</p>;
  return <TicketActionForm label="Create ticket" submit="Create ticket" onSuccess={refresh} onConflict={refresh} resetOnSuccess
    getCommand={(form) => ({ action: "createTicket", boardId: board.id, version: board.version, ...readTicketFields(form),
      assigneeIds: board.canManage ? form.getAll("assigneeIds").map(String) : [], observerIds: board.canManage ? form.getAll("observerIds").map(String) : [] })}>
    <label>Board<select value={board.id} onChange={(event) => setBoardId(event.target.value)}>{available.map((entry) => <option value={entry.id} key={entry.id}>{data.workspaces.find((workspace) => workspace.id === entry.workspaceId)?.name} · {entry.name}</option>)}</select></label>
    <TicketFields />
    {board.canManage ? <details className="ticket-extra-fields"><summary>Assign people · optional</summary><p className="operation-help">Only current workspace members are listed. You are recorded as the creator.</p>
      <label>Assignees<select name="assigneeIds" multiple size={Math.min(5, Math.max(2, choices.length))}>{choices.map((person) => <option key={person.userId} value={person.userId}>{person.displayName}</option>)}</select></label>
      <label>Observers · read only<select name="observerIds" multiple size={Math.min(5, Math.max(2, choices.length))}>{choices.map((person) => <option key={person.userId} value={person.userId}>{person.displayName}</option>)}</select></label>
    </details> : <p className="operation-help">You will be the creator. A manager can grant assignee or observer access.</p>}
  </TicketActionForm>;
}

function NewWorkspace({ data, actor, refresh }: { data: TicketWorkspaceData; actor: Actor; refresh: () => Promise<void> }) {
  const [clientId, setClientId] = useState("");
  const projects = data.projects.filter((project) => !clientId || project.clientId === clientId);
  return <TicketActionForm label="Create workspace" submit="Create workspace" onSuccess={refresh} resetOnSuccess
    getCommand={(form) => ({ action: "createWorkspace", name: String(form.get("name") ?? ""), description: String(form.get("description") ?? ""), clientId: String(form.get("clientId") ?? "") || null, projectId: String(form.get("projectId") ?? "") || null })}>
    <label>Name<input name="name" maxLength={120} required data-dialog-autofocus /></label>
    <label>Description · optional<textarea name="description" maxLength={1000} rows={3} /></label>
    <label>Client link · optional<select name="clientId" value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">No client link</option>{data.clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
    <label>Project link · optional<select name="projectId" key={clientId} defaultValue=""><option value="">No project link</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
    <p className="operation-help">A workspace has its own members and boards. {actor.role === "ADMIN" ? "Choose a Client or Project within your current scope." : "Unlinked workspaces are managed by Super Admin."}</p>
  </TicketActionForm>;
}

function WorkspacePeople({ workspace, data, refresh }: { workspace: TicketWorkspace; data: TicketWorkspaceData; refresh: () => Promise<void> }) {
  const available = data.people.filter((person) => !workspace.members.some((member) => member.userId === person.userId));
  return <div className="ticket-container-settings">
    <p className="operation-help">Membership lets a person create tickets on Published boards. Employees read only tickets they created or are explicitly assigned or observing.</p>
    <ul className="ticket-person-list">{workspace.members.map((member) => <li key={member.userId}><div><strong>{member.displayName}</strong><small>{member.role.replaceAll("_", " ").toLowerCase()}</small></div>
      <TicketActionForm label={`Remove ${member.displayName} from workspace`} submit="Remove access" danger onSuccess={refresh} onConflict={refresh}
        getCommand={() => ({ action: "setWorkspaceMember", workspaceId: workspace.id, userId: member.userId, active: false, version: workspace.version })}><span className="sr-only">Membership removal preserves ticket history.</span></TicketActionForm>
    </li>)}</ul>
    {available.length ? <TicketActionForm label="Add workspace member" submit="Add member" onSuccess={refresh} onConflict={refresh}
      getCommand={(form) => ({ action: "setWorkspaceMember", workspaceId: workspace.id, userId: String(form.get("userId")), active: true, version: workspace.version })}>
      <label>Person<select name="userId" required>{available.map((person) => <option key={person.userId} value={person.userId}>{person.displayName}</option>)}</select></label>
    </TicketActionForm> : <p className="record-empty">Every person available within your scope is already a member.</p>}
  </div>;
}

function WorkspaceSettings({ workspace, refresh }: { workspace: TicketWorkspace; refresh: () => Promise<void> }) {
  return <TicketActionForm label={`Edit workspace ${workspace.name}`} onSuccess={refresh} onConflict={refresh}
    getCommand={(form) => ({ action: "updateWorkspace", workspaceId: workspace.id, version: workspace.version, name: String(form.get("name")), description: String(form.get("description") ?? "") })}>
    <label>Name<input name="name" defaultValue={workspace.name} maxLength={120} required data-dialog-autofocus /></label>
    <label>Description · optional<textarea name="description" defaultValue={workspace.description ?? ""} maxLength={1000} rows={3} /></label>
  </TicketActionForm>;
}

function BoardSettings({ board, refresh }: { board: TicketBoard; refresh: () => Promise<void> }) {
  return <TicketActionForm label={`Edit ${board.name}`} onSuccess={refresh} onConflict={refresh}
    getCommand={(form) => ({ action: "updateBoard", boardId: board.id, version: board.version, name: String(form.get("name")), status: String(form.get("status")) })}>
    <label>Name<input name="name" defaultValue={board.name} maxLength={120} required /></label>
    <label>Board lifecycle<select name="status" defaultValue={board.status}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
    <p className="operation-help">Publishing makes a board available to its workspace members. Employee ticket access still requires creator, assignee or observer participation. Archiving retains ticket history.</p>
  </TicketActionForm>;
}

function TicketCard({ ticket, data, compact = false }: { ticket: TicketSummary; data: TicketWorkspaceData; compact?: boolean }) {
  const board = data.boards.find((entry) => entry.id === ticket.boardId);
  const workspace = data.workspaces.find((entry) => entry.id === board?.workspaceId);
  return <li className={`ticket-card ${compact ? "ticket-card-compact" : ""}`}>
    <div className="ticket-card-main"><span className="ticket-number">{ticketNumber(ticket.number)}</span><Link href={`/tickets/${ticket.id}`} className="ticket-subject">{ticket.subject}</Link><span className="ticket-context">{workspace?.name} · {board?.name}</span></div>
    <div className="ticket-badges"><span className={`ticket-badge ticket-status-${ticket.status.toLowerCase()}`}>{ticketStatusLabels[ticket.status]}</span><span className={`ticket-badge ticket-priority-${ticket.priority.toLowerCase()}`}>{ticketPriorityLabels[ticket.priority]}</span></div>
    <div className="ticket-card-meta"><span>{ticket.assignees.map((person) => person.displayName).join(", ") || `Created by ${ticket.creatorName}`}</span><span>{ticket.dueDate ? `Due ${ticketDate(ticket.dueDate)}` : ticketDate(ticket.ticketDate)}</span>{ticket.permissions.edit ? <span>Can update</span> : <span>Read only</span>}</div>
    <Link className="ticket-open" href={`/tickets/${ticket.id}`} aria-label={`Open ${ticketNumber(ticket.number)}: ${ticket.subject}`}><ArrowRight size={18} aria-hidden="true" /></Link>
  </li>;
}

export function TicketWorkspaceView({ initialData, actor, initialQuery = {} }: { initialData: TicketWorkspaceData; actor: Actor; initialQuery?: Record<string, string> }) {
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState<Filters>(() => ({
    view: ["overview", "tickets", "archive"].includes(initialQuery.view) || (actor.role !== "EMPLOYEE" && initialQuery.view === "workspaces") ? initialQuery.view as Filters["view"] : actor.role === "EMPLOYEE" ? "tickets" : "overview",
    layout: initialQuery.layout === "board" ? "board" : "list", workspace: initialQuery.workspace ?? "", board: initialQuery.board ?? "", search: (initialQuery.search ?? "").slice(0, 200), status: ticketStatuses.includes(initialQuery.status as typeof ticketStatuses[number]) ? initialQuery.status : "", priority: ticketPriorities.includes(initialQuery.priority as typeof ticketPriorities[number]) ? initialQuery.priority : "",
  }));
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
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) query.set(key, value);
    window.history.replaceState(window.history.state, "", `/tickets?${query}`);
  }
  const tickets = filterCompanyTickets(data, filters);
  const activeBoards = data.boards.filter((board) => (filters.view === "archive" || board.status !== "ARCHIVED") && (!filters.workspace || board.workspaceId === filters.workspace));
  const canCreate = data.boards.some((board) => board.status !== "ARCHIVED" && (board.canManage || board.status === "PUBLISHED"));
  const managed = data.workspaces.filter((workspace) => workspace.canManage);
  const isManager = actor.role !== "EMPLOYEE";
  const open = tickets.filter((ticket) => ticket.status !== "CLOSED");
  const critical = open.filter((ticket) => ticket.priority === "CRITICAL" || ticket.priority === "HIGH");
  const holding = tickets.filter((ticket) => ticket.status === "ON_HOLD");
  return <section className="ticket-workspace" aria-labelledby="ticket-workspace-title">
    <header className="ticket-workspace-heading"><div><p className="eyebrow">Company work</p><h1 id="ticket-workspace-title">{actor.role === "EMPLOYEE" ? "My tickets" : "Tickets"}</h1><p>{actor.role === "EMPLOYEE" ? "Your assigned work, updates and next actions." : "Coordinate work across your company workspaces and boards."}</p></div>
      <div className="ticket-heading-actions">{canCreate ? <TaskDialog triggerLabel="New ticket" title="Create a ticket" triggerIcon={<Plus size={18} aria-hidden="true" />}><NewTicket data={data} actor={actor} refresh={refresh} /></TaskDialog> : null}
      <button className="icon-button" type="button" aria-label="Reload tickets" onClick={async () => { try { await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "The workspace could not be reloaded."); } }}><Ticket size={18} aria-hidden="true" /></button></div>
    </header>
    <nav className="ticket-view-tabs" aria-label="Ticket views">
      <button type="button" aria-pressed={filters.view === "overview"} onClick={() => change({ view: "overview" })}><LayoutGrid size={17} aria-hidden="true" />Overview</button>
      <button type="button" aria-pressed={filters.view === "tickets"} onClick={() => change({ view: "tickets" })}><Ticket size={17} aria-hidden="true" />Tickets</button>
      {isManager ? <button type="button" aria-pressed={filters.view === "workspaces"} onClick={() => change({ view: "workspaces" })}><Layers size={17} aria-hidden="true" />Workspaces</button> : null}
      <button type="button" aria-pressed={filters.view === "archive"} onClick={() => change({ view: "archive" })}><Archive size={17} aria-hidden="true" />Archive</button>
    </nav>
    {notice ? <p className="operation-help ticket-notice" role="status">{notice}</p> : null}
    {filters.view !== "workspaces" ? <>
      <div className="ticket-filter-bar">
        <label className="ticket-search"><span>Search tickets</span><span className="ticket-search-input"><Search size={17} aria-hidden="true" /><input value={filters.search} maxLength={200} placeholder="Subject, ticket number or person" onChange={(event) => change({ search: event.target.value })} /></span></label>
        <label>Workspace<select value={filters.workspace} onChange={(event) => change({ workspace: event.target.value })}><option value="">All permitted workspaces</option>{data.workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select></label>
        <label>Board<select value={filters.board} onChange={(event) => change({ board: event.target.value })}><option value="">All permitted boards</option>{activeBoards.map((board) => <option value={board.id} key={board.id}>{board.name}</option>)}</select></label>
        <label>Status<select value={filters.status} onChange={(event) => change({ status: event.target.value })}><option value="">All statuses</option>{ticketStatuses.map((status) => <option key={status} value={status}>{ticketStatusLabels[status]}</option>)}</select></label>
        <label>Priority<select value={filters.priority} onChange={(event) => change({ priority: event.target.value })}><option value="">All priorities</option>{ticketPriorities.map((priority) => <option key={priority} value={priority}>{ticketPriorityLabels[priority]}</option>)}</select></label>
      </div>
      {filters.view === "overview" ? <div className="ticket-overview">
        <div className="ticket-metrics" aria-label="Matching ticket overview"><article><Ticket aria-hidden="true" size={20} /><strong>{open.length}</strong><span>Active tickets</span></article><article><Layers aria-hidden="true" size={20} /><strong>{critical.length}</strong><span>High or critical</span></article><article><Archive aria-hidden="true" size={20} /><strong>{holding.length}</strong><span>On hold</span></article><article><CheckCircle2 aria-hidden="true" size={20} /><strong>{tickets.length - open.length}</strong><span>Closed</span></article></div>
        <div className="ticket-overview-heading"><h2>Workspaces</h2><button className="button" type="button" onClick={() => change({ view: "tickets" })}>Open matching tickets<ArrowRight size={16} aria-hidden="true" /></button></div>
        <div className="ticket-workspace-cards">{data.workspaces.filter((workspace) => !filters.workspace || workspace.id === filters.workspace).map((workspace) => {
          const matching = tickets.filter((ticket) => data.boards.some((board) => board.id === ticket.boardId && board.workspaceId === workspace.id));
          return <article key={workspace.id}><Folder size={22} aria-hidden="true" /><h3>{workspace.name}</h3>{workspace.description ? <p>{workspace.description}</p> : null}<span>{matching.length} matching ticket{matching.length === 1 ? "" : "s"}</span><button type="button" className="button" onClick={() => change({ workspace: workspace.id, view: "tickets" })}>Open tickets<ArrowRight size={16} aria-hidden="true" /></button></article>;
        })}</div>
        <h2>Needs attention</h2>{tickets.filter((ticket) => ticket.status === "ON_HOLD" || (ticket.status !== "CLOSED" && ["HIGH", "CRITICAL"].includes(ticket.priority))).length ? <ul className="ticket-list">{tickets.filter((ticket) => ticket.status === "ON_HOLD" || (ticket.status !== "CLOSED" && ["HIGH", "CRITICAL"].includes(ticket.priority))).slice(0, 8).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} data={data} />)}</ul> : <p className="record-empty">No matching tickets need attention.</p>}
      </div> : <>
        <div className="ticket-list-heading"><h2>{filters.view === "archive" ? "Archived tickets" : "Matching tickets"}<span>{tickets.length}</span></h2>{filters.view !== "archive" ? <div className="ticket-layout-switch" aria-label="Ticket layout"><button type="button" aria-pressed={filters.layout === "list"} onClick={() => change({ layout: "list" })}><List size={16} aria-hidden="true" />List</button><button type="button" aria-pressed={filters.layout === "board"} onClick={() => change({ layout: "board" })}><LayoutGrid size={16} aria-hidden="true" />Board</button></div> : null}</div>
        {!tickets.length ? <div className="ticket-empty"><Ticket size={32} aria-hidden="true" /><h3>{filters.view === "archive" ? "No archived tickets match" : "No tickets match yet"}</h3><p>{data.boards.length ? "Change your filters or create a ticket on a permitted board." : "A manager will set up a workspace and publish a board for your work."}</p></div> : filters.layout === "board" && filters.view !== "archive" ? <div className="ticket-kanban" role="region" aria-label="Ticket board" tabIndex={0}>{ticketStatuses.map((status) => <section className="ticket-column" key={status} aria-label={ticketStatusLabels[status]}><h3>{ticketStatusLabels[status]}<span>{tickets.filter((ticket) => ticket.status === status).length}</span></h3><ul>{tickets.filter((ticket) => ticket.status === status).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} data={data} compact />)}</ul></section>)}</div> : <ul className="ticket-list">{tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} data={data} />)}</ul>}
      </>}
    </> : <>
      <div className="ticket-overview-heading"><div><h2>Workspaces and boards</h2><p className="operation-help">Manage the work containers and the people who can use them.</p></div><TaskDialog triggerLabel="New workspace" title="Create a company workspace" triggerIcon={<Plus size={16} aria-hidden="true" />}><NewWorkspace data={data} actor={actor} refresh={refresh} /></TaskDialog></div>
      {managed.map((workspace) => <section className="ticket-managed-workspace" key={`${workspace.id}:${workspace.version}`}><header><div><h3>{workspace.name}</h3>{workspace.description ? <p>{workspace.description}</p> : null}<span>{workspace.members.length} active members</span></div><div className="ticket-heading-actions"><TaskDialog triggerLabel={`Edit workspace ${workspace.name}`} triggerText="Settings" title={`Workspace · ${workspace.name}`} triggerClassName="button"><WorkspaceSettings workspace={workspace} refresh={refresh} /></TaskDialog><TaskDialog triggerLabel={`Manage people in ${workspace.name}`} triggerText="People" title={`People · ${workspace.name}`} triggerClassName="button" triggerIcon={<Users size={17} aria-hidden="true" />}><WorkspacePeople workspace={workspace} data={data} refresh={refresh} /></TaskDialog></div></header>
        <div className="ticket-board-cards">{data.boards.filter((board) => board.workspaceId === workspace.id).map((board) => <article key={`${board.id}:${board.version}`}><div><Layers size={19} aria-hidden="true" /><h4>{board.name}</h4><span className="ticket-badge">{boardStatusLabels[board.status]}</span></div><div><button className="button" type="button" onClick={() => change({ workspace: workspace.id, board: board.id, view: board.status === "ARCHIVED" ? "archive" : "tickets" })}>Open tickets</button><TaskDialog triggerLabel={`Edit board ${board.name}`} triggerText="Settings" title={`Board · ${board.name}`} triggerClassName="button"><BoardSettings board={board} refresh={refresh} /></TaskDialog></div></article>)}</div>
        <TaskDialog triggerLabel={`New board in ${workspace.name}`} triggerText="New board" title={`Create a board · ${workspace.name}`} triggerClassName="button" triggerIcon={<Plus size={17} aria-hidden="true" />}>
          <TicketActionForm label="Create board" submit="Create board" onSuccess={refresh} onConflict={refresh} getCommand={(form) => ({ action: "createBoard", workspaceId: workspace.id, version: workspace.version, name: String(form.get("name")), status: String(form.get("status")) })}><label>Name<input name="name" maxLength={120} required data-dialog-autofocus /></label><label>Lifecycle<select name="status" defaultValue="DRAFT"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label><p className="operation-help">Published boards permit members to create tickets. Draft boards remain in management.</p></TicketActionForm>
        </TaskDialog>
      </section>)}{!managed.length ? <p className="record-empty">You have no workspaces to manage within your current scope.</p> : null}
    </>}
  </section>;
}
