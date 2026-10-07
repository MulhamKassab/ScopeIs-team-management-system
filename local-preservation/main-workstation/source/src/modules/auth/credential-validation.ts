import { z } from "zod";

export const normalizeIdentifier = (identifier: string) => identifier.trim().toLowerCase();
export const credentialLoginSchema = z.object({
  identifier: z.string().max(254).trim().min(1),
  password: z.string().min(1).max(128),
}).strict();
