import { z } from "zod";
import { OperationalDomainError } from "@/modules/operations/domain-error";

const id = z.string().uuid();
const userId = z.string().min(1).max(160);
const version = z.number().int().positive();
const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable().optional().transform((value) => value === "" ? null : value);
const requiredText = (minimum: number, maximum: number) => z.string().trim().min(minimum).max(maximum).transform((value) => value.replace(/\s+/g, " "));
const optionalDate = z.string().date().nullable().optional().transform((value) => value === "" ? null : value);

export const operationalTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CLIENT"), id }), z.object({ type: z.literal("PROJECT"), id }), z.object({ type: z.literal("LOCATION"), id }),
]);
export type OperationalTarget = z.infer<typeof operationalTargetSchema>;
const targetObjectSchema = z.object({ type: z.enum(["CLIENT", "PROJECT", "LOCATION"]), id });

export const listQuerySchema = z.object({ query: z.string().trim().max(100).optional().default(""), includeArchived: z.boolean().optional().default(false) }).strict();
const clientFieldsSchema = z.object({
  companyName: requiredText(2, 160), accountManagerUserId: userId.nullable().optional(), serviceSummary: optionalText(2_000), serviceStartDate: optionalDate, serviceEndDate: optionalDate,
}).strict();
export const createClientSchema = clientFieldsSchema.refine((value) => !value.serviceStartDate || !value.serviceEndDate || value.serviceEndDate >= value.serviceStartDate, "Invalid service dates");
export const updateClientSchema = clientFieldsSchema.partial().extend({ expectedVersion: version }).strict()
  .refine((value) => Object.keys(value).some((key) => key !== "expectedVersion"), "At least one field is required")
  .refine((value) => !value.serviceStartDate || !value.serviceEndDate || value.serviceEndDate >= value.serviceStartDate, "Invalid service dates");
const projectFieldsSchema = z.object({ clientId: id, name: requiredText(2, 160), status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional().default("PLANNED"), responsibleAdminUserId: userId.nullable().optional(), startDate: optionalDate, endDate: optionalDate }).strict();
export const createProjectSchema = projectFieldsSchema
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, "Invalid project dates");
export const updateProjectSchema = projectFieldsSchema.omit({ clientId: true }).partial().extend({ expectedVersion: version }).strict()
  .refine((value) => Object.keys(value).some((key) => key !== "expectedVersion"), "At least one field is required")
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, "Invalid project dates");
const coordinate = z.number().finite().nullable().optional();
const locationFieldsSchema = z.object({ clientId: id, name: requiredText(2, 160), address: requiredText(3, 500), latitude: coordinate, longitude: coordinate, siteHours: optionalText(1_000), accessInstructions: optionalText(2_000), visitRequirements: optionalText(2_000) }).strict();
export const createLocationSchema = locationFieldsSchema
  .superRefine((value, context) => {
    if ((value.latitude == null) !== (value.longitude == null)) context.addIssue({ code: "custom", message: "Enter both coordinates or neither." });
    if (value.latitude != null && (value.latitude < -90 || value.latitude > 90)) context.addIssue({ code: "custom", message: "Latitude is out of range." });
    if (value.longitude != null && (value.longitude < -180 || value.longitude > 180)) context.addIssue({ code: "custom", message: "Longitude is out of range." });
  });
export const updateLocationSchema = locationFieldsSchema.omit({ clientId: true }).partial().extend({ expectedVersion: version }).strict().superRefine((value, context) => {
  if ((value.latitude == null) !== (value.longitude == null)) context.addIssue({ code: "custom", message: "Enter both coordinates or neither." });
  if (value.latitude != null && (value.latitude < -90 || value.latitude > 90)) context.addIssue({ code: "custom", message: "Latitude is out of range." });
  if (value.longitude != null && (value.longitude < -180 || value.longitude > 180)) context.addIssue({ code: "custom", message: "Longitude is out of range." });
  if (!Object.keys(value).some((key) => key !== "expectedVersion")) context.addIssue({ code: "custom", message: "At least one field is required." });
});
export const lifecycleSchema = z.object({ expectedVersion: version, archived: z.boolean() }).strict();
export const projectLocationSchema = z.object({ projectId: id, locationId: id, expectedVersion: version.optional() }).strict();
export const contactSchema = targetObjectSchema.extend({ name: requiredText(2, 160), roleTitle: optionalText(160), workPhone: optionalText(40), workEmail: z.string().trim().email().max(254).nullable().optional().transform((value) => value === "" ? null : value) }).strict();
export const staffingRequirementSchema = targetObjectSchema.extend({ requiredSkillId: id, requiredEmployeeCount: z.number().int().positive().max(1_000), note: optionalText(1_000) }).strict();
export const employeeRelationSchema = targetObjectSchema.extend({ employeeUserId: userId }).strict();
export const noteCreateSchema = targetObjectSchema.extend({ content: requiredText(1, 5_000) }).strict();
export const noteUpdateSchema = z.object({ noteId: id, content: requiredText(1, 5_000), expectedVersion: version }).strict();
export const noteArchiveSchema = z.object({ noteId: id, reason: requiredText(3, 500), expectedVersion: version }).strict();
export const supportingArchiveSchema = z.object({ kind: z.enum(["CONTACT", "REQUIREMENT", "EMPLOYEE_RELATION"]), id, expectedVersion: version }).strict();
export const grantSchema = z.object({ adminUserId: userId, target: operationalTargetSchema, expectedVersion: version.optional() }).strict();
export const revokeGrantSchema = z.object({ grantId: id, expectedVersion: version }).strict();

export function parseOperational<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input); if (!result.success) throw new OperationalDomainError("VALIDATION_ERROR"); return result.data;
}
