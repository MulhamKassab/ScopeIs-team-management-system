import { NextResponse } from "next/server";
import { requireCurrentActor } from "@/modules/auth/session-service";
import { ReportDomainError } from "@/modules/reporting/domain-error";
import { reportExportService } from "@/modules/reporting/export-service";
import { errorResponse } from "@/server/http";

export const dynamic = "force-dynamic";

/**
 * Streams a bounded, authorized CSV export.
 *
 * Authorization is re-resolved inside the export service, so a revoked scope, a demotion or a
 * deactivated account cannot produce a file even if the page was already open. An unknown, unauthorized
 * or out-of-scope report key returns the same neutral refusal.
 */
export async function GET(request: Request, context: { params: Promise<{ reportKey: string }> }) {
  try {
    const actor = await requireCurrentActor();
    const { reportKey } = await context.params;
    const url = new URL(request.url);
    const query = Object.fromEntries([...url.searchParams.entries()].filter(([, value]) => value !== ""));
    const payload = await reportExportService.generate(actor, reportKey, query);
    return new NextResponse(payload.body, { status: 200, headers: payload.headers });
  } catch (error) {
    if (error instanceof ReportDomainError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    return errorResponse(error);
  }
}
