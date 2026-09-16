import { dubaiBusinessDate } from "@/modules/evidence/validation";
import { dubaiCalendarYear, LEAVE_TIMEZONE, workingDays } from "@/modules/leave/date-rules";
import { dubaiToday } from "@/modules/maps/validation";
import { ReportDomainError } from "@/modules/reporting/domain-error";

/**
 * Canonical reporting date helpers.
 *
 * Phase 11 reports use `Asia/Dubai` for every business-facing date boundary. The three pre-existing
 * Dubai helpers (`dubaiToday`, `dubaiBusinessDate`, `dubaiCalendarYear`) are re-exported here so the
 * reporting module has one import surface, and their behaviour is deliberately unchanged.
 */
export { dubaiBusinessDate, dubaiCalendarYear, dubaiToday, LEAVE_TIMEZONE, workingDays };

export const REPORTING_TIMEZONE = LEAVE_TIMEZONE;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const TIME = /^\d{2}:\d{2}$/;

export type DateWindow = { from: string; to: string };

export function isBusinessDate(value: unknown): value is string { return typeof value === "string" && DATE.test(value); }
export function isPlanningMonth(value: unknown): value is string { return typeof value === "string" && MONTH.test(value); }
export function isWallClockTime(value: unknown): value is string { return typeof value === "string" && TIME.test(value); }

/** The current Dubai business month, used as the default window for allocation, leave and lifecycle reports. */
export function currentDubaiMonth(now = new Date()) { return dubaiToday(now).slice(0, 7); }

/** Inclusive first and last day of a Dubai planning month. */
export function monthBounds(month: string): DateWindow {
  if (!isPlanningMonth(month)) throw new ReportDomainError("VALIDATION_ERROR");
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(days).padStart(2, "0")}` };
}

/** Whole days between two business dates, inclusive of both bounds. */
export function inclusiveDayCount(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) throw new ReportDomainError("VALIDATION_ERROR");
  return Math.floor((end - start) / 86_400_000) + 1;
}

/** Offsets a business date by whole days without leaving UTC, so no local-time drift can occur. */
export function addDays(date: string, days: number) {
  if (!isBusinessDate(date)) throw new ReportDomainError("VALIDATION_ERROR");
  const shifted = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Validates an inclusive business-date window. Over-cap requests are refused rather than truncated, and
 * the message never reveals whether any hidden row exists inside the range.
 */
export function assertWindow(window: DateWindow, maxDays: number) {
  if (!isBusinessDate(window.from) || !isBusinessDate(window.to)) throw new ReportDomainError("VALIDATION_ERROR");
  if (window.to < window.from) throw new ReportDomainError("VALIDATION_ERROR");
  if (inclusiveDayCount(window.from, window.to) > maxDays) throw new ReportDomainError("WINDOW_TOO_LARGE", `Narrow the date range to ${maxDays} days or fewer.`);
  return window;
}

/** Minutes between two `HH:MM[:SS]` wall-clock values. Used only to total scheduled assignment time. */
export function minutesBetween(start: string, end: string) {
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
  };
  return toMinutes(end) - toMinutes(start);
}

/** Scheduled hours are reported to two decimals; the underlying value is exact whole minutes. */
export function scheduledHours(start: string, end: string) { return minutesBetween(start, end) / 60; }

export function formatHours(hours: number) { return hours.toFixed(2); }

/** Half-open overlap: an assignment collides when it starts before the window ends and ends after it starts. */
export function timesOverlap(assignment: { startTime: string; endTime: string }, window: { start: string; end: string }) {
  return assignment.startTime.slice(0, 5) < window.end && assignment.endTime.slice(0, 5) > window.start;
}

/** The full selected Dubai business day, used when no explicit time window is supplied. */
export function fullBusinessDay(date: string) { return { date, start: "00:00", end: "24:00" }; }
