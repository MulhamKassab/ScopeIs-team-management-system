/** UTC arithmetic keeps month layout stable in every browser timezone. Weeks start Monday. */
export function monthDays(month: string) {
  const [year, number] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}
export function monthOffset(month: string) { return (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7; }
export function displayDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
