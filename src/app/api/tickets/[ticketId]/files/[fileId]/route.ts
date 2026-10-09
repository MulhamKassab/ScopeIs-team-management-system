import { NextResponse } from "next/server";
import { getCurrentActor } from "@/modules/auth/session-service";
import { readBoundedTicketBody, ticketFilesService } from "@/modules/tickets/files";
import { ticketError } from "@/modules/tickets/http";
import { requireSameOrigin } from "@/server/http";
import { errors } from "@/shared/errors/app-error";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

export async function GET(_request: Request, { params }: { params: Promise<{ ticketId: string; fileId: string }> }) {
  try {
    const actor = await getCurrentActor();
    if (!actor) throw errors.unauthenticated();
    const { ticketId, fileId } = await params;
    const file = await ticketFilesService.read(actor, ticketId, fileId);
    const body = new ArrayBuffer(file.bytes.byteLength);
    new Uint8Array(body).set(file.bytes);
    return new NextResponse(body, { headers: file.headers });
  } catch (error) { return ticketError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string; fileId: string }> }) {
  try {
    requireSameOrigin(request);
    const actor = await getCurrentActor();
    if (!actor) throw errors.unauthenticated();
    const { ticketId, fileId } = await params;
    let command: Record<string, unknown>;
    try { command = JSON.parse(new TextDecoder().decode(await readBoundedTicketBody(request, 4096))); }
    catch { throw errors.validation(); }
    if (!command || typeof command !== "object" || Array.isArray(command) || "ticketId" in command || "fileId" in command) throw errors.validation();
    const result = await ticketFilesService.change(actor, { ...command, ticketId, fileId });
    return NextResponse.json({ ok: true, ...result }, { headers: privateHeaders });
  } catch (error) { return ticketError(error); }
}
