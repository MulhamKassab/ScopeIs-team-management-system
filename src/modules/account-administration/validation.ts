import { z } from "zod";
import { AccountAdminDomainError } from "./domain-error";

export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export const normalizeLoginEmail = (value: string) => value.trim().toLowerCase();

export const usernameSchema = z.string().trim().toLowerCase().min(3, "Username must be between 3 and 80 characters.").max(80, "Username must be between 3 and 80 characters.")
  .regex(/^[a-z0-9._-]+$/, "Use letters, numbers, dots, underscores, or hyphens only.");
export const loginEmailSchema = z.string().trim().toLowerCase().email("Enter a valid login email address.").max(254, "Login email must be 254 characters or fewer.");
export const workEmailSchema = z.string().trim().email("Enter a valid work email address.").max(254, "Work email must be 254 characters or fewer.");
export const roleSchema = z.enum(["EMPLOYEE", "ADMIN", "SUPER_ADMIN"]);

export const DISPLAY_NAME = z.string().trim().min(2, "Enter a name with at least 2 characters.").max(120, "Name must be 120 characters or fewer.").transform((value) => value.replace(/\s+/g, " "));
export const OPTIONAL_TEXT = (max: number) => z.string().optional().transform((value) => value?.trim() || undefined).pipe(z.string().max(max).optional());

/**
 * Temporary-password policy for this controlled internal version. The value itself is never logged,
 * echoed, or stored; only these structural checks run, and the password is hashed immediately.
 */
export function passwordPolicyErrors(password: string, identifiers: { username?: string; email?: string }): string[] {
  const errors: string[] = [];
  if (password.length < 8 || password.length > 128) errors.push("Password must be between 8 and 128 characters.");
  if (!/[A-Za-z]/.test(password)) errors.push("Password must include at least one letter.");
  if (!/[0-9]/.test(password)) errors.push("Password must include at least one number.");
  if (password.trim().length === 0) errors.push("Password cannot be whitespace only.");
  const lowered = password.toLowerCase();
  if (identifiers.username && lowered === identifiers.username.trim().toLowerCase()) errors.push("Password cannot be the username.");
  if (identifiers.email && lowered === identifiers.email.trim().toLowerCase()) errors.push("Password cannot be the login email.");
  return errors;
}

export const temporaryPasswordSchema = z.string().min(1, "Enter a temporary password.").max(128, "Password must be 128 characters or fewer.");

function passwordsMatch(data: { password?: string; confirmPassword?: string }) {
  return data.password !== undefined && data.password === data.confirmPassword;
}

export const createAccountSchema = z.object({
  displayName: DISPLAY_NAME,
  username: usernameSchema,
  loginEmail: loginEmailSchema,
  workEmail: z.string().trim().email("Enter a valid work email address.").max(254).optional().or(z.literal("")).transform((value) => value || undefined),
  role: roleSchema,
  password: temporaryPasswordSchema,
  confirmPassword: temporaryPasswordSchema,
  mustChangePassword: z.boolean().default(true),
  workPhone: OPTIONAL_TEXT(40),
  professionalSummary: OPTIONAL_TEXT(2_000),
  superAdminConfirmed: z.boolean().default(false),
}).strict().superRefine((data, ctx) => {
  if (!passwordsMatch(data)) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
  for (const message of passwordPolicyErrors(data.password, { username: data.username, email: data.loginEmail })) ctx.addIssue({ code: "custom", path: ["password"], message });
  if (data.role === "SUPER_ADMIN" && !data.superAdminConfirmed) ctx.addIssue({ code: "custom", path: ["superAdminConfirmed"], message: "Confirm that you intend to create a Super Admin." });
});

export const enableCredentialsSchema = z.object({
  userId: z.string().trim().min(1).max(160),
  username: usernameSchema,
  loginEmail: loginEmailSchema,
  password: temporaryPasswordSchema,
  confirmPassword: temporaryPasswordSchema,
  mustChangePassword: z.boolean().default(true),
}).strict().superRefine((data, ctx) => {
  if (!passwordsMatch(data)) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
  for (const message of passwordPolicyErrors(data.password, { username: data.username, email: data.loginEmail })) ctx.addIssue({ code: "custom", path: ["password"], message });
});

export const resetPasswordSchema = z.object({
  userId: z.string().trim().min(1).max(160),
  expectedVersion: z.number().int().positive(),
  password: temporaryPasswordSchema,
  confirmPassword: temporaryPasswordSchema,
  mustChangePassword: z.boolean().default(true),
  confirmRevoke: z.boolean().default(false),
  currentPassword: z.string().max(128).optional(),
  highRiskConfirmed: z.boolean().default(false),
}).strict().superRefine((data, ctx) => {
  if (!passwordsMatch(data)) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
  if (!data.confirmRevoke) ctx.addIssue({ code: "custom", path: ["confirmRevoke"], message: "Confirm that existing sessions will be revoked." });
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
  newPassword: temporaryPasswordSchema,
  confirmPassword: temporaryPasswordSchema,
}).strict().superRefine((data, ctx) => {
  if (data.newPassword !== data.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
  if (data.newPassword === data.currentPassword) ctx.addIssue({ code: "custom", path: ["newPassword"], message: "The new password must be different from the current password." });
  for (const message of passwordPolicyErrors(data.newPassword, {})) ctx.addIssue({ code: "custom", path: ["newPassword"], message });
});

export const accountFilterSchema = z.object({
  query: z.string().trim().max(80).optional().transform((value) => value || undefined),
  role: z.enum(["EMPLOYEE", "ADMIN", "SUPER_ADMIN"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  credentials: z.enum(["configured", "missing"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
}).strict();

export function parseAccountInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const flat = result.error.flatten();
    const first = Object.values(flat.fieldErrors).flat().find((entry): entry is string => typeof entry === "string");
    throw new AccountAdminDomainError(first && /Password/.test(first) ? "PASSWORD_POLICY" : "VALIDATION_ERROR");
  }
  return result.data;
}
