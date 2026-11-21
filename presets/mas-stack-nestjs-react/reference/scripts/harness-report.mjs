/**
 * Aggregates .specify/telemetry/runs.jsonl into docs/metrics/harness.md.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function renderHarness(records) {
  const rules = {};
  const rounds = {};
  const gates = {};
  let escaped = 0;
  for (const record of records) {
    rounds[record.feature] = Math.max(rounds[record.feature] ?? 0, record.round ?? 1);
    gates[record.gate] = gates[record.gate] ?? { runs: 0, failed: 0, durationMs: 0 };
    gates[record.gate].runs += 1;
    gates[record.gate].durationMs += record.durationMs ?? 0;
    if (!record.ok) gates[record.gate].failed += 1;
    for (const rule of record.rules ?? []) rules[rule] = (rules[rule] ?? 0) + 1;
    if (record.phase === "ci" && record.ok === false && record.localOk === true) escaped += 1;
  }
  const ruleRows = Object.entries(rules).sort((a, b) => b[1] - a[1]).map(([rule, count]) => `| ${rule} | ${count} |`);
  const gateRows = Object.entries(gates).map(([gate, value]) => `| ${gate} | ${value.runs} | ${value.failed} | ${value.durationMs} |`);
  const roundRows = Object.entries(rounds).map(([feature, round]) => `| ${feature} | ${round} |`);
  return [
    "# Harness",
    "",
    "Reglas que más fallan, vueltas por feature, tiempos por gate y fallas de CI que no se atraparon en local.",
    "",
    "## Reglas",
    "",
    "| Regla | Fallas |",
    "| --- | --- |",
    ...(ruleRows.length ? ruleRows : ["| — | 0 |"]),
    "",
    "## Vueltas",
    "",
    "| Feature | Vueltas |",
    "| --- | --- |",
    ...(roundRows.length ? roundRows : ["| — | 0 |"]),
    "",
    "## Gates",
    "",
    "| Gate | Corridas | Fallas | Duración ms |",
    "| --- | --- | --- | --- |",
    ...(gateRows.length ? gateRows : ["| — | 0 | 0 | 0 |"]),
    "",
    `Fallas de CI no vistas en local: ${escaped}.`,
    "",
  ].join("\n");
}

function selfTest() {
  const markdown = renderHarness([
    { feature: "nomina", phase: "implement", gate: "lint", ok: false, rules: ["max-depth"], durationMs: 40, round: 2 },
    { feature: "nomina", phase: "ci", gate: "e2e-critical", ok: false, rules: [], durationMs: 10, round: 1, localOk: true },
  ]);
  if (!markdown.includes("max-depth") || !markdown.includes("| nomina | 2 |") || !markdown.includes("Fallas de CI no vistas en local: 1")) {
    console.error(markdown);
    process.exit(1);
  }
  const root = mkdtempSync(join(tmpdir(), "harness-doc-"));
  try {
    const source = join(root, ".specify/telemetry/runs.jsonl");
    mkdirSync(dirname(source), { recursive: true });
    writeFileSync(source, `${JSON.stringify({ feature: "home", phase: "verify", gate: "lint", ok: true, rules: [], durationMs: 5, round: 1 })}\n`);
    const written = join(root, "docs/metrics/harness.md");
    mkdirSync(dirname(written), { recursive: true });
    writeFileSync(written, renderHarness([JSON.parse(readFileSync(source, "utf8"))]), "utf8");
    if (!readFileSync(written, "utf8").includes("home")) process.exit(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  console.log("harness-report self-test ok");
}

if (process.argv.includes("--self-test")) selfTest();
else if (process.argv.includes("--write")) {
  const root = process.cwd();
  const source = join(root, ".specify/telemetry/runs.jsonl");
  const records = readFileSync(source, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const target = join(root, "docs/metrics/harness.md");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, renderHarness(records), "utf8");
  console.log(target);
}
