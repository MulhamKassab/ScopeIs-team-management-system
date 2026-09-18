import { NextResponse } from "next/server";
import { beginPasswordSession } from "@/modules/auth/credential-service";
import { setSessionCookie } from "@/modules/auth/session-service";
import { errorResponse, requireSameOrigin } from "@/server/http";
import { errors } from "@/shared/errors/app-error";

async function boundedJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw errors.validation();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4096) { await reader.cancel(); throw errors.validation(); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { throw errors.validation(); }
}

export async function POST(request: Request) {
  let response: NextResponse;
  try {
    requireSameOrigin(request);
    const session = await beginPasswordSession(await boundedJson(request));
    await setSessionCookie(session.token, session.expiresAt);
    response = NextResponse.json({ redirectTo: "/dashboard" });
  } catch (error) { response = errorResponse(error); }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
