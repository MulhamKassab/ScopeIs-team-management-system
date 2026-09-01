import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { validateRepositoryMigrationHistory } from "./phase2-migration-core.mjs";

const runbook = readFileSync("DOCX/phase-reports/PHASE_2_PRODUCTION_MIGRATION_RUNBOOK.md", "utf8");
const files = ["src/db/migrations/0000_phase_1_foundation.sql", "src/db/migrations/0001_phase_2_employee_capabilities.sql"];
for (const file of files) {
  const data = readFileSync(file);
  const lineCount = data.toString("utf8").split("\n").length - 1;
  const hash = createHash("sha256").update(data).digest("hex");
  const marker = `| \`${file}\` | ${lineCount} | ${statSync(file).size} | \`${hash}\` |`;
  if (!runbook.includes(marker)) throw new Error(`Runbook metadata is stale for ${file}`);
}
if (runbook.includes("## Reviewed SQL")) throw new Error("Runbook must not duplicate reviewed migration SQL.");
for (const required of ["State A", "State B", "State C", "State D", "State E", "--backup-confirmed", "dry-run by default", "Do not manually execute raw migration SQL"]) {
  if (!runbook.includes(required)) throw new Error(`Runbook is missing required safety text: ${required}`);
}
await validateRepositoryMigrationHistory();
process.stdout.write("Phase 2 runbook and immutable migration metadata are consistent.\n");
