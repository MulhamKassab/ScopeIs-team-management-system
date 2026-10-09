import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { ticketService } from "@/modules/tickets/service";
import { ticketUploadLimitBytes } from "@/modules/tickets/files";
import { TicketDetailView } from "@/modules/tickets/ticket-detail";
import { AppError } from "@/shared/errors/app-error";

export const dynamic = "force-dynamic";
export default async function TicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const ticket = await ticketService.detail(actor, (await params).ticketId).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  const workspace = await ticketService.workspace(actor);
  return <TicketDetailView initialData={ticket} workspace={workspace} actor={{ id: actor.id, displayName: actor.displayName, role: actor.role }} maxUploadBytes={ticketUploadLimitBytes()} />;
}
