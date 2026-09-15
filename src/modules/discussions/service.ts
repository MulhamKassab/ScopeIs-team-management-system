import "server-only";
import { db } from "@/db/client";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { DiscussionDomainError } from "@/modules/discussions/domain-error";
import { discussionRepository, type DiscussionTransaction } from "@/modules/discussions/repositories";
import { discussionArchiveSchema, discussionPostSchema, looksLikeMarkup, parseDiscussion } from "@/modules/discussions/validation";
import { createNotification } from "@/modules/notifications/notification-service";
import type { AuthenticatedActor } from "@/shared/types/foundation";

type AuditWriter = typeof writeAuditEvent;
type NotificationWriter = typeof createNotification;

export type DiscussionMessageView = { id: string; authorUserId: string; authorName: string; content: string; isAuthor: boolean; version: number; createdAt: string; archivedAt: string | null };
export type DiscussionThreadView = {
  requestId: string; threadId: string | null; intent: string; status: string;
  participants: { requesterUserId: string; nominatedEmployeeUserId: string | null; selectedEmployeeUserId: string | null };
  messages: DiscussionMessageView[]; lastMessageAt: string | null;
};

type RequestRow = NonNullable<Awaited<ReturnType<typeof discussionRepository.request>>>;

/** Participants are derived from the request itself; roles never confer participation. */
export function requestParticipants(request: Pick<RequestRow, "requesterUserId" | "nominatedEmployeeUserId" | "selectedEmployeeUserId">) {
  return [...new Set([request.requesterUserId, request.nominatedEmployeeUserId, request.selectedEmployeeUserId].filter((id): id is string => Boolean(id)))];
}

export class DiscussionService {
  constructor(private readonly auditWriter: AuditWriter = writeAuditEvent, private readonly notificationWriter: NotificationWriter = createNotification) {}

  private audit(tx: DiscussionTransaction, actor: AuthenticatedActor, action: string, targetId: string, metadata: Record<string, unknown>) {
    return this.auditWriter(tx, { actor, action, targetType: "discussion_thread", targetId, metadata });
  }

  /** Loads the parent and confirms the actor participates. Non-participants get the same refusal as a missing request. */
  private async requireParticipantRequest(actor: AuthenticatedActor, requestId: string) {
    const request = await discussionRepository.request(db, requestId);
    if (!request) throw new DiscussionDomainError("NOT_FOUND");
    if (!requestParticipants(request).includes(actor.id)) throw new DiscussionDomainError("NOT_FOUND");
    return request;
  }

  private async messageViews(rows: Awaited<ReturnType<typeof discussionRepository.messages>>, actor: AuthenticatedActor): Promise<DiscussionMessageView[]> {
    return rows.map(({ message, authorName }) => ({
      id: message.id, authorUserId: message.authorUserId, authorName, content: message.content, isAuthor: message.authorUserId === actor.id,
      version: message.version, createdAt: message.createdAt.toISOString(), archivedAt: message.archivedAt ? message.archivedAt.toISOString() : null,
    }));
  }

  async openThread(actor: AuthenticatedActor, requestId: string): Promise<DiscussionThreadView> {
    const request = await this.requireParticipantRequest(actor, requestId);
    const thread = await discussionRepository.threadForParent(db, request.id);
    const rows = thread ? await discussionRepository.messages(db, thread.id) : [];
    return {
      requestId: request.id, threadId: thread?.id ?? null, intent: request.intent, status: request.status,
      participants: { requesterUserId: request.requesterUserId, nominatedEmployeeUserId: request.nominatedEmployeeUserId, selectedEmployeeUserId: request.selectedEmployeeUserId },
      messages: await this.messageViews(rows, actor),
      lastMessageAt: rows.length ? rows[rows.length - 1].message.createdAt.toISOString() : null,
    };
  }

  /** Every request the actor participates in, so /requests and /replacements can offer the right threads. */
  async listMine(actor: AuthenticatedActor) {
    const rows = await discussionRepository.participantRequests(db, actor.id);
    const threads: DiscussionThreadView[] = [];
    for (const { request, thread } of rows) {
      const latest = thread ? await discussionRepository.latestMessage(db, thread.id) : null;
      threads.push({
        requestId: request.id, threadId: thread?.id ?? null, intent: request.intent, status: request.status,
        participants: { requesterUserId: request.requesterUserId, nominatedEmployeeUserId: request.nominatedEmployeeUserId, selectedEmployeeUserId: request.selectedEmployeeUserId },
        messages: [], lastMessageAt: latest ? latest.message.createdAt.toISOString() : null,
      });
    }
    return { threads };
  }

  async postMessage(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseDiscussion(discussionPostSchema, input);
    if (looksLikeMarkup(parsed.content)) throw new DiscussionDomainError("VALIDATION_ERROR");
    const request = await this.requireParticipantRequest(actor, parsed.parentId);
    const participants = requestParticipants(request);
    return db.transaction(async (tx) => {
      await discussionRepository.lockParent(tx, request.id);
      let thread = await discussionRepository.threadForParent(tx, request.id);
      if (!thread) thread = await discussionRepository.createThread(tx, request.id);
      // Another participant may have created the thread concurrently; re-read before locking.
      if (!thread) thread = await discussionRepository.threadForParent(tx, request.id);
      if (!thread) throw new DiscussionDomainError("INVALID_STATE");
      await discussionRepository.lockThread(tx, thread.id);
      const message = await discussionRepository.createMessage(tx, { threadId: thread.id, authorUserId: actor.id, content: parsed.content });
      await discussionRepository.touchThread(tx, thread.id);
      // Audit metadata never includes message content.
      await this.audit(tx, actor, "discussion.message_created", thread.id, { parentType: "replacement_request", parentId: request.id, messageId: message.id, contentLength: message.content.length, participantCount: participants.length });
      for (const recipient of participants) if (recipient !== actor.id) await this.notificationWriter(tx, { recipientUserId: recipient, eventType: "discussion.message_created", relatedRecordType: "discussion_thread", relatedRecordId: thread.id });
      return { message, threadId: thread.id };
    });
  }

  async archiveMessage(actor: AuthenticatedActor, input: unknown) {
    const parsed = parseDiscussion(discussionArchiveSchema, input);
    const existing = await discussionRepository.message(db, parsed.messageId);
    if (!existing || existing.archivedAt) throw new DiscussionDomainError("NOT_FOUND");
    const thread = await discussionRepository.thread(db, existing.threadId);
    if (!thread) throw new DiscussionDomainError("NOT_FOUND");
    const request = await this.requireParticipantRequest(actor, thread.parentId);
    // Only the author may archive their own message; other participants cannot remove someone else's words.
    if (existing.authorUserId !== actor.id) throw new DiscussionDomainError("NOT_FOUND");
    return db.transaction(async (tx) => {
      await discussionRepository.lockMessage(tx, existing.id);
      const row = await discussionRepository.archiveMessage(tx, existing.id, parsed.expectedVersion, actor.id);
      if (!row) throw new DiscussionDomainError("STALE_VERSION");
      await this.audit(tx, actor, "discussion.message_archived", thread.id, { parentType: "replacement_request", parentId: request.id, messageId: row.id, previousVersion: parsed.expectedVersion });
      return { message: row };
    });
  }
}

export const discussionService = new DiscussionService();
