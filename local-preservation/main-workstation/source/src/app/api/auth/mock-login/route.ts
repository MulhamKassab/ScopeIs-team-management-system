import { NextResponse } from "next/server";
import { beginMockSession, setSessionCookie } from "@/modules/auth/session-service";
import { errorResponse, requireSameOrigin } from "@/server/http";
import { errors } from "@/shared/errors/app-error";
import { mockPersonaSelectionSchema } from "@/shared/validation/foundation";
import { mockAuthenticationIsAllowed } from "@/server/env";

export async function POST(request: Request) {
  try {
    if (!mockAuthenticationIsAllowed()) return NextResponse.json({ message: "Not found." }, { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
    requireSameOrigin(request);
    const body = await request.json().catch(() => { throw errors.validation(); });
    const input = mockPersonaSelectionSchema.parse(body);
    const session = await beginMockSession(input.personaId);
    await setSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) { return errorResponse(error); }
}
