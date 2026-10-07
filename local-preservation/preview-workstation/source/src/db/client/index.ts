import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { env } from "@/server/env";

const globalForDatabase = globalThis as unknown as { scopeisPool?: Pool };
const pool = globalForDatabase.scopeisPool ?? new Pool({ connectionString: env().DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDatabase.scopeisPool = pool;

export const db = drizzle({ client: pool, schema });
