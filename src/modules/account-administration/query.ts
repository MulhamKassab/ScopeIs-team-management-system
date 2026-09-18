import { accountFilterSchema } from "./validation";
import type { AccountListFilter } from "./repositories";

export type AccountSearchParams = { query?: string; role?: string; status?: string; credentials?: string; page?: string };

export type ParsedAccountFilter = { valid: boolean; filter: AccountListFilter; raw: AccountSearchParams };

/**
 * Parses URL search parameters into a bounded filter. Invalid input falls back to the safe first page
 * rather than throwing, so a manipulated URL cannot produce an error page or an oversized query.
 */
export function parseAccountSearchParams(params: AccountSearchParams): ParsedAccountFilter {
  const result = accountFilterSchema.safeParse({
    query: params.query, role: params.role, status: params.status, credentials: params.credentials, page: params.page,
  });
  const raw: AccountSearchParams = {
    query: typeof params.query === "string" ? params.query : undefined,
    role: typeof params.role === "string" ? params.role : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    credentials: typeof params.credentials === "string" ? params.credentials : undefined,
    page: typeof params.page === "string" ? params.page : undefined,
  };
  if (!result.success) return { valid: false, filter: { page: 1 }, raw };
  return { valid: true, filter: result.data, raw };
}
