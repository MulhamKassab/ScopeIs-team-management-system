import { z } from "zod";
import { CoverageDomainError } from "@/modules/coverage/domain-error";
const id = z.string().uuid(); const version = z.number().int().positive();
export const replacementCreateSchema = z.object({ staffingRequirementId: id.optional(), anchorAssignmentId: id, intent: z.enum(["REPLACE_ASSIGNMENT", "ADD_COVERAGE_ASSIGNMENT"]), nominatedEmployeeUserId: z.string().min(1).max(160).optional() }).strict();
export const replacementDecisionSchema = z.object({ replacementRequestId: id, expectedVersion: version, decision: z.enum(["APPROVED", "REJECTED"]), selectedEmployeeUserId: z.string().min(1).max(160).optional() }).strict();
export function parseCoverage<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) throw new CoverageDomainError("VALIDATION_ERROR"); return result.data; }
