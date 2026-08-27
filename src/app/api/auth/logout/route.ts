import { NextResponse } from "next/server";
import { endCurrentSession } from "@/modules/auth/session-service";
import { errorResponse, requireSameOrigin } from "@/server/http";

export async function POST(request: Request) {
  try { requireSameOrigin(request); await endCurrentSession(); return NextResponse.json({ ok: true }); }
  catch (error) { return errorResponse(error); }
}
