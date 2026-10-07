import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
export default async function Home() { redirect((await getCurrentActor()) ? "/dashboard" : "/login"); }
