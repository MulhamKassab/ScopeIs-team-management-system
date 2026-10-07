import "server-only";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { auditEvents, users } from "@/db/schema";

export type AuditExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
export type AuditQuery = { action?: string; targetType?: string; actorUserId?: string; from?: string; to?: string };

/**
 * Filters are applied server-side with parameterized values. `from`/`to` are inclusive Dubai-dated
 * bounds widened to the full day, so a bounded range never silently drops same-day events.
 */
function conditions(query: AuditQuery) {
  return [
    query.action ? eq(auditEvents.action, query.action) : undefined,
    query.targetType ? eq(auditEvents.targetType, query.targetType) : undefined,
    query.actorUserId ? eq(auditEvents.actorUserId, query.actorUserId) : undefined,
    query.from ? gte(auditEvents.occurredAt, new Date(`${query.from}T00:00:00.000Z`)) : undefined,
    query.to ? lte(auditEvents.occurredAt, new Date(`${query.to}T23:59:59.999Z`)) : undefined,
  ].filter(Boolean);
}

/**
 * The actor name is joined with a left join so an archived or removed actor leaves the event readable.
 * Raw metadata is selected because the rendering allowlist, not the query, decides what is displayed.
 */
export const auditRepository = {
  page(executor: AuditExecutor, query: AuditQuery, limit: number, offset: number) {
    const where = conditions(query);
    return executor.select({ event: auditEvents, actorName: users.displayName }).from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorUserId))
      .where(where.length ? and(...(where as never[])) : undefined)
      .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id)).limit(limit).offset(offset);
  },
  total(executor: AuditExecutor, query: AuditQuery) {
    const where = conditions(query);
    return executor.select({ value: count() }).from(auditEvents).where(where.length ? and(...(where as never[])) : undefined).then(([row]) => Number(row?.value ?? 0));
  },
  distinctActions(executor: AuditExecutor) { return executor.selectDistinct({ value: auditEvents.action }).from(auditEvents).orderBy(auditEvents.action); },
  distinctTargetTypes(executor: AuditExecutor) { return executor.selectDistinct({ value: auditEvents.targetType }).from(auditEvents).orderBy(auditEvents.targetType); },
  actors(executor: AuditExecutor, limit: number) { return executor.select({ id: users.id, displayName: users.displayName }).from(users).orderBy(users.displayName).limit(limit); },
};
