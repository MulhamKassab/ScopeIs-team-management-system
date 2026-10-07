import "server-only";
import { and, count, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { discussionThreads, employeeEvidence, employeeProfiles, leaveRequests, notifications, replacementRequests, schedulePeriods, users } from "@/db/schema";

export type NotificationExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
export type NotificationFilter = "all" | "unread" | "archived";

function scope(recipientUserId: string, filter: NotificationFilter) {
  const owner = eq(notifications.recipientUserId, recipientUserId);
  if (filter === "archived") return and(owner, sql`${notifications.archivedAt} is not null`);
  if (filter === "unread") return and(owner, isNull(notifications.archivedAt), isNull(notifications.readAt));
  return and(owner, isNull(notifications.archivedAt));
}

export const notificationRepository = {
  /** Recipient-scoped page ordered by (created_at, id) for stable pagination. */
  page(executor: NotificationExecutor, recipientUserId: string, filter: NotificationFilter, limit: number, offset: number) {
    return executor.select().from(notifications).where(scope(recipientUserId, filter)).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(limit).offset(offset);
  },
  total(executor: NotificationExecutor, recipientUserId: string, filter: NotificationFilter) {
    return executor.select({ value: count() }).from(notifications).where(scope(recipientUserId, filter)).then(([row]) => Number(row?.value ?? 0));
  },
  activeUnreadCount(executor: NotificationExecutor, recipientUserId: string) {
    return executor.select({ value: count() }).from(notifications).where(and(eq(notifications.recipientUserId, recipientUserId), isNull(notifications.archivedAt), isNull(notifications.readAt))).then(([row]) => Number(row?.value ?? 0));
  },
  /** Ownership is part of the lookup, so another recipient's row is indistinguishable from a missing one. */
  owned(executor: NotificationExecutor, notificationId: string, recipientUserId: string) {
    return executor.select().from(notifications).where(and(eq(notifications.id, notificationId), eq(notifications.recipientUserId, recipientUserId))).limit(1).then(([row]) => row ?? null);
  },
  setRead(executor: NotificationExecutor, notificationId: string, recipientUserId: string, readAt: Date | null) {
    return executor.update(notifications).set({ readAt }).where(and(eq(notifications.id, notificationId), eq(notifications.recipientUserId, recipientUserId))).returning({ id: notifications.id }).then(([row]) => row ?? null);
  },
  setArchived(executor: NotificationExecutor, notificationId: string, recipientUserId: string, archivedAt: Date | null) {
    return executor.update(notifications).set({ archivedAt }).where(and(eq(notifications.id, notificationId), eq(notifications.recipientUserId, recipientUserId))).returning({ id: notifications.id }).then(([row]) => row ?? null);
  },
  /** Marks only the actor's active unread rows, so the operation can never cross a recipient boundary. */
  markAllRead(executor: NotificationExecutor, recipientUserId: string, readAt: Date) {
    return executor.update(notifications).set({ readAt })
      .where(and(eq(notifications.recipientUserId, recipientUserId), isNull(notifications.archivedAt), isNull(notifications.readAt))).returning({ id: notifications.id });
  },
  olderThan(executor: NotificationExecutor, recipientUserId: string, before: Date) {
    return executor.select({ value: count() }).from(notifications).where(and(eq(notifications.recipientUserId, recipientUserId), or(isNull(notifications.readAt), lt(notifications.createdAt, before)))).then(([row]) => Number(row?.value ?? 0));
  },
  // Related-record lookups used to reauthorize a notification link. Only the minimum facts needed for
  // the authorization decision are loaded; no private content is read here.
  evidence(executor: NotificationExecutor, evidenceId: string) {
    return executor.select({ id: employeeEvidence.id, ownerUserId: employeeEvidence.ownerUserId, kind: employeeEvidence.kind, archivedAt: employeeEvidence.archivedAt }).from(employeeEvidence).where(eq(employeeEvidence.id, evidenceId)).limit(1).then(([row]) => row ?? null);
  },
  employeeAccessRecord(executor: NotificationExecutor, userId: string) {
    return executor.select({ userId: users.id, role: users.role, team: employeeProfiles.team }).from(users).leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id)).where(eq(users.id, userId)).limit(1).then(([row]) => row ?? null);
  },
  discussionThread(executor: NotificationExecutor, threadId: string) {
    return executor.select({ id: discussionThreads.id, parentType: discussionThreads.parentType, parentId: discussionThreads.parentId }).from(discussionThreads).where(eq(discussionThreads.id, threadId)).limit(1).then(([row]) => row ?? null);
  },
  replacementRequest(executor: NotificationExecutor, requestId: string) {
    return executor.select({ id: replacementRequests.id, requesterUserId: replacementRequests.requesterUserId, nominatedEmployeeUserId: replacementRequests.nominatedEmployeeUserId, selectedEmployeeUserId: replacementRequests.selectedEmployeeUserId }).from(replacementRequests).where(eq(replacementRequests.id, requestId)).limit(1).then(([row]) => row ?? null);
  },
  leaveRequest(executor: NotificationExecutor, requestId: string) {
    return executor.select({ id: leaveRequests.id, employeeUserId: leaveRequests.employeeUserId }).from(leaveRequests).where(eq(leaveRequests.id, requestId)).limit(1).then(([row]) => row ?? null);
  },
  schedulePeriod(executor: NotificationExecutor, periodId: string) {
    return executor.select({ id: schedulePeriods.id, clientId: schedulePeriods.clientId, isCurrent: schedulePeriods.isCurrent, status: schedulePeriods.status }).from(schedulePeriods).where(eq(schedulePeriods.id, periodId)).limit(1).then(([row]) => row ?? null);
  },
};
