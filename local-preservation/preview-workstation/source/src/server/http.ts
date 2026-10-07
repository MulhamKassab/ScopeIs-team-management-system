import { NextResponse } from "next/server";
import { AppError } from "@/shared/errors/app-error";

export function errorResponse(error: unknown) {
  if (error instanceof AppError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  return NextResponse.json({ error: "DATABASE_FAILURE", message: "A safe operation could not be completed." }, { status: 500 });
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) throw new AppError("FORBIDDEN", "This request origin is not allowed.", 403);
}
