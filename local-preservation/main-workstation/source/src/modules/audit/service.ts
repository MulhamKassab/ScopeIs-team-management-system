import "server-only";
import { db } from "@/db/client";
import { auditActionLabel, auditMetadataFields, AUDIT_PAGE_SIZE, GENERIC_AUDIT_LABEL } from "@/modules/audit/presentation";
import { auditRepository, type AuditQuery } from "@/modules/audit/repositories";
import { AuditDomainError } from "@/modules/audit/domain-error";
import type { AuthenticatedActor } from "@/shared/types/foundation";

export type AuditRowView = {
  id: string; action: string; label: string; isRecognizedAction: boolean; targetType: string; targetId: string | null;
  actorName: string | null; actorRole: string | null; occurredAt: string; correlationId: string;
  fields: { key: string; value: string }[];
};

export type AuditPageView = {
  items: AuditRowView[]; page: number; pageSize: number; total: number; totalPages: number;
  hasNext: boolean; hasPrevious: boolean; query: AuditQuery;
  options: { actions: string[]; targetTypes: string[]; actors: { id: string; displayName: string }[] };
};

function clean(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : undefined; }

/** Only a bounded, well-formed ISO date is accepted; anything else is ignored rather than guessed. */
function cleanDate(value: unknown) { const text = clean(value); return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined; }

/**
 * The audit-history interface is Super Admin only, read-only, and never generates its own audit event.
 * Unknown action types receive a generic label and no metadata.
 */
export class AuditService {
  private requireSuperAdmin(actor: AuthenticatedActor) {
    if (actor.role !== "SUPER_ADMIN") throw new AuditDomainError("NOT_FOUND");
  }

  async history(actor: AuthenticatedActor, input: { action?: unknown; targetType?: unknown; actorUserId?: unknown; from?: unknown; to?: unknown; page?: unknown } = {}): Promise<AuditPageView> {
    this.requireSuperAdmin(actor);
    const query: AuditQuery = { action: clean(input.action), targetType: clean(input.targetType), actorUserId: clean(input.actorUserId), from: cleanDate(input.from), to: cleanDate(input.to) };
    const requested = Number(input.page);
    const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
    const [rows, total, actions, targetTypes, actors] = await Promise.all([
      auditRepository.page(db, query, AUDIT_PAGE_SIZE, (page - 1) * AUDIT_PAGE_SIZE),
      auditRepository.total(db, query),
      auditRepository.distinctActions(db),
      auditRepository.distinctTargetTypes(db),
      auditRepository.actors(db, 200),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
    return {
      items: rows.map(({ event, actorName }) => ({
        id: event.id, action: event.action, label: auditActionLabel(event.action), isRecognizedAction: auditActionLabel(event.action) !== GENERIC_AUDIT_LABEL,
        targetType: event.targetType, targetId: event.targetId, actorName, actorRole: event.actorRole, occurredAt: event.occurredAt.toISOString(),
        correlationId: event.correlationId, fields: auditMetadataFields(event.action, event.metadata),
      })),
      page, pageSize: AUDIT_PAGE_SIZE, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1, query,
      options: { actions: actions.map((row) => row.value), targetTypes: targetTypes.map((row) => row.value), actors },
    };
  }
}

export const auditService = new AuditService();
