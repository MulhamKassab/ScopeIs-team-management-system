import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/shared/errors/app-error";

export function errorResponse(error: unknown) {
  if (error instanceof AppError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "VALIDATION", message: "Please check the submitted information." }, { status: 400 });
  return NextResponse.json({ error: "DATABASE_FAILURE", message: "A safe operation could not be completed." }, { status: 500 });
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  let safe = false;
  try {
    const source = origin ? new URL(origin) : null;
    const target = new URL(request.url);
    // Next can reconstruct an internal URL with a different hostname. Host is the browser's authority.
    const host = request.headers.get("host") ?? target.host;
    safe = source !== null && origin === source.origin && source.host === host && source.protocol === target.protocol;
  } catch { /* Invalid origins fail closed. */ }
  if (!safe) throw new AppError("FORBIDDEN", "This request origin is not allowed.", 403);
}
