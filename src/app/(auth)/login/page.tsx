import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { LoginScreen } from "@/app/(auth)/login/login-screen";
export default async function LoginPage() { if (await getCurrentActor()) redirect("/dashboard"); return <LoginScreen />; }
