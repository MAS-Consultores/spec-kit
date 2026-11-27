/**
 * Lee la tendencia desde la rama metrics (git fetch origin metrics).
 * No escribe docs/metrics/runs.jsonl en la rama de trabajo.
 *
 *   node scripts/harness-metrics.mjs
 *   node scripts/harness-metrics.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeLines, readLines } from "./harness-collect.mjs";
import { renderHarness } from "./harness-report.mjs";

export function recordsFrom(lines) {
  const records = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {
      /* una línea rota no tapa el resto */
    }
  }
  return records;
}

export function trendFrom(branchText, localLines) {
  const branchLines = branchText.split("\n").map((line) => line.trim()).filter(Boolean);
  const lines = mergeLines(branchLines, localLines);
  return renderHarness(recordsFrom(lines));
}

function showMetrics(root) {
  try {
    execFileSync("git", ["fetch", "origin", "metrics"], { cwd: root, stdio: "ignore" });
  } catch {
    return "";
  }
  try {
    return execFileSync("git", ["show", "origin/metrics:docs/metrics/runs.jsonl"], { cwd: root, encoding: "utf8" });
  } catch {
    return "";
  }
}

function selfTest() {
  const markdown = trendFrom(
    '{"gate":"lint","byRule":{"max-lines":2},"at":"2026-11-02T00:00:00Z","feature":"nomina","ok":true,"phase":"ci","round":1,"durationMs":1}\n',
    ['{"gate":"lint","byRule":{"complexity":1},"at":"2026-11-09T00:00:00Z","feature":"nomina","ok":true,"phase":"local","round":1,"durationMs":1}'],
  );
  if (!markdown.includes("| max-lines | 2 |") || !markdown.includes("| complexity | 1 |") || !markdown.includes("2026-W")) {
    console.error(markdown);
    process.exit(1);
  }
  const source = readFileSync(fileURLToPath(import.meta.url), "utf8");
  if (!source.includes('git", ["fetch", "origin", "metrics"]')) {
    console.error("self-test: pnpm metrics tiene que leer origin/metrics");
    process.exit(1);
  }
  console.log("harness-metrics self-test ok");
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked && process.argv.includes("--self-test")) selfTest();
else if (invoked) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const local = readLines(join(root, ".specify/telemetry/runs.jsonl"));
  process.stdout.write(trendFrom(showMetrics(root), local));
}
