import { NextResponse } from "next/server";
import { getCurrentActor } from "@/modules/auth/session-service";
import { evidenceErrorResponse } from "@/modules/evidence/http";
import { evidenceService } from "@/modules/evidence/service";

/** Authorized private delivery resolved by database file id, never by a client-supplied object path. */
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED", message: "Please sign in to continue." }, { status: 401 });
    const { fileId } = await params;
    const file = await evidenceService.readFile(actor, fileId);
    // Copy into a plain ArrayBuffer so the response body is an unambiguous, non-shared buffer.
    const body = new ArrayBuffer(file.bytes.byteLength);
    new Uint8Array(body).set(file.bytes);
    return new NextResponse(body, { status: 200, headers: file.headers });
  } catch (error) { return evidenceErrorResponse(error); }
}
