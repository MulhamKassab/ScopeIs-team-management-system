import type { AuthenticatedActor } from "@/shared/types/foundation";

export type EmployeeActor = AuthenticatedActor;

export type PaginationInput = { page?: number; pageSize?: number; query?: string; includeArchived?: boolean };
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
export type EmployeeDirectoryQuery = { query?: string; designationId?: string; team?: string; active?: boolean };
export type EmployeeDirectorySearchFilters = { query?: string; designationId?: string; team?: string; status?: "active" | "inactive" };
export type EmployeeDirectoryFilterOptions = { teams: string[]; designations: { id: string; name: string }[] };

export type CatalogueCreateInput = { name: string; sortOrder?: number };
export type CatalogueUpdateInput = { name?: string; sortOrder?: number; expectedVersion: number };
export type SkillCreateInput = { name: string };
export type SkillUpdateInput = { name?: string; expectedVersion: number };
export type ArrangementLabelCreateInput = CatalogueCreateInput & { color: string };
export type ArrangementLabelUpdateInput = CatalogueUpdateInput & { color?: string };

export type CreateEmployeeProfileInput = {
  userId: string;
  employeeCode: string;
  workEmail?: string | null;
  workPhone?: string | null;
  professionalSummary?: string | null;
  designationId?: string | null;
  team?: string | null;
  managerUserId?: string | null;
  defaultWorkLocation?: string | null;
};

export type ManagementProfileUpdateInput = Omit<Partial<CreateEmployeeProfileInput>, "userId"> & { expectedVersion: number };
export type SelfProfileUpdateInput = Pick<ManagementProfileUpdateInput, "workEmail" | "workPhone" | "professionalSummary"> & { expectedVersion: number };

export type EmployeeSkillCreateInput = {
  employeeUserId: string;
  skillId: string;
  proficiencyDescription?: string | null;
  experienceDescription?: string | null;
  notes?: string | null;
  coverageEligible?: boolean | null;
  verified?: boolean;
};
export type EmployeeSkillUpdateInput = Omit<Partial<EmployeeSkillCreateInput>, "employeeUserId" | "skillId"> & { expectedVersion: number };

export type AuditChangeMetadata = { fields?: string[]; version?: number; active?: boolean; archive?: boolean; order?: number };
