"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentActor, setSessionCookie } from "@/modules/auth/session-service";
import { AccountAdminDomainError } from "./domain-error";
import { accountAdministrationService } from "./service";
import { accountErrorMessage } from "./messages";

export type AccountFormState = { formError?: string; success?: string; fieldErrors?: Record<string, string> };
export type AccountFormAction = (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;

function text(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value : ""; }
function bool(formData: FormData, key: string) { return text(formData, key) === "true" || text(formData, key) === "on"; }
function onlyContains(formData: FormData, allowed: string[]) {
  return [...formData.keys()].every((key) => allowed.includes(key) || key.startsWith("$ACTION_"));
}

export const createAccountAction: AccountFormAction = async (_state, formData) => {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!onlyContains(formData, ["displayName", "username", "loginEmail", "workEmail", "role", "password", "confirmPassword", "mustChangePassword", "workPhone", "professionalSummary", "superAdminConfirmed"])) {
    return { formError: "That submission included fields this form does not accept." };
  }
  try {
    await accountAdministrationService.createAccount(actor, {
      displayName: text(formData, "displayName"), username: text(formData, "username"), loginEmail: text(formData, "loginEmail"),
      workEmail: text(formData, "workEmail") || undefined, role: text(formData, "role") as "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN",
      password: text(formData, "password"), confirmPassword: text(formData, "confirmPassword"),
      mustChangePassword: bool(formData, "mustChangePassword"), workPhone: text(formData, "workPhone") || undefined,
      professionalSummary: text(formData, "professionalSummary") || undefined, superAdminConfirmed: bool(formData, "superAdminConfirmed"),
    });
  } catch (error) {
    return { formError: accountErrorMessage(error) };
  }
  revalidatePath("/accounts"); revalidatePath("/employees");
  // Never echo the password back; only a safe success message is returned.
  return { success: "Account created with a login. The temporary password was stored as a one-way hash." };
};

export const enableCredentialsAction: AccountFormAction = async (_state, formData) => {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!onlyContains(formData, ["userId", "username", "loginEmail", "password", "confirmPassword", "mustChangePassword"])) {
    return { formError: "That submission included fields this form does not accept." };
  }
  try {
    await accountAdministrationService.enableCredentials(actor, {
      userId: text(formData, "userId"), username: text(formData, "username"), loginEmail: text(formData, "loginEmail"),
      password: text(formData, "password"), confirmPassword: text(formData, "confirmPassword"), mustChangePassword: bool(formData, "mustChangePassword"),
    });
  } catch (error) {
    if (error instanceof AccountAdminDomainError && error.code === "CREDENTIAL_EXISTS") return { formError: accountErrorMessage(error) };
    return { formError: accountErrorMessage(error) };
  }
  revalidatePath("/accounts");
  return { success: "Sign-in enabled. The temporary password was stored as a one-way hash." };
};

export const resetPasswordAction: AccountFormAction = async (_state, formData) => {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!onlyContains(formData, ["userId", "expectedVersion", "password", "confirmPassword", "mustChangePassword", "confirmRevoke", "currentPassword", "highRiskConfirmed"])) {
    return { formError: "That submission included fields this form does not accept." };
  }
  try {
    await accountAdministrationService.resetPassword(actor, {
      userId: text(formData, "userId"), expectedVersion: Number(text(formData, "expectedVersion")),
      password: text(formData, "password"), confirmPassword: text(formData, "confirmPassword"),
      mustChangePassword: bool(formData, "mustChangePassword"), confirmRevoke: bool(formData, "confirmRevoke"),
      currentPassword: text(formData, "currentPassword") || undefined, highRiskConfirmed: bool(formData, "highRiskConfirmed"),
    });
  } catch (error) {
    return { formError: accountErrorMessage(error) };
  }
  revalidatePath("/accounts");
  return { success: "Password reset completed. Existing sessions were revoked." };
};

export const changeOwnPasswordAction: AccountFormAction = async (_state, formData) => {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!onlyContains(formData, ["currentPassword", "newPassword", "confirmPassword"])) {
    return { formError: "That submission included fields this form does not accept." };
  }
  let session;
  try {
    session = await accountAdministrationService.changeOwnPassword(actor, {
      currentPassword: text(formData, "currentPassword"), newPassword: text(formData, "newPassword"), confirmPassword: text(formData, "confirmPassword"),
    });
  } catch (error) {
    return { formError: accountErrorMessage(error) };
  }
  await setSessionCookie(session.token, session.expiresAt);
  revalidatePath("/dashboard");
  redirect("/dashboard");
};
