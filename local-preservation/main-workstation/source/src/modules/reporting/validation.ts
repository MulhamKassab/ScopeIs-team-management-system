import { z } from "zod";
import { ReportDomainError } from "@/modules/reporting/domain-error";
import { isBusinessDate, isPlanningMonth, isWallClockTime } from "@/modules/reporting/date-rules";
import { reportFilters, type ReportFilter, type ReportKey } from "@/modules/reporting/definitions";

const businessDate = z.string().refine(isBusinessDate, "Expected a YYYY-MM-DD business date.");
const wallClock = z.string().refine(isWallClockTime, "Expected an HH:MM time.");
const uuid = z.string().uuid();

/** Bounded page size. Reports never accept an unbounded limit from the client. */
export const REPORT_PAGE_SIZE = 100;
export const MAX_REPORT_PAGE = 500;
export const MAX_EXPORT_ROWS = 5_000;

export const reportWindowSchema = z.object({
  from: businessDate,
  to: businessDate,
}).strict();

export const conflictWindowSchema = z.object({
  date: businessDate,
  start: wallClock.default("00:00"),
  end: wallClock.default("24:00"),
}).strict();

export const reportQuerySchema = z.object({
  from: businessDate.optional(),
  to: businessDate.optional(),
  month: z.string().optional(),
  page: z.coerce.number().int().min(1).max(MAX_REPORT_PAGE).optional(),
  date: businessDate.optional(),
  start: wallClock.optional(),
  end: wallClock.optional(),
  clientId: uuid.optional(),
  projectId: uuid.optional(),
  locationId: uuid.optional(),
  skillId: uuid.optional(),
  action: z.string().trim().max(120).optional(),
  targetType: z.string().trim().max(120).optional(),
  actorUserId: z.string().trim().max(160).optional(),
}).strict();
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export function parseReportQuery(value: unknown): ReportQuery {
  // Native GET forms submit optional empty controls as empty strings.
  const normalized = value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, entry === "" ? undefined : entry]))
    : value;
  const result = reportQuerySchema.safeParse(normalized ?? {});
  if (!result.success) throw new ReportDomainError("VALIDATION_ERROR");
  return result.data;
}

export function assertSupportedReportFilters(key: ReportKey, query: ReportQuery) {
  for (const [filter, value] of Object.entries(query)) {
    if (value !== undefined && filter !== "page" && !reportFilters[key].includes(filter as ReportFilter)) {
      throw new ReportDomainError("VALIDATION_ERROR", "This report does not support the selected filters. Reset the filters and try again.");
    }
  }
}

/** A planning month must be a real `YYYY-MM`; anything else is refused without echoing the input. */
export function parseMonth(value: unknown, fallback: string) {
  if (value === undefined || value === "") return fallback;
  if (!isPlanningMonth(value)) throw new ReportDomainError("VALIDATION_ERROR");
  return value as string;
}

export const exportFormatSchema = z.literal("csv");
export function parseExportFormat(value: unknown) {
  const result = exportFormatSchema.safeParse(value ?? "csv");
  if (!result.success) throw new ReportDomainError("VALIDATION_ERROR");
  return result.data;
}

/** Only the two comparison vocabularies recorded in the domain are accepted for skill-gap status. */
export const skillStatuses = ["recorded", "not recorded"] as const;
export type SkillStatus = (typeof skillStatuses)[number];

export function skillStatus(recordedCount: number, requiredCount: number): SkillStatus {
  return recordedCount >= requiredCount ? "recorded" : "not recorded";
}
