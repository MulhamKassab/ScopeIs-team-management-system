export const systemRoles = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] as const;
export type SystemRole = (typeof systemRoles)[number];

export const scopeTypes = ["TEAM", "CLIENT", "PROJECT", "LOCATION"] as const;
export type ScopeType = (typeof scopeTypes)[number];

export type ScopeGrant = { type: ScopeType; reference: string };

export type AuthenticatedActor = {
  id: string;
  displayName: string;
  role: SystemRole;
  sessionId: string;
  sessionVersion: number;
  scopes: ScopeGrant[];
  authenticationMode: "mock";
};

export type Direction = "ltr" | "rtl";
