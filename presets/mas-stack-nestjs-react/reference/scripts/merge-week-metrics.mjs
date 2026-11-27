/**
 * Junta los JSONL de los artefactos de la semana y arma harness.md.
 * El workflow semanal publica el resultado en la rama metrics. Este script no hace push.
 *
 *   node scripts/merge-week-metrics.mjs --self-test
 *   node scripts/merge-week-metrics.mjs --out dir archivo.jsonl ...
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeLines } from "./harness-collect.mjs";
import { recordsFrom, trendFrom } from "./harness-metrics.mjs";
import { renderHarness } from "./harness-report.mjs";

export function mergeParts(parts) {
  return parts.reduce((acc, lines) => mergeLines(acc, lines), []);
}

export function writeMetrics(dir, lines) {
  mkdirSync(dir, { recursive: true });
  const jsonl = lines.length ? `${lines.join("\n")}\n` : "";
  writeFileSync(join(dir, "runs.jsonl"), jsonl, "utf8");
  writeFileSync(join(dir, "harness.md"), renderHarness(recordsFrom(lines)), "utf8");
}

function linesOf(path) {
  return readFileSync(path, "utf8").split("\n").map((line) => line.trim()).filter(Boolean);
}

function selfTest() {
  const lines = mergeParts([
    ['{"gate":"lint","byRule":{"max-lines":1},"at":"2026-11-02T00:00:00Z","feature":"a","ok":true,"phase":"ci","round":1,"durationMs":1}'],
    ['{"gate":"lint","byRule":{"max-lines":1},"at":"2026-11-02T00:00:00Z","feature":"a","ok":true,"phase":"ci","round":1,"durationMs":1}', '{"gate":"lint-fast","byRule":{"complexity":1},"at":"2026-11-03T00:00:00Z","feature":"a","ok":true,"phase":"ci","round":1,"durationMs":1}'],
  ]);
  if (lines.length !== 2) {
    console.error(lines);
    process.exit(1);
  }
  const markdown = trendFrom(`${lines[0]}\n`, [lines[1]]);
  if (!markdown.includes("max-lines") || !markdown.includes("complexity")) process.exit(1);
  console.log("merge-week-metrics self-test ok");
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked && process.argv.includes("--self-test")) selfTest();
else if (invoked) {
  const outFlag = process.argv.indexOf("--out");
  const out = outFlag === -1 ? "" : process.argv[outFlag + 1];
  const files = process.argv.slice(2).filter((arg, index, all) => arg !== "--out" && all[index - 1] !== "--out");
  if (!out) {
    console.error("uso: merge-week-metrics.mjs --out dir archivo.jsonl ...");
    process.exit(1);
  }
  writeMetrics(out, files.length ? mergeParts(files.map(linesOf)) : []);
}
