export const LEAVE_TIMEZONE = "Asia/Dubai" as const;
export function workingDays(startDate: string, endDate: string) { let count = 0; for (let cursor = new Date(`${startDate}T00:00:00Z`), end = new Date(`${endDate}T00:00:00Z`); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) { const weekday = cursor.getUTCDay(); if (weekday >= 1 && weekday <= 5) count += 1; } return count; }
export function dubaiCalendarYear(now = new Date()) { return Number(new Intl.DateTimeFormat("en-CA", { timeZone: LEAVE_TIMEZONE, year: "numeric" }).format(now)); }
