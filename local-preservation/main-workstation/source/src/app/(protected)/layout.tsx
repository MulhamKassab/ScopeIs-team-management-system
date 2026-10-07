import { env } from "@/server/env";
import { redirect } from "next/navigation";
import { getCurrentPasswordChangeActor, mustChangePassword } from "@/modules/auth/session-service";
import { navigationFor } from "@/modules/navigation/navigation";
import { PageJourneyHelp } from "@/shared/components/page-journey";
import { ApplicationShell } from "@/shared/components/shell";

export const dynamic = "force-dynamic";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentPasswordChangeActor();
  if (!actor) redirect("/login");
  // A user holding only a temporary password must change it before entering the application.
  if (await mustChangePassword(actor.id)) redirect("/account/change-password");
  const navigation = navigationFor(actor);
  return <ApplicationShell actor={actor} navigation={navigation} title="Team Management">{env().SCOPEIS_DEMO_WORKSPACE === "true" && <p className="demo-workspace-banner"><strong>Demo workspace</strong><span>Fictional company data · Changes are saved</span></p>}<PageJourneyHelp navigation={navigation} role={actor.role} />{children}</ApplicationShell>;
}
