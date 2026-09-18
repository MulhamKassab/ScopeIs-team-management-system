import { redirect } from "next/navigation";
import { getCurrentActor, mustChangePassword } from "@/modules/auth/session-service";
import { navigationFor } from "@/modules/navigation/navigation";
import { ApplicationShell } from "@/shared/components/shell";

export const dynamic = "force-dynamic";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  // A user holding only a temporary password must change it before entering the application.
  if (await mustChangePassword(actor.id)) redirect("/account/change-password");
  return <ApplicationShell actor={actor} navigation={navigationFor(actor)} title="Team Management">{children}</ApplicationShell>;
}
