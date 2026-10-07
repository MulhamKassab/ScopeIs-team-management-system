import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { ReportDomainError } from "@/modules/reporting/domain-error";
import { ReportIndex } from "@/modules/reporting/forms";
import { reportingService } from "@/modules/reporting/service";

export const dynamic = "force-dynamic";

export default async function ReportsIndexPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "module:reports:view")) notFound();
  // Authorization and data loading happen before any JSX is constructed, so a domain refusal maps
  // cleanly to the non-enumerating 404 rather than being swallowed by the renderer.
  let index: Awaited<ReturnType<typeof reportingService.index>>;
  try {
    index = await reportingService.index(actor);
  } catch (error) {
    if (error instanceof ReportDomainError) notFound();
    throw error;
  }
  return <ReportIndex entries={index.entries} options={index.options} />;
}
