import { z } from "zod";
import { DiscussionDomainError } from "@/modules/discussions/domain-error";

/** The only Phase 10 discussion parent. Anything else fails closed. */
export const SUPPORTED_DISCUSSION_PARENTS = ["replacement_request"] as const;
export const DISCUSSION_MESSAGE_MAX_LENGTH = 2000;

const uuid = z.string().uuid();

export const discussionPostSchema = z.object({
  parentType: z.enum(SUPPORTED_DISCUSSION_PARENTS),
  parentId: uuid,
  content: z.string().trim().min(1).max(DISCUSSION_MESSAGE_MAX_LENGTH),
}).strict();

export const discussionArchiveSchema = z.object({ messageId: uuid, expectedVersion: z.number().int().positive() }).strict();

export function parseDiscussion<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new DiscussionDomainError("VALIDATION_ERROR");
  return result.data;
}

/** Content is stored and rendered as plain text; markup-shaped input is refused at the boundary. */
export function looksLikeMarkup(value: string) { return /<[a-z!/][^>]*>/i.test(value); }
