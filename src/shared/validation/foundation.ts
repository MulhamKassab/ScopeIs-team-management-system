import { z } from "zod";
import { scopeTypes, systemRoles } from "@/shared/types/foundation";

export const environmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  MOCK_AUTH_ENABLED: z.enum(["true", "false"]).default("false"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().max(168).default(12),
});

export const mockPersonaSelectionSchema = z.object({ personaId: z.string().min(3).max(80) });
export const scopeReferenceSchema = z.object({ scopeRef: z.string().regex(/^(team|client|project|location):[a-z0-9-]+$/) });
export const scopeGrantSchema = z.object({ type: z.enum(scopeTypes), reference: z.string().min(1).max(100) });
export const roleSchema = z.enum(systemRoles);
export const themeSchema = z.enum(["light", "dark", "system"]);
export const directionSchema = z.enum(["ltr", "rtl"]);
