/**
 * Ratchet. Counts must not rise above quality-baseline.json.
 * When they fall, update the baseline in the same PR:
 *   node scripts/check-quality-baseline.mjs --update
 * Touched files must stay equal or better (fewer warnings).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ADOPTION_RULES } from "./check-diff-quality.mjs";

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

const fitnessDomainsPath = join(root, "scripts", ".fitness-domains");

function fitnessDomains() {
  if (!existsSync(fitnessDomainsPath)) return [];
  return readFileSync(fitnessDomainsPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[a-z][a-z0-9]*$/.test(line));
}

function isThrowawayPath(name, domains) {
  const normalized = String(name ?? "").replaceAll("\\", "/");
  return domains.some(
    (domain) =>
      normalized.includes(`/modules/${domain}/`) ||
      normalized.includes(`/features/${domain}/`) ||
      normalized.includes(`/contracts/src/${domain}/`) ||
      normalized.endsWith(`/${domain}.prisma`),
  );
}

export function clonesOutsideDomains(duplicates, domains) {
  const list = Array.isArray(duplicates) ? duplicates : [];
  if (domains.length === 0) return list;
  return list.filter(
    (clone) =>
      !(
        isThrowawayPath(clone.firstFile?.name, domains) &&
        isThrowawayPath(clone.secondFile?.name, domains)
      ),
  );
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
  const domains = fitnessDomains();
  const kept = clonesOutsideDomains(report.duplicates, domains);
  return {
    percentage: Number(report.statistics?.total?.percentage ?? 0),
    clones: domains.length === 0 ? Number(report.statistics?.total?.clones ?? kept.length) : kept.length,
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
  const tree = mkdtempSync(join(tmpdir(), "jscpd-fitness-"));
  const throwOnly = mkdtempSync(join(tmpdir(), "jscpd-throw-"));
  mkdirSync(join(tree, "real"), { recursive: true });
  mkdirSync(join(tree, "apps/api/src/modules/alpha"), { recursive: true });
  mkdirSync(join(tree, "apps/api/src/modules/beta"), { recursive: true });
  mkdirSync(join(throwOnly, "apps/api/src/modules/alpha"), { recursive: true });
  mkdirSync(join(throwOnly, "apps/api/src/modules/beta"), { recursive: true });
  writeFileSync(join(tree, "real/one.ts"), body);
  writeFileSync(join(tree, "real/two.ts"), body.replace("duplicate", "duplicateReal"));
  const throwBody = "export function generated(record: string): string {\n  const label = record.trim();\n  const upper = label.toUpperCase();\n  const padded = upper.padEnd(8, \"x\");\n  return padded.slice(0, 8);\n}\n";
  writeFileSync(join(tree, "apps/api/src/modules/alpha/a.ts"), throwBody);
  writeFileSync(join(tree, "apps/api/src/modules/beta/b.ts"), throwBody.replace("throwaway", "throwawayCopy"));
  writeFileSync(join(throwOnly, "apps/api/src/modules/alpha/a.ts"), throwBody);
  writeFileSync(join(throwOnly, "apps/api/src/modules/beta/b.ts"), throwBody.replace("throwaway", "throwawayCopy"));
  const fitnessOut = mkdtempSync(join(tmpdir(), "jscpd-fitness-out-"));
  const throwOut = mkdtempSync(join(tmpdir(), "jscpd-throw-out-"));
  const runJscpd = (source, dest) => {
    try {
      execFileSync("pnpm", ["exec", "jscpd", source, "--min-lines", "5", "--min-tokens", "20", "--reporters", "json", "--output", dest, "--silent"], { cwd: root, stdio: "pipe" });
    } catch {
      // reported via json
    }
    return JSON.parse(readFileSync(join(dest, "jscpd-report.json"), "utf8"));
  };
  const mixed = runJscpd(tree, fitnessOut);
  const onlyThrowaway = runJscpd(throwOnly, throwOut);
  const domains = ["alpha", "beta"];
  const mixedAll = Array.isArray(mixed.duplicates) ? mixed.duplicates.length : 0;
  const mixedKept = clonesOutsideDomains(mixed.duplicates, domains).length;
  const throwAll = Array.isArray(onlyThrowaway.duplicates) ? onlyThrowaway.duplicates.length : 0;
  const throwKept = clonesOutsideDomains(onlyThrowaway.duplicates, domains).length;
  rmSync(tree, { recursive: true, force: true });
  rmSync(throwOnly, { recursive: true, force: true });
  rmSync(fitnessOut, { recursive: true, force: true });
  rmSync(throwOut, { recursive: true, force: true });
  if (mixedAll < 2 || throwAll < 1) {
    console.error(`self-test fitness: sin exclusion mixed=${mixedAll} throwaway=${throwAll}`);
    process.exit(1);
  }
  if (throwKept !== 0 || mixedKept !== 1) {
    console.error(`self-test fitness: con exclusion throwaway=${throwKept} real=${mixedKept}`);
    process.exit(1);
  }
  const ratchet = mixedKept > 0 ? [`jscpd clones: 0 -> ${String(mixedKept)}`] : [];
  if (ratchet.length === 0) {
    console.error("self-test fitness: un clon real fuera de alpha/beta no sube el trinquete");
    process.exit(1);
  }
  console.log("check-quality-baseline self-test ok");
}

async function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  const warnings = await warningCounts();
  const knip = knipCount();
  const duplication = jscpdStats();
  const next = { warnings, knip, jscpd: duplication };
  if (process.argv.includes("--update")) {
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
  if (duplication.clones > (baseline.jscpd?.clones ?? 0)) {
    problems.push(`jscpd clones: ${baseline.jscpd?.clones ?? 0} -> ${duplication.clones}`);
  }
  // scripts/.fitness-domains exists only while check-gen-fitness lints the
  // throwaway domains. Their percentage includes those copies; the clone
  // count above already drops pairs that sit entirely inside them.
  if (fitnessDomains().length === 0 && duplication.percentage > (baseline.jscpd?.percentage ?? 0) + 0.01) {
    problems.push(`jscpd %: ${baseline.jscpd?.percentage ?? 0} -> ${duplication.percentage}`);
  }
  if (problems.length > 0) {
    console.error("el trinquete subió. Si el conteo bajó, corre --update en el mismo PR.");
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log("quality baseline ok");
}

await main();
