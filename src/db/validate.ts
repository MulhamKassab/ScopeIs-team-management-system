import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

async function validate() {
  await db.execute(sql`select 1`);
  const result = await db.execute(sql`select count(*)::int as count from users`);
  process.stdout.write(`Database connection validated; mock users: ${String(result.rows[0]?.count ?? 0)}.\n`);
}

validate().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
