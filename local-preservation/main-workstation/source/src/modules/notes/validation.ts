import { z } from "zod";
import { NoteDomainError } from "@/modules/notes/domain-error";

export const managementNoteVisibilities = ["private_to_author", "shared_upward"] as const;
export const MANAGEMENT_NOTE_MAX_LENGTH = 5000;

const uuid = z.string().uuid();
const version = z.number().int().positive();
const content = z.string().trim().min(1).max(MANAGEMENT_NOTE_MAX_LENGTH);

export const managementNoteCreateSchema = z.object({
  subjectUserId: z.string().trim().min(1).max(160),
  visibility: z.enum(managementNoteVisibilities),
  content,
}).strict();

export const managementNoteArchiveSchema = z.object({
  noteId: uuid,
  expectedVersion: version,
  reason: z.string().trim().min(3).max(500),
}).strict();

export function parseNote<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new NoteDomainError("VALIDATION_ERROR");
  return result.data;
}

/** Content is rendered as plain text only; this guard rejects markup-shaped input at the boundary. */
export function looksLikeMarkup(value: string) { return /<[a-z!/][^>]*>/i.test(value); }
