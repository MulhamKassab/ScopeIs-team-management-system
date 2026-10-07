"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth/session-service";
import { EmployeeDomainError } from "@/modules/employees/domain-error";
import { employeeProfileService } from "@/modules/employees/employee-services";
import { createEmployeeSchema } from "@/modules/employees/employee-validation";

type CreateEmployeeField = "displayName" | "workEmail" | "workPhone" | "professionalSummary";

export type CreateEmployeeFormState = {
  fieldErrors?: Partial<Record<CreateEmployeeField, string>>;
  formError?: string;
};
export type CreateEmployeeFormAction = (state: CreateEmployeeFormState, formData: FormData) => Promise<CreateEmployeeFormState>;

function formText(formData: FormData, key: CreateEmployeeField) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function containsOnlyCreateFields(formData: FormData) {
  return [...formData.keys()].every((key) => ["displayName", "workEmail", "workPhone", "professionalSummary"].includes(key) || key.startsWith("$ACTION_"));
}

function validationErrors(input: unknown): CreateEmployeeFormState | null {
  const parsed = createEmployeeSchema.safeParse(input);
  if (parsed.success) return null;
  const fieldErrors = parsed.error.flatten().fieldErrors;
  return {
    fieldErrors: {
      displayName: fieldErrors.displayName?.[0],
      workEmail: fieldErrors.workEmail?.[0], workPhone: fieldErrors.workPhone?.[0],
      professionalSummary: fieldErrors.professionalSummary?.[0],
    },
  };
}

/** Server-side entry point; it repeats authentication, authorization, and validation for direct POSTs. */
export const createEmployeeAction: CreateEmployeeFormAction = async (_previousState, formData) => {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!containsOnlyCreateFields(formData)) return { formError: "Employee codes and management fields are generated or assigned only on the server." };

  const input = {
    displayName: formText(formData, "displayName"),
    workEmail: formText(formData, "workEmail"), workPhone: formText(formData, "workPhone"),
    professionalSummary: formText(formData, "professionalSummary"),
  };
  const errors = validationErrors(input);
  if (errors) return errors;

  try {
    await employeeProfileService.createEmployee(actor, input);
  } catch (error) {
    if (error instanceof EmployeeDomainError) {
      if (error.code === "EMPLOYEE_CODE_CAPACITY") return { formError: "The temporary four-digit employee-code range is full." };
      if (error.code === "FORBIDDEN") return { formError: "You are not authorized to create employee records." };
      if (error.code === "VALIDATION_ERROR") return { formError: "Please correct the highlighted information and try again." };
    }
    return { formError: "The employee record could not be created. Please try again." };
  }

  revalidatePath("/employees");
  redirect("/employees");
};
