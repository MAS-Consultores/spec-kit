/**
 * Aggregates .specify/telemetry/runs.jsonl into docs/metrics/harness.md.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function isoWeek(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin-fecha";
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function addCounts(target, counts) {
  for (const [key, count] of Object.entries(counts ?? {})) target[key] = (target[key] ?? 0) + count;
}

export function renderHarness(records) {
  const rules = {};
  const files = {};
  const weeks = {};
  const rounds = {};
  const gates = {};
  let escaped = 0;
  for (const record of records) {
    rounds[record.feature] = Math.max(rounds[record.feature] ?? 0, record.round ?? 1);
    gates[record.gate] = gates[record.gate] ?? { runs: 0, failed: 0, durationMs: 0 };
    gates[record.gate].runs += 1;
    gates[record.gate].durationMs += record.durationMs ?? 0;
    if (!record.ok) gates[record.gate].failed += 1;
    if (record.byRule) addCounts(rules, record.byRule);
    else for (const rule of record.rules ?? []) rules[rule] = (rules[rule] ?? 0) + 1;
    addCounts(files, record.byFile);
    const week = isoWeek(record.at);
    const findings = Object.values(record.byRule ?? {}).reduce((sum, count) => sum + count, 0) || (record.rules ?? []).length;
    weeks[week] = (weeks[week] ?? 0) + findings;
    if (record.phase === "ci" && record.ok === false && record.localOk === true) escaped += 1;
  }
  const table = (entries, headers) => [
    `| ${headers[0]} | ${headers[1]} |`,
    "| --- | --- |",
    ...(entries.length ? entries : [`| — | 0 |`]),
  ];
  const ruleRows = Object.entries(rules).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([rule, count]) => `| ${rule} | ${count} |`);
  const fileRows = Object.entries(files).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([file, count]) => `| ${file} | ${count} |`);
  const weekRows = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).map(([week, count]) => `| ${week} | ${count} |`);
  const gateRows = Object.entries(gates).map(([gate, value]) => `| ${gate} | ${value.runs} | ${value.failed} | ${value.durationMs} |`);
  const roundRows = Object.entries(rounds).map(([feature, round]) => `| ${feature} | ${round} |`);
  return [
    "# Harness",
    "",
    "Top de reglas, top de archivos y tendencia semanal. Lo genera `pnpm metrics` desde `docs/metrics/runs.jsonl`.",
    "",
    "## Reglas",
    "",
    ...table(ruleRows, ["Regla", "Hallazgos"]),
    "",
    "## Archivos",
    "",
    ...table(fileRows, ["Archivo", "Hallazgos"]),
    "",
    "## Semanas",
    "",
    ...table(weekRows, ["Semana", "Hallazgos"]),
    "",
    "## Vueltas",
    "",
    ...table(roundRows, ["Feature", "Vueltas"]),
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
  if (!markdown.includes("max-depth") || !markdown.includes("| nomina | 2 |") || !markdown.includes("Fallas de CI no vistas en local: 1") || !markdown.includes("## Archivos") || !markdown.includes("## Semanas")) {
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

const reportInvoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (reportInvoked && process.argv.includes("--self-test")) selfTest();
else if (reportInvoked && process.argv.includes("--write")) {
  const root = process.cwd();
  const accumulated = join(root, "docs/metrics/runs.jsonl");
  const source = exists(accumulated) ? accumulated : join(root, ".specify/telemetry/runs.jsonl");
  const raw = exists(source) ? readFileSync(source, "utf8") : "";
  const records = raw.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const target = join(root, "docs/metrics/harness.md");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, renderHarness(records), "utf8");
  console.log(target);
}

function exists(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}
