import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { DashboardCards } from "@/modules/reporting/forms";
import { reportingService } from "@/modules/reporting/service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  // The dashboard branches on the current role and recomputes every card under the actor's current scope.
  const view = await reportingService.dashboard(actor);
  return <DashboardCards view={view} />;
}
