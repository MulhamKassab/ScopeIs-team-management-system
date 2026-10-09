import { ticketService } from "@/modules/tickets/service";
import { ticketActor, ticketError, ticketJson } from "@/modules/tickets/http";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try { return ticketJson({ ticket: await ticketService.detail(await ticketActor(), (await params).ticketId) }); }
  catch (error) { return ticketError(error); }
}
