import { NextResponse } from "next/server";
import { getCurrentActor } from "@/modules/auth/session-service";
import { evidenceErrorResponse } from "@/modules/evidence/http";
import { evidenceService } from "@/modules/evidence/service";
import { evidenceDeliveryRange } from "@/modules/evidence/delivery";
import { evidenceUploadLimitBytes } from "@/modules/evidence/file-limits";

/** Authorized private delivery resolved by database file id, never by a client-supplied object path. */
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const actor = await getCurrentActor();
    if (!actor) return NextResponse.json({ error: "UNAUTHENTICATED", message: "Please sign in to continue." }, { status: 401 });
    const { fileId } = await params;
    const file = await evidenceService.readFile(actor, fileId);
    const range = evidenceDeliveryRange(request.headers.get("range"), file.bytes.byteLength);
    if (range === false) return new NextResponse(null, { status: 416, headers: { ...file.headers, "Content-Length": "0", "Content-Range": `bytes */${file.bytes.byteLength}`, "Accept-Ranges": "bytes" } });
    if (!range && file.bytes.byteLength > evidenceUploadLimitBytes()) return NextResponse.json({ error: "RANGE_REQUIRED", message: "Use Download file in the application to retrieve this retained file." }, { status: 413, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    const selected = range ? file.bytes.subarray(range.start, range.end + 1) : file.bytes;
    // Copy into a plain ArrayBuffer so the response body is an unambiguous, non-shared buffer.
    const body = new ArrayBuffer(selected.byteLength);
    new Uint8Array(body).set(selected);
    return new NextResponse(body, { status: range ? 206 : 200, headers: { ...file.headers, "Content-Length": String(selected.byteLength), "Accept-Ranges": "bytes", ...(range ? { "Content-Range": `bytes ${range.start}-${range.end}/${file.bytes.byteLength}` } : {}) } });
  } catch (error) { return evidenceErrorResponse(error); }
}
