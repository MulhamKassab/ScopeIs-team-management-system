import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { can } from "@/modules/authorization/authorization-service";
import { ReportDomainError } from "@/modules/reporting/domain-error";
import { ReportView as ReportViewPanel } from "@/modules/reporting/forms";
import { reportingService } from "@/modules/reporting/service";

export const dynamic = "force-dynamic";

const pick = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function ReportPage({ params, searchParams }: { params: Promise<{ reportKey: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "module:reports:view")) notFound();
  const { reportKey } = await params;
  const raw = await searchParams;
  const query = {
    from: pick(raw.from), to: pick(raw.to), month: pick(raw.month), page: pick(raw.page), date: pick(raw.date),
    start: pick(raw.start), end: pick(raw.end), clientId: pick(raw.clientId), projectId: pick(raw.projectId),
    locationId: pick(raw.locationId), skillId: pick(raw.skillId), action: pick(raw.action), targetType: pick(raw.targetType), actorUserId: pick(raw.actorUserId),
  };
  // Data loading happens before any JSX is constructed, so a domain refusal maps cleanly to the
  // non-enumerating 404 instead of being swallowed by the renderer.
  let loaded: { view: Awaited<ReturnType<typeof reportingService.report>>; index: Awaited<ReturnType<typeof reportingService.index>> };
  try {
    const [view, index] = await Promise.all([reportingService.report(actor, reportKey, query), reportingService.index(actor)]);
    loaded = { view, index };
  } catch (error) {
    if (error instanceof ReportDomainError) notFound();
    throw error;
  }
  return <ReportViewPanel view={loaded.view} filters={loaded.index.options} />;
}
