import type { ScopeGrant, SystemRole } from "@/shared/types/foundation";

export type MockPersonaFixture = {
  id: string;
  displayName: string;
  role: SystemRole;
  scopeDescription: string;
  scopes: ScopeGrant[];
};

export const mockPersonas: MockPersonaFixture[] = [
  { id: "mock-super-admin-nora", displayName: "Nora Albright", role: "SUPER_ADMIN", scopeDescription: "Global foundation access", scopes: [] },
  { id: "mock-admin-ava", displayName: "Ava Mercer", role: "ADMIN", scopeDescription: "Mock Team Alpha scope", scopes: [{ type: "TEAM", reference: "team:alpha" }] },
  { id: "mock-admin-ben", displayName: "Ben Iqbal", role: "ADMIN", scopeDescription: "Mock Team Bravo scope", scopes: [{ type: "TEAM", reference: "team:bravo" }] },
  { id: "mock-employee-cora", displayName: "Cora Bell", role: "EMPLOYEE", scopeDescription: "Mock Team Alpha association", scopes: [{ type: "TEAM", reference: "team:alpha" }] },
  { id: "mock-employee-dan", displayName: "Dan Rowan", role: "EMPLOYEE", scopeDescription: "Mock Team Bravo association", scopes: [{ type: "TEAM", reference: "team:bravo" }] },
];

export function isMockPersonaId(personaId: string) {
  return mockPersonas.some((persona) => persona.id === personaId);
}
