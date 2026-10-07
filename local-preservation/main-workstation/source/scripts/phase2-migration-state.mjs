import { publicMigrationResult, reconcileMigrationState } from "./phase2-migration-core.mjs";

const [command = "inspect", ...flags] = process.argv.slice(2);
if (!new Set(["inspect", "reconcile", "validate"]).has(command)) throw new Error("Expected inspect, reconcile, or validate.");
const connectionString = process.env.SCOPEIS_MIGRATION_DATABASE_URL;
if (!connectionString) throw new Error("SCOPEIS_MIGRATION_DATABASE_URL must be supplied explicitly; environment files are never loaded by this tool.");
const apply = flags.includes("--apply");
const allowDisposableTest = flags.includes("--allow-disposable-test");
const backupConfirmed = flags.includes("--backup-confirmed");
if (command === "inspect" && apply) throw new Error("Inspect is read-only and does not accept --apply.");
if (command === "validate" && apply) throw new Error("Validate is read-only and does not accept --apply.");

const result = await reconcileMigrationState(connectionString, {
  apply: command === "reconcile" && apply,
  allowDisposableTest,
  backupConfirmed,
});
const output = publicMigrationResult(result);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

if (result.refused || result.before.state === "E") process.exitCode = 2;
if (command === "validate") {
  if (result.before.state !== "D" || result.before.pending.length !== 0) process.exitCode = 3;
}
