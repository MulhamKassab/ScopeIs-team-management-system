import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { ticketService } from "@/modules/tickets/service";
import { TicketWorkspaceView } from "@/modules/tickets/workspace";

export const dynamic = "force-dynamic";
export default async function TicketsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const query = await searchParams;
  return <TicketWorkspaceView initialData={await ticketService.workspace(actor)} actor={{ id: actor.id, displayName: actor.displayName, role: actor.role }}
    initialQuery={Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string"))} />;
}
