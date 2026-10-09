export const ticketStatusLabels = { PLANNED: "Planned", OPEN: "Open", IN_PROGRESS: "In progress", ON_HOLD: "On hold", CLOSED: "Closed" } as const;
export const ticketPriorityLabels = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as const;
export const boardStatusLabels = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" } as const;
export const ticketStatuses = Object.keys(ticketStatusLabels) as (keyof typeof ticketStatusLabels)[];
export const ticketPriorities = Object.keys(ticketPriorityLabels) as (keyof typeof ticketPriorityLabels)[];
export function ticketNumber(value: number | string) { return `TKT-${String(value).padStart(4, "0")}`; }
export function ticketToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function ticketDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Dubai" }).format(new Date(`${value}T00:00:00+04:00`));
}
