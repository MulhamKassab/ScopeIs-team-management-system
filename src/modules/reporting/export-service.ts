import "server-only";
import { db } from "@/db/client";
import { resolveCurrentActor } from "@/modules/authorization/current-actor";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { canExportReport, reportDefinition, reportKeys, type ReportKey } from "@/modules/reporting/definitions";
import { ReportDomainError } from "@/modules/reporting/domain-error";
import { csvHeaders, reportFilename, toCsv } from "@/modules/reporting/csv";
import { reportingService } from "@/modules/reporting/service";
import { MAX_EXPORT_ROWS, parseExportFormat, parseReportQuery } from "@/modules/reporting/validation";
import type { AuthenticatedActor } from "@/shared/types/foundation";

type AuditWriter = typeof writeAuditEvent;
type RefusalReason = "too_large" | "out_of_scope" | "forbidden";

export type ExportPayload = { filename: string; body: string; headers: Record<string, string>; rowCount: number; reportKey: ReportKey };

/**
 * Streams a bounded CSV export.
 *
 * Authorization is re-resolved here rather than trusted from the page render, so a revoked grant or a
 * demotion between the page load and the export click cannot produce a file. The projection is the same
 * one the page renders. Over-cap results are refused, never truncated, and every outcome is audited with
 * safe metadata only — never a row value, an employee name, or the file bytes.
 */
export class ReportExportService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent) {}

  /** Normalises an unrecognised route segment to `unknown` so raw user text never reaches the audit log. */
  private normalizedKey(value: string): ReportKey | "unknown" {
    return (reportKeys as readonly string[]).includes(value) ? (value as ReportKey) : "unknown";
  }

  private async audit(actor: AuthenticatedActor, action: string, targetId: string, metadata: Record<string, unknown>) {
    return this.auditWriter(db, { actor: { id: actor.id, role: actor.role, authenticationMode: actor.authenticationMode }, action, targetType: "report", targetId, metadata });
  }

  /**
   * Records the refusal and raises the single non-enumerating error. An audit failure here must not turn
   * a refusal into a success, and the refusal itself must stay indistinguishable from an unknown key.
   */
  private async refuse(actor: AuthenticatedActor, reportKey: string, reason: RefusalReason): Promise<never> {
    const key = this.normalizedKey(reportKey);
    try { await this.audit(actor, "report.export.refused", key, { reportKey: key, reason }); } catch { /* contained by design */ }
    throw new ReportDomainError("NOT_FOUND");
  }

  async generate(actor: AuthenticatedActor, reportKey: string, input: unknown = {}): Promise<ExportPayload> {
    const raw = (input ?? {}) as Record<string, unknown>;
    const { format: requestedFormat, ...query } = raw;
    const format = parseExportFormat(requestedFormat ?? "csv");
    parseReportQuery(query);

    const current = await resolveCurrentActor(actor);
    if (!current) throw new ReportDomainError("NOT_FOUND");
    const definition = reportDefinition(reportKey);

    // An unknown key, an unauthorized key and an out-of-scope key must be indistinguishable.
    if (!definition) return this.refuse(actor, reportKey, "forbidden");
    if (!canExportReport(current.role, definition.key) || definition.exportRoles.length === 0) return this.refuse(actor, reportKey, "forbidden");

    let payload: Awaited<ReturnType<typeof reportingService.exportPayload>>;
    try {
      payload = await reportingService.exportPayload(actor, definition.key, query);
    } catch (error) {
      if (error instanceof ReportDomainError && error.code === "WINDOW_TOO_LARGE") return this.refuse(actor, reportKey, "too_large");
      if (error instanceof ReportDomainError && error.status === 404) return this.refuse(actor, reportKey, "out_of_scope");
      throw error;
    }

    if (payload.rows.length > MAX_EXPORT_ROWS) return this.refuse(actor, reportKey, "too_large");

    const filename = reportFilename(definition.key, payload.window.from, payload.window.to);
    const body = toCsv(payload.columns, payload.rows);

    // The audit write happens before the response is built, so a forced audit failure prevents the export.
    await this.audit(actor, "report.export.generated", definition.key, {
      reportKey: definition.key, format, from: payload.window.from, to: payload.window.to, rowCount: payload.rows.length, outcome: "generated",
    });

    return { filename, body, headers: csvHeaders(filename), rowCount: payload.rows.length, reportKey: definition.key };
  }
}

export const reportExportService = new ReportExportService();
