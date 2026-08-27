import type { AuthenticatedActor } from "@/shared/types/foundation";

export interface AuthenticationProvider {
  readonly mode: "mock";
  beginSession(personaId: string): Promise<{ token: string; actor: AuthenticatedActor }>;
  endSession(token: string): Promise<void>;
}

/** Future identity providers must fulfil this contract without changing authorization. */
export type FutureAuthenticationProvider = { readonly mode: "microsoft" | "google" | "company" };
