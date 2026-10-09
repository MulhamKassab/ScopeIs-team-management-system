import { env } from "@/server/env";
import { redirect } from "next/navigation";
import { getCurrentPasswordChangeActor, mustChangePassword } from "@/modules/auth/session-service";
import { LoginScreen } from "@/app/(auth)/login/login-screen";
import { workspaceHomeFor } from "@/modules/navigation/navigation";
export default async function LoginPage() {
  const actor = await getCurrentPasswordChangeActor();
  if (actor) redirect(await mustChangePassword(actor.id) ? "/account/change-password" : workspaceHomeFor(actor.role));
  return <LoginScreen demoWorkspace={env().SCOPEIS_DEMO_WORKSPACE === "true"} />;
}
