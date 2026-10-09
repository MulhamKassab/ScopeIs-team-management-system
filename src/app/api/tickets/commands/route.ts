import { requireSameOrigin } from "@/server/http";
import { ticketService } from "@/modules/tickets/service";
import { boundedTicketJson, ticketActor, ticketError, ticketJson } from "@/modules/tickets/http";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await ticketActor();
    const input = await boundedTicketJson(request);
    return ticketJson(await ticketService.command(actor, input));
  } catch (error) { return ticketError(error); }
}
