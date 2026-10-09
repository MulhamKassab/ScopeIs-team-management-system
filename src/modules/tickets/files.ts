import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { ticketFiles, tickets, users } from "@/db/schema";
import { writeAuditEvent } from "@/modules/audit/audit-service";
import { validateEvidenceFile, MAX_EVIDENCE_FILE_BYTES } from "@/modules/evidence/file-validation";
import { ticketService } from "@/modules/tickets/service";
import type { TicketTransaction } from "@/modules/tickets/repositories";
import { evidenceStorage, type EvidenceStorage } from "@/server/providers/evidence-storage";
import { AppError, errors } from "@/shared/errors/app-error";
import type { AuthenticatedActor } from "@/shared/types/foundation";

export const MAX_TICKET_FILE_BYTES = MAX_EVIDENCE_FILE_BYTES;
export const MAX_TICKET_UPLOAD_BODY_BYTES = 10 * 1024 * 1024;
export const MAX_HOSTED_TICKET_FILE_BYTES = 4 * 1024 * 1024;

/** Leave room for multipart overhead below Vercel's 4.5 MB function payload limit. */
export function ticketUploadLimitBytes(environment: NodeJS.ProcessEnv = process.env) {
  const hosted = environment.VERCEL === "1" || environment.VERCEL === "true" || environment.VERCEL_ENV === "production";
  const production = environment.APP_ENV === "production" || environment.NODE_ENV === "production" || environment.VERCEL_ENV === "production";
  return hosted && production ? MAX_HOSTED_TICKET_FILE_BYTES : MAX_TICKET_FILE_BYTES;
}

function ticketUploadBodyLimitBytes() {
  return ticketUploadLimitBytes() === MAX_HOSTED_TICKET_FILE_BYTES ? MAX_HOSTED_TICKET_FILE_BYTES + 64 * 1024 : MAX_TICKET_UPLOAD_BODY_BYTES;
}
const uuid = z.uuid();
const versionSchema = z.number().int().positive();
const commandSchema = z.object({ ticketId: uuid, fileId: uuid, action: z.enum(["archive", "restore"]), version: versionSchema, fileVersion: versionSchema }).strict();
const unavailable = () => new AppError("FORBIDDEN", "This resource is unavailable.", 404);
const storageFailure = () => new AppError("DATABASE_FAILURE", "Private file storage is temporarily unavailable.", 503);
type Access = Awaited<ReturnType<typeof ticketService.fileAccess>>;
type FileRow = typeof ticketFiles.$inferSelect;
type AuditWriter = typeof writeAuditEvent;

export type TicketFileView = {
  id: string; ticketId: string; fileName: string; contentType: string; byteSize: number;
  uploaderUserId: string; uploaderName: string; version: number; createdAt: string; archivedAt: string | null;
  canArchive: boolean; canRestore: boolean;
};

/** Uses the host's established allowlist, size bound and signature checks. */
export function validateTicketFile(input: { bytes: Uint8Array; contentType: string; filename: string }) {
  try {
    if (input.bytes.byteLength > ticketUploadLimitBytes()) throw errors.validation();
    const result = validateEvidenceFile(input);
    if (result.displayFilename.length > 180) throw errors.validation();
    return result;
  } catch { throw errors.validation(); }
}

/** Attachment-only delivery prevents uploaded content from becoming an application document. */
export function ticketFileHeaders(file: { fileName: string; contentType: string; byteSize: number }) {
  const ascii = file.fileName.replace(/[^\u0020-\u007e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(file.fileName).replace(/['()*]/g, (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`);
  return {
    "Content-Type": file.contentType,
    "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`,
    "Content-Length": String(file.byteSize),
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}

/** Bounds the actual stream as well as Content-Length before a multipart parser can allocate it. */
export async function readBoundedTicketBody(request: Request, limit = ticketUploadBodyLimitBytes()) {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw errors.validation();
  if (!request.body) throw errors.validation();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > limit) { await reader.cancel(); throw errors.validation(); }
      chunks.push(item.value);
    }
  } finally { reader.releaseLock(); }
  if (size === 0) throw errors.validation();
  const body = new ArrayBuffer(size);
  const bytes = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

export async function parseTicketUpload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType) || !/\bboundary=/i.test(contentType)) throw errors.validation();
  const body = await readBoundedTicketBody(request);
  let form: FormData;
  try { form = await new Request(request.url, { method: "POST", headers: { "content-type": contentType }, body }).formData(); }
  catch { throw errors.validation(); }
  if ([...form.keys()].some((key) => key !== "file" && key !== "version") || form.getAll("file").length !== 1 || form.getAll("version").length !== 1) throw errors.validation();
  const file = form.get("file");
  const version = form.get("version");
  if (!(file instanceof File) || typeof version !== "string" || !/^[1-9]\d*$/.test(version) || file.size < 1 || file.size > ticketUploadLimitBytes()) throw errors.validation();
  const parsedVersion = versionSchema.safeParse(Number(version));
  if (!parsedVersion.success) throw errors.validation();
  return { version: parsedVersion.data, bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type, filename: file.name };
}

function fileView(row: FileRow, uploaderName: string, access: Access): TicketFileView {
  const canChange = access.canWrite && (access.canManage || row.uploaderUserId === access.actor.id);
  return {
    id: row.id, ticketId: row.ticketId, fileName: row.fileName, contentType: row.contentType, byteSize: row.byteSize,
    uploaderUserId: row.uploaderUserId, uploaderName, version: row.version, createdAt: row.createdAt.toISOString(), archivedAt: row.archivedAt?.toISOString() ?? null,
    canArchive: canChange && row.archivedAt === null, canRestore: canChange && row.archivedAt !== null,
  };
}

export class TicketFilesService {
  constructor(private readonly storageResolver: () => EvidenceStorage = evidenceStorage, private readonly auditWriter: AuditWriter = writeAuditEvent) {}

  private async bumpTicket(tx: TicketTransaction, ticketId: string, version: number) {
    const [row] = await tx.update(tickets).set({ version: sql`${tickets.version} + 1`, updatedAt: new Date() }).where(and(eq(tickets.id, ticketId), eq(tickets.version, version))).returning({ version: tickets.version });
    if (!row) throw errors.stale();
    return row.version;
  }

  async list(actor: AuthenticatedActor, ticketId: string, options: { includeArchived?: boolean } = {}) {
    return db.transaction(async (tx) => {
      const access = await ticketService.accessInTransaction(actor, tx, ticketId);
      const rows = await tx.select({ file: ticketFiles, uploaderName: users.displayName }).from(ticketFiles).innerJoin(users, eq(users.id, ticketFiles.uploaderUserId)).where(eq(ticketFiles.ticketId, ticketId)).orderBy(desc(ticketFiles.createdAt), desc(ticketFiles.id));
      return {
        files: rows.filter(({ file }) => !file.archivedAt || (options.includeArchived && (access.canManage || file.uploaderUserId === access.actor.id))).map(({ file, uploaderName }) => fileView(file, uploaderName, access)),
        version: access.version, canWrite: access.canWrite, canManage: access.canManage,
      };
    });
  }

  /** Store before the transaction, reauthorize under locks, and compensate every failed commit. */
  async attach(actor: AuthenticatedActor, input: { ticketId: string; version: number; bytes: Uint8Array; contentType: string; filename: string }) {
    if (!uuid.safeParse(input.ticketId).success || !versionSchema.safeParse(input.version).success) throw errors.validation();
    const initial = await ticketService.fileAccess(actor, input.ticketId, { write: true });
    if (initial.version !== input.version) throw errors.stale();
    const file = validateTicketFile(input);
    const storageKey = `tickets/${input.ticketId}/${randomUUID()}.${file.extension}`;
    const storage = this.storageResolver();
    try { await storage.put({ storageKey, bytes: input.bytes, contentType: file.contentType }); }
    catch { throw storageFailure(); }
    try {
      return await db.transaction(async (tx) => {
        const access = await ticketService.accessInTransaction(actor, tx, input.ticketId, { write: true, version: input.version });
        const [created] = await tx.insert(ticketFiles).values({ ticketId: input.ticketId, ownerUserId: access.actor.id, uploaderUserId: access.actor.id, fileName: file.displayFilename, contentType: file.contentType, byteSize: file.sizeBytes, storageKey }).returning();
        const version = await this.bumpTicket(tx, input.ticketId, access.version);
        await this.auditWriter(tx, { actor: access.actor, action: "ticket.file_created", targetType: "ticket", targetId: input.ticketId, metadata: { fileId: created.id, contentType: created.contentType, byteSize: created.byteSize, version } });
        await ticketService.notifyTicket(tx, access.ticket, access.actor, "ticket.file_created");
        return { file: fileView(created, access.actor.displayName, access), version };
      });
    } catch (error) {
      try { await storage.remove(storageKey); } catch { /* The uncommitted object remains inaccessible; no public key is issued. */ }
      throw error;
    }
  }

  /** Authorization remains locked through private storage delivery, including revoked grants. */
  async read(actor: AuthenticatedActor, ticketId: string, fileId: string) {
    if (!uuid.safeParse(ticketId).success || !uuid.safeParse(fileId).success) throw unavailable();
    return db.transaction(async (tx) => {
      await ticketService.accessInTransaction(actor, tx, ticketId);
      const [file] = await tx.select().from(ticketFiles).where(and(eq(ticketFiles.id, fileId), eq(ticketFiles.ticketId, ticketId), isNull(ticketFiles.archivedAt))).for("share");
      if (!file) throw unavailable();
      let bytes: Uint8Array | null;
      try { bytes = await this.storageResolver().read(file.storageKey); } catch { throw storageFailure(); }
      if (!bytes || bytes.byteLength !== file.byteSize) throw unavailable();
      return { bytes, headers: ticketFileHeaders(file) };
    });
  }

  async change(actor: AuthenticatedActor, input: unknown) {
    const parsed = commandSchema.safeParse(input);
    if (!parsed.success) throw errors.validation();
    const command = parsed.data;
    return db.transaction(async (tx) => {
      const access = await ticketService.accessInTransaction(actor, tx, command.ticketId, { write: true, version: command.version });
      const [file] = await tx.select().from(ticketFiles).where(and(eq(ticketFiles.id, command.fileId), eq(ticketFiles.ticketId, command.ticketId))).for("update");
      if (!file || (!access.canManage && file.uploaderUserId !== access.actor.id)) throw unavailable();
      if (file.version !== command.fileVersion) throw errors.stale();
      if ((command.action === "archive") === Boolean(file.archivedAt)) throw errors.stale();
      const [changed] = await tx.update(ticketFiles).set({ version: sql`${ticketFiles.version} + 1`, archivedAt: command.action === "archive" ? new Date() : null, archivedByUserId: command.action === "archive" ? access.actor.id : null }).where(and(eq(ticketFiles.id, file.id), eq(ticketFiles.version, command.fileVersion))).returning();
      if (!changed) throw errors.stale();
      const version = await this.bumpTicket(tx, command.ticketId, access.version);
      const eventType = command.action === "archive" ? "ticket.file_archived" : "ticket.file_restored";
      await this.auditWriter(tx, { actor: access.actor, action: eventType, targetType: "ticket", targetId: command.ticketId, metadata: { fileId: file.id, fileVersion: changed.version, version } });
      await ticketService.notifyTicket(tx, access.ticket, access.actor, eventType);
      const [uploader] = await tx.select({ displayName: users.displayName }).from(users).where(eq(users.id, changed.uploaderUserId));
      return { file: fileView(changed, uploader.displayName, access), version };
    });
  }
}

export const ticketFilesService = new TicketFilesService();
