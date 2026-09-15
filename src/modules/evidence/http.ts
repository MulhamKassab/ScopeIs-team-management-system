import { NextResponse } from "next/server";
import { EvidenceDomainError } from "@/modules/evidence/domain-error";
import { errorResponse } from "@/server/http";

/**
 * Routes map evidence domain outcomes to status codes without echoing sensitive detail. Anything that
 * is not an evidence domain error (for example a rejected request origin) falls back to the shared
 * mapper so framework-level failures keep their correct status instead of becoming a generic 500.
 */
export function evidenceErrorResponse(error: unknown) {
  if (error instanceof EvidenceDomainError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  return errorResponse(error);
}
