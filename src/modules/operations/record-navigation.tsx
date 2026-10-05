import Link from "next/link";

export function RecordNavigation({ current }: { current: "clients" | "projects" | "locations" }) {
  return <nav className="record-navigation" aria-label="Client workspace">
    <Link href="/clients" aria-current={current === "clients" ? "page" : undefined}>Clients</Link>
    <Link href="/projects" aria-current={current === "projects" ? "page" : undefined}>Projects</Link>
    <Link href="/locations" aria-current={current === "locations" ? "page" : undefined}>Locations</Link>
  </nav>;
}

export function RecordStatus({ status }: { status: string }) {
  return <span className={`directory-status ${status === "ARCHIVED" ? "inactive" : "active"}`}>{status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase())}</span>;
}

export function RecordDates({ start, end }: { start: string | null; end: string | null }) {
  const format = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  return <>{start ? format(start) : "Start not set"} · {end ? format(end) : "No end date"}</>;
}
