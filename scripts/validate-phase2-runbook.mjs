import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

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
process.stdout.write("Phase 2 runbook metadata matches the exact migration source files.\n");
