import { NextResponse } from "next/server";
import { requireCapability } from "@/modules/authorization/authorization-service";
import { requireCurrentActor } from "@/modules/auth/session-service";
import { errorResponse } from "@/server/http";
import { scopeReferenceSchema } from "@/shared/validation/foundation";

/** Development/test-only authorization seam; it exposes no business data and fails closed in production. */
export async function GET(_request: Request, context: { params: Promise<{ scopeRef: string }> }) {
  try {
    if (process.env.APP_ENV === "production") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const { scopeRef } = scopeReferenceSchema.parse(await context.params);
    const [kind] = scopeRef.split(":");
    const actor = await requireCurrentActor();
    requireCapability(actor, "foundation:scope_probe:view", { type: kind.toUpperCase() as "TEAM" | "CLIENT" | "PROJECT" | "LOCATION", reference: scopeRef });
    return NextResponse.json({ scope: scopeRef, result: "authorized foundation test seam" });
  } catch (error) { return errorResponse(error); }
}
