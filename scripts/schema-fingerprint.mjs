import { createHash } from "node:crypto";

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function fingerprintPublicSchema(client) {
  const enumResult = await client.query(`
      select t.typname as type_name, e.enumlabel as value, e.enumsortorder::int as position
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        join pg_enum e on e.enumtypid = t.oid
       where n.nspname = 'public'
       order by t.typname, e.enumsortorder`);
  const columnResult = await client.query(`
      select table_name, column_name, ordinal_position::int as position, data_type, udt_name,
             is_nullable, coalesce(column_default, '') as column_default
        from information_schema.columns
       where table_schema = 'public'
       order by table_name, ordinal_position`);
  const constraintResult = await client.query(`
      select c.conrelid::regclass::text as table_name, c.conname as constraint_name, c.contype as constraint_type,
             pg_get_constraintdef(c.oid, true) as definition
        from pg_constraint c
       where c.connamespace = (select oid from pg_namespace where nspname = 'public')
       order by c.conrelid::regclass::text, c.conname`);
  const indexResult = await client.query(`
      select tablename as table_name, indexname as index_name, indexdef as definition
        from pg_indexes
       where schemaname = 'public'
       order by tablename, indexname`);

  const sections = {
    enums: enumResult.rows,
    columns: columnResult.rows,
    constraints: constraintResult.rows,
    indexes: indexResult.rows,
  };
  const tables = [...new Set(columnResult.rows.map((row) => row.table_name))].sort();
  const tableHashes = Object.fromEntries(tables.map((table) => [table, hash({
    columns: sections.columns.filter((row) => row.table_name === table),
    constraints: sections.constraints.filter((row) => row.table_name === table),
    indexes: sections.indexes.filter((row) => row.table_name === table),
  })]));
  return {
    hash: hash(sections),
    sectionHashes: Object.fromEntries(Object.entries(sections).map(([name, rows]) => [name, hash(rows)])),
    tableHashes,
    tables,
    enumTypes: [...new Set(enumResult.rows.map((row) => row.type_name))].sort(),
    sections,
  };
}

export function compactFingerprint(fingerprint) {
  return {
    hash: fingerprint.hash,
    sectionHashes: fingerprint.sectionHashes,
    tableHashes: fingerprint.tableHashes,
    tables: fingerprint.tables,
    enumTypes: fingerprint.enumTypes,
  };
}
