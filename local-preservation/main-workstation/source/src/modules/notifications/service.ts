import "server-only";
import { db } from "@/db/client";
import { can } from "@/modules/authorization/authorization-service";
import { canReadEmployee } from "@/modules/employees/employee-policy";
import { NotificationDomainError } from "@/modules/notifications/domain-error";
import { notificationText, NOTIFICATION_PAGE_SIZE } from "@/modules/notifications/presentation";
import { notificationRepository, type NotificationFilter } from "@/modules/notifications/repositories";
import type { AuthenticatedActor } from "@/shared/types/foundation";

export type NotificationView = {
  id: string; eventType: string; title: string; summary: string; createdAt: string;
  isRead: boolean; isArchived: boolean; relatedRecordType: string | null;
  /** An authorized destination, or null for the neutral unavailable state. */
  href: string | null;
};

export type NotificationPage = { items: NotificationView[]; filter: NotificationFilter; page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrevious: boolean; unreadCount: number };

const filters: readonly NotificationFilter[] = ["all", "unread", "archived"];

function normalizeFilter(value: unknown): NotificationFilter {
  return typeof value === "string" && (filters as readonly string[]).includes(value) ? (value as NotificationFilter) : "all";
}

/**
 * Notification rows never carry display content, so every destination is reauthorized here for the
 * current recipient. An unauthorized or missing related record yields the same neutral `null` as an
 * unsupported type, so a link never discloses whether the target exists.
 */
export class NotificationService {
  private async evidenceHref(actor: AuthenticatedActor, evidenceId: string) {
    const evidence = await notificationRepository.evidence(db, evidenceId);
    if (!evidence || evidence.archivedAt) return null;
    if (evidence.ownerUserId === actor.id) return "/profile";
    if (actor.role === "EMPLOYEE") return null;
    const record = await notificationRepository.employeeAccessRecord(db, evidence.ownerUserId);
    if (!record) return null;
    if (!canReadEmployee(actor, { userId: record.userId, team: record.team, role: record.role })) return null;
    // A scoped Admin is limited to the certification summary, so only a certification is linkable.
    if (actor.role !== "SUPER_ADMIN" && evidence.kind !== "certification") return null;
    return `/employees/${evidence.ownerUserId}#evidence-${evidence.id}`;
  }

  private static participantHref(actor: AuthenticatedActor, request: { requesterUserId: string; nominatedEmployeeUserId: string | null; selectedEmployeeUserId: string | null }) {
    const participants = [request.requesterUserId, request.nominatedEmployeeUserId, request.selectedEmployeeUserId];
    if (!participants.includes(actor.id)) return null;
    const management = can(actor, "module:replacements:view") && actor.role !== "EMPLOYEE";
    if (management) return "/replacements";
    return can(actor, "module:requests:view") ? "/requests" : null;
  }

  private async discussionHref(actor: AuthenticatedActor, threadId: string) {
    const thread = await notificationRepository.discussionThread(db, threadId);
    if (!thread || thread.parentType !== "replacement_request") return null;
    const request = await notificationRepository.replacementRequest(db, thread.parentId);
    if (!request) return null;
    return NotificationService.participantHref(actor, request);
  }

  private async replacementHref(actor: AuthenticatedActor, requestId: string) {
    const request = await notificationRepository.replacementRequest(db, requestId);
    if (!request) return null;
    // A Super Admin decides requests; a participant follows their own. Everyone else gets the neutral state.
    if (actor.role === "SUPER_ADMIN") return can(actor, "module:replacements:view") ? "/replacements" : null;
    return NotificationService.participantHref(actor, request);
  }

  private async leaveHref(actor: AuthenticatedActor, requestId: string) {
    const request = await notificationRepository.leaveRequest(db, requestId);
    if (!request) return null;
    if (actor.role === "SUPER_ADMIN" || actor.id === request.employeeUserId) return can(actor, "module:leave:view") ? "/leave" : null;
    return null;
  }

  private static scheduleHref(actor: AuthenticatedActor, period: { id: string } | null) {
    // The row only ever exists for this recipient, so ownership is the authorization for the schedule view.
    return period && can(actor, "module:schedule:view") ? "/schedule" : null;
  }

  /** Resolves the authorized destination for one row; unsupported or unknown types stay neutral. */
  private async href(actor: AuthenticatedActor, item: { relatedRecordType: string | null; relatedRecordId: string | null }): Promise<string | null> {
    if (!item.relatedRecordType || !item.relatedRecordId) return null;
    if (item.relatedRecordType === "employee_evidence") return this.evidenceHref(actor, item.relatedRecordId);
    if (item.relatedRecordType === "discussion_thread") return this.discussionHref(actor, item.relatedRecordId);
    if (item.relatedRecordType === "replacement_request") return this.replacementHref(actor, item.relatedRecordId);
    if (item.relatedRecordType === "leave_request") return this.leaveHref(actor, item.relatedRecordId);
    if (item.relatedRecordType === "schedule_period") return NotificationService.scheduleHref(actor, await notificationRepository.schedulePeriod(db, item.relatedRecordId));
    return null;
  }

  private async view(actor: AuthenticatedActor, row: { id: string; eventType: string; createdAt: Date; readAt: Date | null; archivedAt: Date | null; relatedRecordType: string | null; relatedRecordId: string | null }): Promise<NotificationView> {
    const text = notificationText(row.eventType);
    return {
      id: row.id, eventType: row.eventType, title: text.title, summary: text.summary, createdAt: row.createdAt.toISOString(),
      isRead: row.readAt !== null, isArchived: row.archivedAt !== null, relatedRecordType: row.relatedRecordType,
      href: await this.href(actor, row),
    };
  }

  async inbox(actor: AuthenticatedActor, input: { filter?: unknown; page?: unknown } = {}): Promise<NotificationPage> {
    const filter = normalizeFilter(input.filter);
    const requested = Number(input.page);
    const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
    const [rows, total, unreadCount] = await Promise.all([
      notificationRepository.page(db, actor.id, filter, NOTIFICATION_PAGE_SIZE, (page - 1) * NOTIFICATION_PAGE_SIZE),
      notificationRepository.total(db, actor.id, filter),
      notificationRepository.activeUnreadCount(db, actor.id),
    ]);
    const items = await Promise.all(rows.map((row) => this.view(actor, row)));
    const totalPages = Math.max(1, Math.ceil(total / NOTIFICATION_PAGE_SIZE));
    return { items, filter, page, pageSize: NOTIFICATION_PAGE_SIZE, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1, unreadCount };
  }

  async unreadCount(actor: AuthenticatedActor) {
    return notificationRepository.activeUnreadCount(db, actor.id);
  }

  /** Read state and archive state stay independent: neither operation implies the other. */
  async setRead(actor: AuthenticatedActor, notificationId: string, read: boolean) {
    const owned = await notificationRepository.owned(db, notificationId, actor.id);
    // A foreign or missing id returns the same non-enumerating refusal.
    if (!owned) throw new NotificationDomainError("NOT_FOUND");
    const row = await notificationRepository.setRead(db, notificationId, actor.id, read ? (owned.readAt ?? new Date()) : null);
    if (!row) throw new NotificationDomainError("NOT_FOUND");
    return { id: row.id, isRead: read };
  }

  async setArchived(actor: AuthenticatedActor, notificationId: string, archived: boolean) {
    const owned = await notificationRepository.owned(db, notificationId, actor.id);
    if (!owned) throw new NotificationDomainError("NOT_FOUND");
    // Unarchiving never marks the row read, and archiving never clears the read state.
    const row = await notificationRepository.setArchived(db, notificationId, actor.id, archived ? (owned.archivedAt ?? new Date()) : null);
    if (!row) throw new NotificationDomainError("NOT_FOUND");
    return { id: row.id, isArchived: archived };
  }

  async markAllRead(actor: AuthenticatedActor) {
    const rows = await notificationRepository.markAllRead(db, actor.id, new Date());
    return { marked: rows.length };
  }
}

export const notificationService = new NotificationService();
