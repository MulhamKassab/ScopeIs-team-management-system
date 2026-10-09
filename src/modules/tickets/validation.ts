import { z } from "zod";
import { errors } from "@/shared/errors/app-error";
import { boardStatuses, ticketPriorities, ticketStatuses } from "./types";
const id = z.string().uuid();
const version = z.number().int().positive();
const userId = z.string().trim().min(1).max(160);
const plainText = (max: number) => z.string().trim().max(max).refine((value) => !/<\/?[a-z][^>]*>/i.test(value), "Use plain text.");
const nullableText = (max: number) => plainText(max).nullable().optional().transform((value) => value === "" ? null : value);
const ids = z.array(userId).max(50).refine((value) => new Set(value).size === value.length, "Duplicate people.");
const contents = { subject: plainText(200).min(1), ticketDate: z.string().date(), dueDate: z.string().date().nullable().optional(), status: z.enum(ticketStatuses), priority: z.enum(ticketPriorities), summary: nullableText(10000), planning: nullableText(10000), workCompleted: nullableText(10000), notes: nullableText(10000), onHoldReason: nullableText(2000) };
const participants = { assigneeIds: ids, observerIds: ids };
export const createWorkspaceSchema = z.object({ action: z.literal("createWorkspace"), name: plainText(120).min(1), description: nullableText(1000), clientId: id.nullable().optional(), projectId: id.nullable().optional() }).strict();
export const updateWorkspaceSchema = z.object({ action: z.literal("updateWorkspace"), workspaceId: id, version, name: plainText(120).min(1).optional(), description: nullableText(1000) }).strict().refine((value) => value.name !== undefined || value.description !== undefined);
export const workspaceMemberSchema = z.object({ action: z.literal("setWorkspaceMember"), workspaceId: id, userId, active: z.boolean(), version }).strict();
export const createBoardSchema = z.object({ action: z.literal("createBoard"), workspaceId: id, name: plainText(120).min(1), status: z.enum(boardStatuses).default("DRAFT"), version }).strict();
export const updateBoardSchema = z.object({ action: z.literal("updateBoard"), boardId: id, name: plainText(120).min(1).optional(), status: z.enum(boardStatuses).optional(), version }).strict().refine((value) => value.name !== undefined || value.status !== undefined);
export const createTicketSchema = z.object({ action: z.literal("createTicket"), boardId: id, version, ...contents, status: contents.status.default("OPEN"), priority: contents.priority.default("MEDIUM"), assigneeIds: ids.default([]), observerIds: ids.default([]) }).strict();
export const updateTicketSchema = z.object({ action: z.literal("updateTicket"), ticketId: id, version, ...Object.fromEntries(Object.entries(contents).map(([key, value]) => [key, value.optional()])) as { [K in keyof typeof contents]: z.ZodOptional<(typeof contents)[K]> } }).strict().refine((value) => Object.keys(value).some((key) => !["action", "ticketId", "version"].includes(key)));
export const setParticipantsSchema = z.object({ action: z.literal("setParticipants"), ticketId: id, version, ...participants }).strict();
const log = { ticketId: id, version, description: plainText(5000).min(1), loggedAt: z.string().datetime({ offset: true }).optional(), durationMinutes: z.number().int().min(1).max(1440).nullable().optional() };
export const addWorkLogSchema = z.object({ action: z.literal("addWorkLog"), ...log }).strict();
export const editWorkLogSchema = z.object({ action: z.literal("editWorkLog"), ...log, workLogId: id }).strict();
const ticketVersion = { ticketId: id, version };
export const archiveTicketSchema = z.object({ action: z.literal("archiveTicket"), ...ticketVersion }).strict();
export const restoreTicketSchema = z.object({ action: z.literal("restoreTicket"), ...ticketVersion }).strict();
export const ticketCommandSchema = z.discriminatedUnion("action", [createWorkspaceSchema, updateWorkspaceSchema, workspaceMemberSchema, createBoardSchema, updateBoardSchema, createTicketSchema, updateTicketSchema, setParticipantsSchema, addWorkLogSchema, editWorkLogSchema, archiveTicketSchema, restoreTicketSchema]);
export type TicketCommand = z.infer<typeof ticketCommandSchema>;
export function parseTicketCommand(input: unknown): TicketCommand { const parsed = ticketCommandSchema.safeParse(input); if (!parsed.success) throw errors.validation(); return parsed.data; }
/** Applied after combining an edit with the current row; patching status alone cannot bypass its reason. */
export function validateTicketState(input: { status: string; ticketDate: string; dueDate?: string | null; onHoldReason?: string | null }) {
  if (input.status === "ON_HOLD" && !input.onHoldReason?.trim()) throw errors.validation();
}
export function validateParticipantIds(assigneeIds: string[], observerIds: string[]) { if (assigneeIds.some((id) => observerIds.includes(id))) throw errors.validation(); }
