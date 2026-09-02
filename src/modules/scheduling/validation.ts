import { z } from "zod";
import { SchedulingDomainError } from "@/modules/scheduling/domain-error";

const id = z.string().uuid();
const version = z.number().int().positive();
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).transform((value) => `${value}-01`);
const date = z.string().date();
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const text = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value === "" ? null : value);
const targetFields = z.object({ projectId: id, locationId: id, assignmentDate: date, startTime: localTime, endTime: localTime, sharedInstruction: text(500) }).strict()
  .refine((value) => value.endTime > value.startTime, { message: "End time must be after start time." });

export const scheduleMonthSchema = z.object({ month }).strict();
export const createPeriodSchema = z.object({ clientId: id, month }).strict();
export const periodVersionSchema = z.object({ periodId: id, expectedVersion: version }).strict();
export const returnPeriodSchema = periodVersionSchema.extend({ reason: z.string().trim().min(3).max(500) }).strict();
export const assignmentCreateSchema = z.object({ periodId: id, expectedPeriodVersion: version, employeeUserId: z.string().min(1).max(160), ...targetFields.shape }).strict()
  .refine((value) => value.endTime > value.startTime, { message: "End time must be after start time." });
export const assignmentUpdateSchema = assignmentCreateSchema.extend({ assignmentId: id, expectedVersion: version }).strict();
export const assignmentRemoveSchema = z.object({ periodId: id, assignmentId: id, expectedPeriodVersion: version, expectedVersion: version }).strict();
export const revisionSchema = periodVersionSchema;

export function parseSchedule<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) throw new SchedulingDomainError("VALIDATION_ERROR"); return result.data; }

export type ScheduleTarget = { type: "PROJECT" | "LOCATION"; id: string };
