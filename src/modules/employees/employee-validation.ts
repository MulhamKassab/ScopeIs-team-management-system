import { z } from "zod";
import { EmployeeDomainError } from "@/modules/employees/domain-error";

export function normalizeCatalogueName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function normalizeIdentifier(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

const nonBlank = z.string().transform((value) => value.trim()).refine((value) => value.length > 0, "Required");
const nullableText = z.string().transform((value) => value.trim()).nullable().optional();
const nullableOptionalText = nullableText.transform((value) => value === "" ? null : value);
const version = z.number().int().positive();

export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(25),
  query: z.string().trim().optional(),
  includeArchived: z.boolean().optional().default(false),
});

export const catalogueCreateSchema = z.object({ name: nonBlank, sortOrder: z.number().int().optional().default(0) }).strict();
export const catalogueUpdateSchema = z.object({ name: nonBlank.optional(), sortOrder: z.number().int().optional(), expectedVersion: version }).strict()
  .refine((value) => value.name !== undefined || value.sortOrder !== undefined, "At least one field is required");
export const skillCreateSchema = z.object({ name: nonBlank }).strict();
export const skillUpdateSchema = z.object({ name: nonBlank.optional(), expectedVersion: version }).strict()
  .refine((value) => value.name !== undefined, "At least one field is required");
export const arrangementCreateSchema = catalogueCreateSchema.extend({ color: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hexadecimal colour") }).strict();
export const arrangementUpdateSchema = catalogueUpdateSchema.extend({ color: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional() }).strict()
  .refine((value) => value.name !== undefined || value.sortOrder !== undefined || value.color !== undefined, "At least one field is required");

export const createEmployeeProfileSchema = z.object({
  userId: nonBlank,
  employeeCode: nonBlank,
  workEmail: z.string().email().nullable().optional(),
  workPhone: nullableOptionalText,
  professionalSummary: nullableOptionalText,
  designationId: nullableOptionalText,
  team: nullableOptionalText,
  managerUserId: nullableOptionalText,
  defaultWorkLocation: nullableOptionalText,
}).strict();
export const managementProfileUpdateSchema = createEmployeeProfileSchema.omit({ userId: true, employeeCode: true }).extend({
  employeeCode: nonBlank.optional(), expectedVersion: version,
}).strict().refine((value) => Object.keys(value).some((key) => key !== "expectedVersion"), "At least one field is required");
export const selfProfileUpdateSchema = z.object({
  workEmail: z.string().email().nullable().optional(), workPhone: nullableOptionalText, professionalSummary: nullableOptionalText, expectedVersion: version,
}).strict().refine((value) => value.workEmail !== undefined || value.workPhone !== undefined || value.professionalSummary !== undefined, "At least one field is required");

export const employeeSkillCreateSchema = z.object({
  employeeUserId: nonBlank, skillId: nonBlank, proficiencyDescription: nullableOptionalText, experienceDescription: nullableOptionalText,
  notes: nullableOptionalText, coverageEligible: z.boolean().nullable().optional(), verified: z.boolean().optional().default(false),
}).strict();
export const employeeSkillUpdateSchema = employeeSkillCreateSchema.omit({ employeeUserId: true, skillId: true }).extend({ expectedVersion: version }).strict()
  .refine((value) => Object.keys(value).some((key) => key !== "expectedVersion"), "At least one field is required");

export function parseOrDomainError<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new EmployeeDomainError("VALIDATION_ERROR");
  return result.data;
}
