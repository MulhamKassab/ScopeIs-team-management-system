import { z } from "zod";
import { EvidenceDomainError } from "@/modules/evidence/domain-error";

export const EVIDENCE_TIMEZONE = "Asia/Dubai";
export const evidenceKinds = ["certification", "cv", "portfolio", "project_example", "supporting_document"] as const;
export type EvidenceKind = (typeof evidenceKinds)[number];
export const evidenceReviewStates = ["unreviewed", "reviewed", "verified"] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();
const version = z.number().int().positive();

/**
 * Portfolio links must be absolute HTTPS URLs with a hostname and no embedded credentials.
 * They are never fetched server-side, so validation is purely structural.
 */
export const portfolioUrlSchema = z.string().max(2048).refine((value) => {
  let parsed: URL;
  try { parsed = new URL(value); } catch { return false; }
  return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
}, { message: "Portfolio links must be absolute HTTPS URLs." });

const title = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(120).optional();
const optionalNote = z.string().trim().max(1000).optional();

const shared = {
  title,
  issuer: optionalText,
  issueDate: isoDate.optional(),
  expiryDate: isoDate.optional(),
  relatedSkillId: uuid.optional(),
  externalUrl: portfolioUrlSchema.optional(),
  details: optionalNote,
};

export const evidenceCreateSchema = z.object({
  kind: z.enum(evidenceKinds),
  ...shared,
  submissionKey: z.string().trim().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/).optional(),
}).strict();

export const evidenceUpdateSchema = z.object({
  evidenceId: uuid,
  expectedVersion: version,
  ...shared,
}).strict();

export const evidenceVersionSchema = z.object({ evidenceId: uuid, expectedVersion: version }).strict();

export const evidenceReviewSchema = z.object({
  evidenceId: uuid,
  expectedVersion: version,
  state: z.enum(evidenceReviewStates),
}).strict();

export function parseEvidence<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new EvidenceDomainError("VALIDATION_ERROR");
  return result.data;
}

/** The Dubai business date drives expiry comparison so a UTC timestamp can never shift the verdict. */
export function dubaiBusinessDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVIDENCE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type ExpiryStatus = "no_expiry" | "valid" | "expired";

/** Expiry is derived at read time; no expired flag is persisted and no expiring-soon threshold exists. */
export function deriveExpiryStatus(expiryDate: string | null, today = dubaiBusinessDate()): ExpiryStatus {
  if (!expiryDate) return "no_expiry";
  return expiryDate < today ? "expired" : "valid";
}

export function assertExpiryOrdering(issueDate?: string, expiryDate?: string) {
  if (issueDate && expiryDate && expiryDate < issueDate) throw new EvidenceDomainError("VALIDATION_ERROR");
}

/** An item is new or updated until a Super Admin reviews it, and again after any later owner submission. */
export function isNewOrUpdated(input: { lastSubmittedAt: Date | null; reviewedAt: Date | null }) {
  if (!input.reviewedAt) return true;
  if (!input.lastSubmittedAt) return false;
  return input.lastSubmittedAt.getTime() > input.reviewedAt.getTime();
}
