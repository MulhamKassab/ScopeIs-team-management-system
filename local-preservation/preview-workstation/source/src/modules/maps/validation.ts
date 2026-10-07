import { z } from "zod";

const id = z.string().uuid();
const flag = z.enum(["true", "false"]).optional().transform((value) => value === "true");

export const mapQuerySchema = z.object({
  date: z.string().date(), employeeId: id.optional(), skillId: id.optional(), clientId: id.optional(), projectId: id.optional(), locationId: id.optional(),
  unavailable: flag, coverageGap: flag,
}).strict();

export type MapQuery = z.infer<typeof mapQuerySchema>;
export function parseMapQuery(input: unknown): MapQuery | null { const result = mapQuerySchema.safeParse(input); return result.success ? result.data : null; }
export function dubaiToday(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
const GRID_DEGREES = 0.025;
export function coarseCoordinate(latitude: number, longitude: number) { const centre = (value: number) => Number(((Math.floor(value / GRID_DEGREES) + .5) * GRID_DEGREES).toFixed(6)); return { latitude: centre(latitude), longitude: centre(longitude) }; }
