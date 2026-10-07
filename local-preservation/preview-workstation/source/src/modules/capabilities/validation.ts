import { z } from "zod";
import { CapabilityDomainError } from "@/modules/capabilities/domain-error";

const id = z.string().uuid();
const version = z.number().int().positive();
export const assignmentRequirementCreateSchema = z.object({ assignmentId: id, skillId: id }).strict();
export const assignmentRequirementArchiveSchema = z.object({ requirementId: id, expectedVersion: version }).strict();
export const plannerSkillSchema = z.object({ skillId: id.optional() }).strict();
export function parseCapabilities<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new CapabilityDomainError("VALIDATION_ERROR"); return result.data; }
