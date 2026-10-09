import { NextResponse } from "next/server";
import { getCurrentActor } from "@/modules/auth/session-service";
import { parseTicketUpload, ticketFilesService } from "@/modules/tickets/files";
import { ticketService } from "@/modules/tickets/service";
import { ticketError } from "@/modules/tickets/http";
import { requireSameOrigin } from "@/server/http";
import { errors } from "@/shared/errors/app-error";

export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const actor = await getCurrentActor();
    if (!actor) throw errors.unauthenticated();
    const { ticketId } = await params;
    const result = await ticketFilesService.list(actor, ticketId, { includeArchived: new URL(request.url).searchParams.get("archived") === "true" });
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) { return ticketError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    requireSameOrigin(request);
    const actor = await getCurrentActor();
    if (!actor) throw errors.unauthenticated();
    const { ticketId } = await params;
    // Refuse inaccessible tickets before reading a potentially large body.
    await ticketService.fileAccess(actor, ticketId, { write: true });
    const upload = await parseTicketUpload(request);
    const result = await ticketFilesService.attach(actor, { ticketId, ...upload });
    return NextResponse.json({ ok: true, ...result }, { status: 201, headers: privateHeaders });
  } catch (error) { return ticketError(error); }
}
