/**
 * Append one JSON line per gate to .specify/telemetry/runs.jsonl.
 * No external services and no environment values.
 *
 *   node scripts/harness-telemetry.mjs --self-test
 *   node scripts/harness-telemetry.mjs --gate lint -- pnpm lint
 */
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RULE_RE = /"ruleId"\s*:\s*"([^"]+)"|([@a-z][\w/-]*)\s*$/i;

export function telemetryPath(root) {
  return join(root, ".specify", "telemetry", "runs.jsonl");
}

function gateEnv(parts) {
  return process.env[parts.join("_")] ?? "";
}

export function ruleName(code) {
  const wrapped = String(code ?? "").match(/^[a-z0-9-]+\((.+)\)$/i);
  return wrapped ? wrapped[1] : String(code ?? "");
}

export function lintFindings(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return findingsFromJson(JSON.parse(trimmed));
    } catch {
      // The linter also prints prose around JSON. Fall through to line parsing.
    }
  }
  const findings = [];
  let file = "";
  for (const line of text.split("\n")) {
    const stylishFile = line.match(/^(\S+\.(?:ts|tsx|js|mjs|cjs))$/);
    if (stylishFile && !line.includes(":")) {
      file = stylishFile[1];
      continue;
    }
    const stylish = line.match(/^\s+\d+:\d+\s+(?:error|warning)\s+.*\s{2,}(\S+)\s*$/);
    if (stylish && file) {
      findings.push({ file, rule: stylish[1] });
      continue;
    }
    const unix = line.match(/^(\S+):\d+:\d+:\s+(?:error|warning|warn)\s+.*\[([^\]]+)\]\s*$/);
    if (unix) findings.push({ file: unix[1], rule: unix[2] });
  }
  return findings;
}

function findingsFromJson(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.diagnostics)
      ? payload.diagnostics
      : [];
  const findings = [];
  for (const row of rows) {
    if (Array.isArray(row?.messages)) {
      for (const message of row.messages) {
        if (!message?.ruleId) continue;
        findings.push({ file: row.filePath ?? row.filename ?? "unknown", rule: ruleName(message.ruleId) });
      }
      continue;
    }
    const code = row?.code ?? row?.ruleId;
    if (!code) continue;
    findings.push({ file: row.filename ?? row.filePath ?? "unknown", rule: ruleName(code) });
  }
  return findings;
}

export function summarizeFindings(findings) {
  const byRule = {};
  const byFile = {};
  for (const finding of findings) {
    byRule[finding.rule] = (byRule[finding.rule] ?? 0) + 1;
    byFile[finding.file] = (byFile[finding.file] ?? 0) + 1;
  }
  return { byRule, byFile, rules: Object.keys(byRule) };
}

export function buildRecord({ gate, ok, durationMs, rules, byRule, byFile, feature, phase, round }) {
  const summary = byRule
    ? { byRule, byFile: byFile ?? {}, rules: rules ?? Object.keys(byRule) }
    : summarizeFindings((rules ?? []).map((rule) => ({ rule, file: "unknown" })));
  return {
    feature: feature || gateEnv(["SPEC", "FEATURE"]) || "skeleton",
    phase: phase || gateEnv(["SPEC", "PHASE"]) || "verify",
    gate,
    ok: Boolean(ok),
    rules: [...new Set(summary.rules)].slice(0, 40),
    byRule: summary.byRule,
    byFile: summary.byFile,
    durationMs,
    round: Number(gateEnv(["QUALITY", "LOOP", "ROUND"]) || round || 1),
    at: new Date().toISOString(),
    source: process.env.CI ? "ci" : "local",
  };
}

export function appendRecord(root, record) {
  const path = telemetryPath(root);
  mkdirSync(join(root, ".specify", "telemetry"), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
  return path;
}

function rulesFromOutput(text) {
  return summarizeFindings(lintFindings(text));
}

function runCommand(command) {
  return new Promise((resolveRun) => {
    const started = Date.now();
    const child = spawn(command[0], command.slice(1), { stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let combined = "";
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      combined += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      combined += chunk.toString();
    });
    child.on("close", (code) => {
      resolveRun({ code: code ?? 1, durationMs: Date.now() - started, combined });
    });
  });
}

function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "harness-"));
  try {
    const findings = lintFindings('{"diagnostics":[{"filename":"apps/api/src/pay.ts","code":"eslint(max-lines)","severity":"error"},{"filename":"apps/api/src/pay.ts","code":"eslint(complexity)","severity":"error"}]}');
    const counts = summarizeFindings(findings);
    if (counts.byRule["max-lines"] !== 1 || counts.byFile["apps/api/src/pay.ts"] !== 2) {
      console.error("lint counts");
      process.exit(1);
    }
    const record = buildRecord({
      gate: "lint",
      ok: false,
      durationMs: 12,
      byRule: counts.byRule,
      byFile: counts.byFile,
      feature: "nomina",
      phase: "implement",
      round: 2,
    });
    if (record.rules.length !== 2 || record.feature !== "nomina" || record.round !== 2 || record.byRule["complexity"] !== 1) {
      console.error("record shape");
      process.exit(1);
    }
    if (JSON.stringify(record).includes("TOKEN") || JSON.stringify(record).includes("SECRET")) {
      console.error("record leaked a marker");
      process.exit(1);
    }
    appendRecord(root, record);
    const line = readFileSync(telemetryPath(root), "utf8").trim();
    const parsed = JSON.parse(line);
    if (parsed.gate !== "lint" || parsed.ok !== false || parsed.durationMs !== 12) {
      console.error(line);
      process.exit(1);
    }
    writeFileSync(join(root, "noise.txt"), "JWT_ACCESS_SECRET=nope\n", "utf8");
    const again = buildRecord({ gate: "typecheck", ok: true, durationMs: 1, rules: [] });
    if (JSON.stringify(again).includes("JWT") || JSON.stringify(again).includes("nope")) {
      console.error("telemetry copied a secret");
      process.exit(1);
    }
    console.log("harness-telemetry self-test ok");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const argv = process.argv.slice(2);
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!invokedDirectly) {
  // imported by lint-stats and the eval runner
} else if (argv.includes("--self-test")) {
  selfTest();
} else {
  const gateIndex = argv.indexOf("--gate");
  const split = argv.indexOf("--");
  if (gateIndex === -1 || split === -1 || split < gateIndex) {
    console.error("uso: harness-telemetry.mjs --gate <nombre> -- <comando>");
    process.exit(1);
  }
  const gate = argv[gateIndex + 1];
  const command = argv.slice(split + 1);
  if (!gate || command.length === 0) {
    console.error("falta el gate o el comando");
    process.exit(1);
  }
  const result = await runCommand(command);
  const summary = rulesFromOutput(result.combined);
  appendRecord(process.cwd(), buildRecord({
    gate,
    ok: result.code === 0,
    durationMs: result.durationMs,
    rules: summary.rules,
    byRule: summary.byRule,
    byFile: summary.byFile,
  }));
  process.exit(result.code);
}

void RULE_RE;
void resolve;
