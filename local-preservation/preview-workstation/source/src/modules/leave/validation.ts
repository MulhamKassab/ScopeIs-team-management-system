import { z } from "zod";
import { LeaveDomainError } from "@/modules/leave/domain-error";
const id = z.string().uuid(); const version = z.number().int().positive(); const date = z.string().date(); const optionalText = z.string().trim().max(1000).optional().transform((value) => value || null);
export const leaveSubmitSchema = z.object({ startDate: date, endDate: date, privateReason: optionalText }).strict().refine((value) => value.endDate >= value.startDate);
export const leaveVersionSchema = z.object({ leaveRequestId: id, expectedVersion: version }).strict();
export const leaveDecisionSchema = leaveVersionSchema.extend({ decision: z.enum(["APPROVED", "REJECTED"]), response: optionalText }).strict().superRefine((value, ctx) => { if (value.decision === "REJECTED" && !value.response) ctx.addIssue({ code: "custom", message: "Response required" }); });
export const allowanceUpdateSchema = z.object({ annualWorkingDays: z.number().int().min(1).max(366), expectedVersion: version }).strict();
export function parseLeave<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) throw new LeaveDomainError("VALIDATION_ERROR"); return result.data; }
