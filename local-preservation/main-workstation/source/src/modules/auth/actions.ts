"use server";

import { redirect } from "next/navigation";
import { endCurrentSession } from "./session-service";

/** Available even while a temporary-password session cannot enter the application. */
export async function logOutAction() {
  await endCurrentSession();
  redirect("/login");
}
