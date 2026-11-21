/**
 * Ratchet. Counts must not rise above quality-baseline.json.
 * When they fall, update the baseline in the same PR:
 *   node scripts/check-quality-baseline.mjs --update
 * Touched files must stay equal or better (fewer warnings).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ADOPTION_RULES } from "./check-diff-quality.mjs";
import { jscpdSkipOwners } from "./quality-gate-config.mjs";

const root = new URL("..", import.meta.url).pathname;
const baselinePath = join(root, "quality-baseline.json");

function readBaseline() {
  return JSON.parse(readFileSync(baselinePath, "utf8"));
}

function compareCounts(current, baseline, label) {
  const problems = [];
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const key of keys) {
    const now = current[key] ?? 0;
    const before = baseline[key] ?? 0;
    if (now > before) problems.push(`${label} ${key}: ${before} -> ${now}`);
  }
  return problems;
}

async function warningCounts() {
  const stdout = execFileSync("pnpm", ["exec", "eslint", "apps", "packages", "-f", "json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const results = JSON.parse(stdout);
  const counts = {};
  for (const rule of ADOPTION_RULES) counts[rule] = {};
  for (const result of results) {
    const relative = result.filePath.startsWith(root)
      ? result.filePath.slice(root.length).replace(/^\//, "")
      : result.filePath;
    for (const message of result.messages) {
      if (!ADOPTION_RULES.includes(message.ruleId) || message.severity !== 1) continue;
      const bucket = counts[message.ruleId] ?? {};
      bucket[relative] = (bucket[relative] ?? 0) + 1;
      counts[message.ruleId] = bucket;
    }
  }
  return counts;
}

function knipCount() {
  try {
    execFileSync("pnpm", ["exec", "knip", "--reporter", "json"], {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://user:pass@127.0.0.1:5432/demo" },
    });
    return 0;
  } catch (error) {
    const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
    try {
      const payload = JSON.parse(stdout);
      const issues = payload.issues ?? payload;
      return JSON.stringify(issues).length;
    } catch {
      return 1;
    }
  }
}

function skipsJscpd(argv) {
  return argv.includes("--skip-jscpd-ratchet");
}

function jscpdProblems(current, baseline) {
  const problems = [];
  if (current.clones > (baseline.clones ?? 0)) {
    problems.push(`jscpd clones: ${baseline.clones ?? 0} -> ${current.clones}`);
  }
  if (current.percentage > (baseline.percentage ?? 0) + 0.01) {
    problems.push(`jscpd %: ${baseline.percentage ?? 0} -> ${current.percentage}`);
  }
  return problems;
}

function jscpdStats() {
  const output = mkdtempSync(join(tmpdir(), "jscpd-"));
  const ignore = [
    "**/node_modules/**",
    "**/dist/**",
    "**/generated/**",
    "**/lint-fixtures/**",
    "**/*.spec.ts",
    "**/*.e2e.ts",
    "**/coverage/**",
  ];
  let jscpdError = "";
  try {
    execFileSync(
      "pnpm",
      [
        "exec",
        "jscpd",
        "apps",
        "packages",
        "--min-lines",
        "8",
        "--min-tokens",
        "60",
        "--reporters",
        "json",
        "--output",
        output,
        "--silent",
        "--ignore",
        ignore.join(","),
      ],
      { cwd: root, stdio: "pipe" },
    );
  } catch (error) {
    jscpdError = error instanceof Error ? error.message : String(error);
  }
  const reportPath = join(output, "jscpd-report.json");
  if (!existsSync(reportPath)) {
    rmSync(output, { recursive: true, force: true });
    throw new Error(`jscpd no escribió informe. ${jscpdError}`);
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  rmSync(output, { recursive: true, force: true });
  return {
    percentage: Number(report.statistics?.total?.percentage ?? 0),
    clones: Number(report.statistics?.total?.clones ?? 0),
  };
}

function selfTest() {
  const higher = compareCounts({ "a.ts": 2 }, { "a.ts": 1 }, "warn");
  const same = compareCounts({ "a.ts": 1 }, { "a.ts": 1 }, "warn");
  const lower = compareCounts({}, { "a.ts": 1 }, "warn");
  if (higher.length !== 1 || same.length !== 0 || lower.length !== 0) {
    console.error("self-test: el trinquete debe fallar solo cuando el conteo sube");
    process.exit(1);
  }
  const dir = mkdtempSync(join(tmpdir(), "jscpd-self-"));
  const body = "export function duplicate(value: number): number {\n  const doubled = value + value;\n  const shifted = doubled + value;\n  const scaled = shifted + doubled;\n  return scaled + value;\n}\n";
  writeFileSync(join(dir, "one.ts"), body);
  writeFileSync(join(dir, "two.ts"), body.replace("duplicate", "duplicateCopy"));
  const loose = mkdtempSync(join(tmpdir(), "jscpd-off-"));
  let found = 0;
  let ignored = 0;
  try {
    execFileSync("pnpm", ["exec", "jscpd", dir, "--min-lines", "5", "--min-tokens", "20", "--reporters", "json", "--output", loose, "--silent"], { cwd: root, stdio: "pipe" });
  } catch {
    // reported via json
  }
  try {
    const report = JSON.parse(readFileSync(join(loose, "jscpd-report.json"), "utf8"));
    found = Number(report.statistics?.total?.clones ?? 0);
  } catch {
    found = 0;
  }
  const offDir = mkdtempSync(join(tmpdir(), "jscpd-high-"));
  try {
    execFileSync("pnpm", ["exec", "jscpd", dir, "--min-lines", "500", "--min-tokens", "5000", "--reporters", "json", "--output", offDir, "--silent"], { cwd: root, stdio: "pipe" });
  } catch {
    // ignore
  }
  try {
    const report = JSON.parse(readFileSync(join(offDir, "jscpd-report.json"), "utf8"));
    ignored = Number(report.statistics?.total?.clones ?? 0);
  } catch {
    ignored = 0;
  }
  rmSync(dir, { recursive: true, force: true });
  rmSync(loose, { recursive: true, force: true });
  rmSync(offDir, { recursive: true, force: true });
  if (found < 1 || ignored !== 0) {
    console.error(`self-test jscpd: con umbral bajo clones=${found}, con umbral alto (apagado) clones=${ignored}`);
    process.exit(1);
  }
  const raised = { clones: found, percentage: 1.44 };
  const baseline = { clones: 0, percentage: 0 };
  const enforced = jscpdProblems(raised, baseline);
  const skipped = skipsJscpd(["--skip-jscpd-ratchet"]) ? [] : jscpdProblems(raised, baseline);
  if (enforced.length === 0 || skipped.length !== 0 || skipsJscpd([])) {
    console.error("self-test: un clon real debe subir el trinquete, y --skip-jscpd-ratchet lo omite");
    process.exit(1);
  }
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const verifySkips = pkg.scripts.verify.includes("--skip-jscpd-ratchet");
  const lintSkips = pkg.scripts.lint.includes("--skip-jscpd-ratchet");
  const owners = jscpdSkipOwners(root);
  const renamed = mkdtempSync(join(tmpdir(), "fitness-name-"));
  writeFileSync(join(renamed, "quality-gates.json"), JSON.stringify({ jscpdSkipScripts: ["check-module-fitness.mjs"] }));
  const renamedScripts = join(renamed, "scripts");
  mkdirSync(renamedScripts);
  writeFileSync(join(renamedScripts, "check-module-fitness.mjs"), 'run("pnpm", ["lint", "--", "--skip-jscpd-ratchet"]);\n');
  const renamedOwners = jscpdSkipOwners(renamed);
  rmSync(renamed, { recursive: true, force: true });
  if (verifySkips || lintSkips || owners.owners.length === 0 || owners.unexpected.length !== 0) {
    console.error("self-test: --skip-jscpd-ratchet solo puede usarlo el script de fitness declarado");
    process.exit(1);
  }
  if (renamedOwners.owners.length !== 1 || renamedOwners.owners[0] !== "check-module-fitness.mjs" || renamedOwners.unexpected.length !== 0) {
    console.error("self-test: el trinquete no puede depender del nombre check-gen-fitness.mjs");
    process.exit(1);
  }
  console.log("check-quality-baseline self-test ok");
}

async function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  const skipJscpd = skipsJscpd(process.argv);
  const warnings = await warningCounts();
  const knip = knipCount();
  const duplication = skipJscpd ? { percentage: 0, clones: 0 } : jscpdStats();
  const next = { warnings, knip, jscpd: duplication };
  if (process.argv.includes("--update")) {
    if (skipJscpd) {
      console.error("--skip-jscpd-ratchet no puede actualizar la baseline");
      process.exit(1);
    }
    writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`baseline actualizada en ${baselinePath}`);
    return;
  }
  const baseline = readBaseline();
  const problems = [];
  for (const rule of ADOPTION_RULES) {
    problems.push(...compareCounts(warnings[rule] ?? {}, baseline.warnings?.[rule] ?? {}, rule));
  }
  if (knip > (baseline.knip ?? 0)) problems.push(`knip: ${baseline.knip ?? 0} -> ${knip}`);
  if (!skipJscpd) problems.push(...jscpdProblems(duplication, baseline.jscpd ?? {}));
  if (problems.length > 0) {
    console.error("el trinquete subió. Si el conteo bajó, corre --update en el mismo PR.");
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log("quality baseline ok");
}

await main();
