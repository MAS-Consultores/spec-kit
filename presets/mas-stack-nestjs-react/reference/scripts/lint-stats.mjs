/**
 * Run oxlint or ESLint and append per-rule and per-file counts.
 *
 *   node scripts/lint-stats.mjs --gate lint-fast -- oxlint
 *   node scripts/lint-stats.mjs --gate lint -- eslint .
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendRecord, buildRecord, lintFindings, summarizeFindings } from "./harness-telemetry.mjs";

function run(command) {
  return new Promise((resolveRun) => {
    const started = Date.now();
    const child = spawn(command[0], command.slice(1), { stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on("close", (code) => {
      resolveRun({ code: code ?? 1, durationMs: Date.now() - started, stdout, stderr });
    });
  });
}

function printFindings(findings) {
  if (findings.length === 0) return;
  for (const finding of findings) process.stdout.write(`${finding.file}: ${finding.rule}\n`);
}

const argv = process.argv.slice(2);
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!invokedDirectly) {
  // library import
} else if (argv.includes("--self-test")) {
  const sample = '{"diagnostics":[{"filename":"apps/api/src/pay.ts","code":"eslint(max-lines)"}]}';
  const summary = summarizeFindings(lintFindings(sample));
  if (summary.byRule["max-lines"] !== 1 || summary.byFile["apps/api/src/pay.ts"] !== 1) {
    console.error("lint-stats self-test");
    process.exit(1);
  }
  console.log("lint-stats self-test ok");
} else {
  const gateIndex = argv.indexOf("--gate");
  const split = argv.indexOf("--");
  const gate = argv[gateIndex + 1];
  const command = argv.slice(split + 1);
  if (!gate || command.length === 0) {
    console.error("uso: lint-stats.mjs --gate <nombre> -- <comando>");
    process.exit(1);
  }
  if (command[0] === "oxlint" && !command.includes("-f") && !command.includes("--format")) {
    command.splice(1, 0, "-f", "json");
  }
  const result = await run(command);
  const findings = lintFindings(result.stdout.trim().startsWith("{") || result.stdout.trim().startsWith("[") ? result.stdout : `${result.stdout}\n${result.stderr}`);
  if (findings.length === 0 && result.stdout && !result.stdout.trim().startsWith("{")) process.stdout.write(result.stdout);
  else printFindings(findings);
  const summary = summarizeFindings(findings);
  appendRecord(process.cwd(), buildRecord({
    gate,
    ok: result.code === 0,
    durationMs: result.durationMs,
    byRule: summary.byRule,
    byFile: summary.byFile,
  }));
  process.exit(result.code);
}
