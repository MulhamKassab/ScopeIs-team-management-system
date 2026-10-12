import { workingDays, workingDaysByYear } from "@/modules/leave/date-rules";

export type ApprovedVacationDates = { startDate: string; endDate: string };

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Advisory only: reuse the domain's weekday/year counting with the owner's approved dates. */
export function vacationPreview(startDate: string, endDate: string, allowance: number, approved: ApprovedVacationDates[]) {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate) || endDate < startDate) return null;
  return workingDaysByYear(startDate, endDate).map(({ year, workingDays: requested }) => {
    const yearStart = `${year}-01-01`, yearEnd = `${year}-12-31`;
    const used = approved.reduce((total, request) => {
      if (request.startDate > yearEnd || request.endDate < yearStart) return total;
      return total + workingDays(request.startDate > yearStart ? request.startDate : yearStart, request.endDate < yearEnd ? request.endDate : yearEnd);
    }, 0);
    const remaining = allowance - used;
    return { year, requested, remaining, projectedRemaining: remaining - requested };
  });
}
