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

const RULE_RE = /"ruleId"\s*:\s*"([^"]+)"|([@a-z][\w/-]*)\s*$/i;

export function telemetryPath(root) {
  return join(root, ".specify", "telemetry", "runs.jsonl");
}

export function buildRecord({ gate, ok, durationMs, rules, feature, phase, round }) {
  return {
    feature: feature || process.env.SPEC_FEATURE || "skeleton",
    phase: phase || process.env.SPEC_PHASE || "verify",
    gate,
    ok: Boolean(ok),
    rules: [...new Set(rules ?? [])].slice(0, 40),
    durationMs,
    round: Number(process.env.QUALITY_LOOP_ROUND || round || 1),
  };
}

export function appendRecord(root, record) {
  const path = telemetryPath(root);
  mkdirSync(join(root, ".specify", "telemetry"), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
  return path;
}

function rulesFromOutput(text) {
  const found = [];
  for (const line of text.split("\n")) {
    const match = line.match(/([@a-zA-Z][\w/-]+)/g);
    if (!match) continue;
    for (const token of match) {
      if (token.includes("/") || token.startsWith("max-") || token.startsWith("no-")) found.push(token);
    }
  }
  return found.slice(0, 40);
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
    const record = buildRecord({
      gate: "lint",
      ok: false,
      durationMs: 12,
      rules: ["max-depth", "max-depth"],
      feature: "nomina",
      phase: "implement",
      round: 2,
    });
    if (record.rules.length !== 1 || record.feature !== "nomina" || record.round !== 2) {
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
if (argv.includes("--self-test")) {
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
  appendRecord(process.cwd(), buildRecord({
    gate,
    ok: result.code === 0,
    durationMs: result.durationMs,
    rules: result.code === 0 ? [] : rulesFromOutput(result.combined),
  }));
  process.exit(result.code);
}

void RULE_RE;
void resolve;
