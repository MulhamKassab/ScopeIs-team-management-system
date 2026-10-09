import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { workspaceHomeFor } from "@/modules/navigation/navigation";
export default async function Home() {
  const actor = await getCurrentActor();
  redirect(actor ? workspaceHomeFor(actor.role) : "/login");
}
