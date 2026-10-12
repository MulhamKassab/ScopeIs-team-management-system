import { ticketPriorities, ticketStatuses } from "./types";

export type TicketRelation = "all" | "assigned" | "created" | "mentioned";
export type TicketFilters = {
  view: "overview" | "tickets" | "workspaces" | "archive";
  layout: "list" | "board";
  workspace: string;
  board: string;
  search: string;
  status: string;
  priority: string;
  relation: TicketRelation;
};

export const ticketRelationLabels: Record<TicketRelation, string> = {
  all: "All accessible", assigned: "Assigned to me", created: "Created by me", mentioned: "Mentioned in",
};

const identifier = (value = "") => /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? value : "";

/** Public presentation state only. Ticket authorization stays on the server. */
export function readTicketFilters(query: Record<string, string> = {}): TicketFilters {
  return {
    view: ["overview", "tickets", "workspaces", "archive"].includes(query.view) ? query.view as TicketFilters["view"] : "tickets",
    layout: query.layout === "board" ? "board" : "list",
    workspace: identifier(query.workspace), board: identifier(query.board),
    search: (query.search ?? "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200),
    status: ticketStatuses.includes(query.status as typeof ticketStatuses[number]) ? query.status : "",
    priority: ticketPriorities.includes(query.priority as typeof ticketPriorities[number]) ? query.priority : "",
    relation: ["assigned", "created", "mentioned"].includes(query.relation) ? query.relation as TicketRelation : "all",
  };
}

export function ticketWorkspaceHref(filters: TicketFilters): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value || (key === "view" && value === "tickets") || (key === "layout" && value === "list") || (key === "relation" && value === "all")) continue;
    query.set(key, value);
  }
  return query.size ? `/tickets?${query}` : "/tickets";
}

/** Never accept an external URL, nested return destination or another app route. */
export function safeTicketReturnTo(value?: string): string {
  if (!value || value.length > 2000 || !/^\/tickets(?:\?|$)/.test(value) || /[\\#\u0000-\u001f\u007f]/.test(value)) return "/tickets";
  try {
    const url = new URL(value, "https://scopeis.invalid");
    if (url.origin !== "https://scopeis.invalid" || url.pathname !== "/tickets") return "/tickets";
    return ticketWorkspaceHref(readTicketFilters(Object.fromEntries(url.searchParams)));
  } catch { return "/tickets"; }
}

export function ticketDetailHref(ticketId: string, returnTo: string): string {
  return `/tickets/${encodeURIComponent(ticketId)}?${new URLSearchParams({ from: safeTicketReturnTo(returnTo) })}`;
}

export function ticketContainerHref(returnTo: string, update: Partial<TicketFilters>): string {
  const query = new URL(safeTicketReturnTo(returnTo), "https://scopeis.invalid").searchParams;
  return ticketWorkspaceHref({ ...readTicketFilters(Object.fromEntries(query)), ...update });
}
