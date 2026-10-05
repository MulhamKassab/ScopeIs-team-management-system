import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function shiftMonth(month: string, offset: number) { const [year, value] = month.split("-").map(Number); const date = new Date(Date.UTC(year, value - 1 + offset, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; }
export function MonthNavigation({ month }: { month: string }) {
  return <nav className="workflow-month-nav" aria-label="Schedule month navigation">
    <Link className="button" href={`/schedule?month=${shiftMonth(month, -1)}`} aria-label="Previous month"><ChevronLeft size={18} aria-hidden="true" /><span className="workflow-month-step-label">Previous</span></Link>
    <form method="get" className="workflow-month-picker"><label className="workflow-sr-only" htmlFor="schedule-month">Planning month</label><input id="schedule-month" type="month" name="month" defaultValue={month} required /><button className="button" type="submit">Go</button></form>
    <Link className="button" href={`/schedule?month=${shiftMonth(month, 1)}`} aria-label="Next month"><span className="workflow-month-step-label">Next</span><ChevronRight size={18} aria-hidden="true" /></Link>
  </nav>;
}
