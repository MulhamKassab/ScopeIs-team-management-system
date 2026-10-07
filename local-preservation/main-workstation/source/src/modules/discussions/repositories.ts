import "server-only";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { discussionMessages, discussionThreads, replacementRequests, users } from "@/db/schema";

export type DiscussionTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DiscussionExecutor = typeof db | DiscussionTransaction;

export const discussionRepository = {
  request(executor: DiscussionExecutor, requestId: string) { return executor.select().from(replacementRequests).where(eq(replacementRequests.id, requestId)).limit(1).then(([row]) => row ?? null); },
  thread(executor: DiscussionExecutor, threadId: string) { return executor.select().from(discussionThreads).where(eq(discussionThreads.id, threadId)).limit(1).then(([row]) => row ?? null); },
  threadForParent(executor: DiscussionExecutor, parentId: string) {
    return executor.select().from(discussionThreads).where(and(eq(discussionThreads.parentType, "replacement_request"), eq(discussionThreads.parentId, parentId))).limit(1).then(([row]) => row ?? null);
  },
  lockThread(tx: DiscussionTransaction, threadId: string) { return tx.execute(sql`select id from discussion_threads where id = ${threadId} for update`); },
  /** Serializes first-message thread creation so two participants cannot race the unique parent key. */
  lockParent(tx: DiscussionTransaction, parentId: string) { return tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`discussion:${parentId}`}))`); },
  createThread(tx: DiscussionTransaction, parentId: string) {
    return tx.insert(discussionThreads).values({ parentType: "replacement_request", parentId }).onConflictDoNothing().returning().then(([row]) => row ?? null);
  },
  touchThread(tx: DiscussionTransaction, threadId: string) { return tx.update(discussionThreads).set({ updatedAt: new Date() }).where(eq(discussionThreads.id, threadId)); },
  messages(executor: DiscussionExecutor, threadId: string) {
    return executor.select({ message: discussionMessages, authorName: users.displayName }).from(discussionMessages).innerJoin(users, eq(users.id, discussionMessages.authorUserId))
      .where(eq(discussionMessages.threadId, threadId)).orderBy(asc(discussionMessages.createdAt), asc(discussionMessages.id));
  },
  message(executor: DiscussionExecutor, messageId: string) { return executor.select().from(discussionMessages).where(eq(discussionMessages.id, messageId)).limit(1).then(([row]) => row ?? null); },
  lockMessage(tx: DiscussionTransaction, messageId: string) { return tx.execute(sql`select id from discussion_messages where id = ${messageId} for update`); },
  createMessage(tx: DiscussionTransaction, values: typeof discussionMessages.$inferInsert) { return tx.insert(discussionMessages).values(values).returning().then(([row]) => row!); },
  archiveMessage(tx: DiscussionTransaction, messageId: string, expectedVersion: number, actorId: string) {
    return tx.update(discussionMessages).set({ archivedAt: new Date(), archivedByUserId: actorId, version: expectedVersion + 1, updatedAt: new Date() })
      .where(and(eq(discussionMessages.id, messageId), eq(discussionMessages.version, expectedVersion), isNull(discussionMessages.archivedAt))).returning().then(([row]) => row ?? null);
  },
  /** Requests the actor participates in, restricted to a real supported parent. */
  participantRequests(executor: DiscussionExecutor, userId: string) {
    return executor.select({ request: replacementRequests, thread: discussionThreads }).from(replacementRequests)
      .leftJoin(discussionThreads, and(eq(discussionThreads.parentType, "replacement_request"), eq(discussionThreads.parentId, replacementRequests.id)))
      .where(or(eq(replacementRequests.requesterUserId, userId), eq(replacementRequests.nominatedEmployeeUserId, userId), eq(replacementRequests.selectedEmployeeUserId, userId)))
      .orderBy(desc(replacementRequests.createdAt));
  },
  latestMessage(executor: DiscussionExecutor, threadId: string) {
    return executor.select({ message: discussionMessages, authorName: users.displayName }).from(discussionMessages).innerJoin(users, eq(users.id, discussionMessages.authorUserId))
      .where(and(eq(discussionMessages.threadId, threadId), isNull(discussionMessages.archivedAt))).orderBy(desc(discussionMessages.createdAt), desc(discussionMessages.id)).limit(1).then(([row]) => row ?? null);
  },
};
