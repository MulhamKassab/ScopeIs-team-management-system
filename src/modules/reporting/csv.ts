import type { ReportColumn, ReportRow } from "@/modules/reporting/service";

/**
 * Pure CSV construction. Kept free of database and framework imports so the escaping, formula
 * neutralisation, column order and filename rules are unit-testable without a server.
 */

/** Characters that would let a spreadsheet treat a stored value as a formula. */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Neutralises spreadsheet formula injection. A stored employee name, skill label or note is
 * attacker-controlled text, so every cell is checked regardless of which column produced it.
 */
export function neutralizeCell(value: string) {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
}

/** RFC 4180 quoting, applied after neutralisation. */
export function quoteCell(value: string) {
  const needsQuotes = /[",\r\n]/.test(value) || value !== value.trim();
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

export function csvCell(value: string) { return quoteCell(neutralizeCell(value)); }

/** Deterministic column order, taken from the same projection the page renders. */
export function csvHeader(columns: ReportColumn[]) { return columns.map((column) => csvCell(column.label)).join(","); }

export function csvBody(columns: ReportColumn[], rows: ReportRow[]) {
  return rows.map((row) => columns.map((column) => csvCell(row[column.key] ?? "")).join(",")).join("\r\n");
}

/** UTF-8 BOM plus CRLF line endings, so Excel opens the file without a charset prompt. */
export function toCsv(columns: ReportColumn[], rows: ReportRow[]) {
  const lines = [csvHeader(columns), csvBody(columns, rows)].filter(Boolean);
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Server-generated ASCII filename. No user input ever reaches it. */
export function reportFilename(reportKey: string, from: string, to: string) {
  const safeKey = reportKey.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "report";
  const safeFrom = from.replace(/[^0-9-]/g, "");
  const safeTo = to.replace(/[^0-9-]/g, "");
  return `scopeis-${safeKey}-${safeFrom}-${safeTo}.csv`;
}

/** Delivery headers for a private, non-cacheable, non-sniffable streamed export. */
export function csvHeaders(filename: string) {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  } as Record<string, string>;
}
