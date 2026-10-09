import "server-only";
import { NextResponse } from "next/server";
import { getCurrentActor } from "@/modules/auth/session-service";
import { AppError, errors } from "@/shared/errors/app-error";
import { errorResponse } from "@/server/http";

export async function ticketActor() {
  const actor = await getCurrentActor();
  if (!actor) throw errors.unauthenticated();
  return actor;
}

export function ticketJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: {
    "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff",
  } });
}

export function ticketError(error: unknown) {
  const response = errorResponse(error);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export async function boundedTicketJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new AppError("VALIDATION", "Send a JSON request.", 400);
  }
  const reader = request.body?.getReader();
  if (!reader) throw errors.validation();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 65_536) { await reader.cancel(); throw errors.validation(); }
      chunks.push(next.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch { throw errors.validation(); }
}
