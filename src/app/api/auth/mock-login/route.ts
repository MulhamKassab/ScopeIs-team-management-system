import { NextResponse } from "next/server";
import { beginMockSession, setSessionCookie } from "@/modules/auth/session-service";
import { errorResponse, requireSameOrigin } from "@/server/http";
import { errors } from "@/shared/errors/app-error";
import { mockPersonaSelectionSchema } from "@/shared/validation/foundation";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await request.json().catch(() => { throw errors.validation(); });
    const input = mockPersonaSelectionSchema.parse(body);
    const session = await beginMockSession(input.personaId);
    await setSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) { return errorResponse(error); }
}
