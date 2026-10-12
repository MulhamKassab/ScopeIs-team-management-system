import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { ticketService } from "@/modules/tickets/service";
import { ticketUploadLimitBytes } from "@/modules/tickets/files";
import { TicketDetailView } from "@/modules/tickets/ticket-detail";
import { AppError } from "@/shared/errors/app-error";

export const dynamic = "force-dynamic";
export default async function TicketPage({ params, searchParams }: { params: Promise<{ ticketId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const ticket = await ticketService.detail(actor, (await params).ticketId).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  const workspace = await ticketService.workspace(actor);
  const query = await searchParams;
  return <TicketDetailView initialData={ticket} workspace={workspace} actor={{ id: actor.id, displayName: actor.displayName, role: actor.role }} maxUploadBytes={ticketUploadLimitBytes()} initialReturnTo={typeof query.from === "string" ? query.from : undefined} />;
}
