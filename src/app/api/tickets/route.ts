import { ticketService } from "@/modules/tickets/service";
import { ticketActor, ticketError, ticketJson } from "@/modules/tickets/http";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return ticketJson(await ticketService.workspace(await ticketActor())); }
  catch (error) { return ticketError(error); }
}
