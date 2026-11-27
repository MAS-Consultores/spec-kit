/**
 * Markdown table for the pull request body.
 *   node scripts/lint-pr-summary.mjs
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function summaryTable(records) {
  const rules = {};
  const files = {};
  for (const record of records) {
    if (record.gate !== "lint" && record.gate !== "lint-fast") continue;
    for (const [rule, count] of Object.entries(record.byRule ?? {})) rules[rule] = (rules[rule] ?? 0) + count;
    for (const [file, count] of Object.entries(record.byFile ?? {})) files[file] = (files[file] ?? 0) + count;
  }
  const ruleRows = Object.entries(rules).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const fileRows = Object.entries(files).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const lines = ["## Lint", "", "| Regla | Hallazgos |", "| --- | --- |"];
  lines.push(...(ruleRows.length ? ruleRows.map(([rule, count]) => `| ${rule} | ${count} |`) : ["| — | 0 |"]));
  lines.push("", "| Archivo | Hallazgos |", "| --- | --- |");
  lines.push(...(fileRows.length ? fileRows.map(([file, count]) => `| ${file} | ${count} |`) : ["| — | 0 |"]));
  lines.push("");
  return lines.join("\n");
}

function readRecords(root) {
  const paths = [join(root, "docs/metrics/runs.jsonl"), join(root, ".specify/telemetry/runs.jsonl")];
  for (const path of paths) {
    try {
      return readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
    } catch {
      // try the next store
    }
  }
  return [];
}

const summaryInvoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (summaryInvoked && process.argv.includes("--self-test")) {
  const table = summaryTable([
    { gate: "lint", byRule: { "max-lines": 2 }, byFile: { "apps/api/src/pay.ts": 2 } },
    { gate: "typecheck", byRule: { "other": 9 }, byFile: { "skip.ts": 9 } },
  ]);
  if (!table.includes("| max-lines | 2 |") || !table.includes("pay.ts") || table.includes("skip.ts")) {
    console.error(table);
    process.exit(1);
  }
  console.log("lint-pr-summary self-test ok");
} else if (summaryInvoked) {
  process.stdout.write(summaryTable(readRecords(process.cwd())));
}
