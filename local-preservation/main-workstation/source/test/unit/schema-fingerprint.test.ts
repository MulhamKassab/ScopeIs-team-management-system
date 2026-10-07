import { describe, expect, it } from "vitest";
import { fingerprintPublicSchema } from "../../scripts/schema-fingerprint.mjs";

const primaryKey = { table_name: "users", constraint_name: "users_pkey", constraint_type: "p",
  definition: "PRIMARY KEY (id)", validated: true, enforced: true };
const notNull = { table_name: "users", constraint_name: "users_id_not_null", constraint_type: "n",
  definition: "NOT NULL id", validated: true, enforced: true };

function client(constraints = [primaryKey], nullable = "NO") {
  return { query: async (sql: string) => ({ rows: sql.includes("pg_constraint") ? constraints
    : sql.includes("information_schema.columns") ? [{ table_name: "users", column_name: "id",
      position: 1, data_type: "text", udt_name: "text", is_nullable: nullable, column_default: "" }]
    : [] }) };
}

describe("schema fingerprint across PostgreSQL versions", () => {
  it("matches PostgreSQL 17 when PostgreSQL 18 adds validated NOT NULL catalog rows", async () => {
    const before = await fingerprintPublicSchema(client());
    const after = await fingerprintPublicSchema(client([primaryKey, notNull]));
    expect(after.hash).toBe(before.hash);
    expect(after.tableHashes).toEqual(before.tableHashes);
  });

  it("still detects a column becoming nullable", async () => {
    const before = await fingerprintPublicSchema(client([primaryKey, notNull]));
    const after = await fingerprintPublicSchema(client([primaryKey], "YES"));
    expect(after.hash).not.toBe(before.hash);
    expect(after.sectionHashes.columns).not.toBe(before.sectionHashes.columns);
  });

  it.each([{ validated: false }, { enforced: false }])("retains unusual NOT NULL constraints as drift: %j", async (change) => {
    const before = await fingerprintPublicSchema(client());
    const after = await fingerprintPublicSchema(client([primaryKey, { ...notNull, ...change }]));
    expect(after.hash).not.toBe(before.hash);
    expect(after.sections.constraints).toHaveLength(2);
  });

  it("still detects changed primary-key constraints", async () => {
    const before = await fingerprintPublicSchema(client());
    const after = await fingerprintPublicSchema(client([{ ...primaryKey, definition: "PRIMARY KEY (other_id)" }]));
    expect(after.sectionHashes.constraints).not.toBe(before.sectionHashes.constraints);
  });
});
