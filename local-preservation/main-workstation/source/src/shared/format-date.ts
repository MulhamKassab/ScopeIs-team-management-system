/** The product's operational timezone, independent of the browser's local settings. */
export function formatDubaiDateTime(value: string): string {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai",
  }).format(new Date(value))} · Asia/Dubai`;
}
