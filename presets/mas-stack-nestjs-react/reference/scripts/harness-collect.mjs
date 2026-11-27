/**
 * Append new JSONL runs onto docs/metrics/runs.jsonl.
 * The committed file is the store. CI uploads the merged file; it does not push.
 *
 *   node scripts/harness-collect.mjs [extra.jsonl ...]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function mergeLines(existing, incoming) {
  const seen = new Set(existing);
  const out = [...existing];
  for (const line of incoming) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function readLines(path) {
  try {
    return readFileSync(path, "utf8").split("\n").map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function selfTest() {
  const merged = mergeLines(['{"gate":"lint"}'], ['{"gate":"lint"}', '{"gate":"lint-fast","byRule":{"max-lines":1}}']);
  if (merged.length !== 2 || !merged[1].includes("max-lines")) {
    console.error(merged);
    process.exit(1);
  }
  console.log("harness-collect self-test ok");
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const root = process.cwd();
  const target = join(root, "docs/metrics/runs.jsonl");
  const sources = [
    join(root, ".specify/telemetry/runs.jsonl"),
    ...process.argv.slice(2).filter((arg) => !arg.startsWith("--")),
  ];
  let lines = readLines(target);
  for (const source of sources) lines = mergeLines(lines, readLines(source));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, lines.length ? `${lines.join("\n")}\n` : "", "utf8");
  console.log(`${target} ${lines.length}`);
}
