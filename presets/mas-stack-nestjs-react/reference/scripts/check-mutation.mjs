/**
 * Mutation testing on the diff, only for critical modules.
 * Existing modules outside the diff are skipped (warn). A changed file in a
 * configured module must be on the stryker mutate list and meet the threshold.
 *
 *   node scripts/check-mutation.mjs --self-test
 *   node scripts/check-mutation.mjs --run
 *
 * The diff is `merge-base(HEAD, base)..HEAD`, not the dirty working tree.
 * Base resolution: `--base`, then `GITHUB_BASE_REF`, then the default branch
 * (`origin/HEAD`), `origin/main`, `origin/master`, then `HEAD^`.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { candidateRefs, resolveMergeBase } from "./lib/diff-base.mjs";

export { candidateRefs, resolveMergeBase };

const referenceRoot = fileURLToPath(new URL("..", import.meta.url));
const vitestRunner = "@stryker-mutator/vitest-runner";
const vitestRunnerVersion = "10.1.1";

export function globExcluded(file, pattern) {
  const body = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, ".*");
  return new RegExp(`^${body}$`).test(file);
}

export function mutationPlan(gates, changedFiles) {
  const modules = gates.mutation?.modules ?? [];
  const paths = gates.mutation?.paths ?? {};
  const threshold = gates.mutation?.threshold;
  const exclude = gates.mutation?.exclude ?? [];
  const mutate = [];
  const warnings = [];
  for (const file of changedFiles) {
    const moduleName = modules.find((name) => {
      const folder = paths[name];
      return folder && (file === folder || file.startsWith(`${folder}/`));
    });
    if (!moduleName) continue;
    if (!file.endsWith(".ts") || file.endsWith(".spec.ts") || file.endsWith(".test.ts")) continue;
    if (exclude.some((pattern) => globExcluded(file, pattern))) continue;
    mutate.push(file);
  }
  for (const name of modules) {
    if (!paths[name]) warnings.push(`modulo ${name} sin path`);
  }
  return { mutate, threshold, warnings };
}

function readGates(root) {
  return JSON.parse(readFileSync(join(root, "quality-gates.json"), "utf8"));
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function diffSinceMergeBase(root, argv = process.argv, env = process.env) {
  const base = resolveMergeBase(root, argv, env);
  if (!base) return { ok: false, reason: "sin base resoluble", stderr: "", base: null, files: [] };
  const result = spawnSync("git", ["diff", "--name-only", "--diff-filter=ACMR", base, "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return {
      ok: false,
      reason: `git diff salió ${result.status ?? "null"}`,
      stderr: result.stderr ?? "",
      base,
      files: [],
    };
  }
  return {
    ok: true,
    reason: "",
    stderr: "",
    base,
    files: result.stdout.split("\n").map((line) => line.trim()).filter(Boolean),
  };
}

function reportMutants(report) {
  const files = report && typeof report === "object" ? report.files : null;
  if (!files || typeof files !== "object") return [];
  return Object.values(files).flatMap((file) => (file && Array.isArray(file.mutants) ? file.mutants : []));
}

export function mutationScore(report) {
  const mutants = reportMutants(report);
  const killed = mutants.filter((mutant) => mutant.status === "Killed").length;
  const survived = mutants.filter((mutant) => mutant.status === "Survived").length;
  const timeout = mutants.filter((mutant) => mutant.status === "Timeout").length;
  const scored = killed + survived + timeout;
  if (scored === 0) return Number.NaN;
  return (killed / scored) * 100;
}

export function perTestCoverageOk(report) {
  const mutants = reportMutants(report);
  if (mutants.length === 0) return false;
  const scored = mutants.filter((mutant) => mutant.status === "Killed" || mutant.status === "Survived" || mutant.status === "Timeout");
  if (scored.length === 0) return false;
  return scored.every((mutant) => Array.isArray(mutant.coveredBy) && mutant.coveredBy.length > 0);
}

function cleanEnv() {
  const env = { ...process.env };
  delete env.GITHUB_BASE_REF;
  return env;
}

function assertVitestRunner() {
  const pkg = JSON.parse(readFileSync(join(referenceRoot, "package.json"), "utf8"));
  if (pkg.devDependencies?.[vitestRunner] !== vitestRunnerVersion) {
    console.error(`falta ${vitestRunner} ${vitestRunnerVersion}`);
    process.exit(1);
  }
  const lock = readFileSync(join(referenceRoot, "pnpm-lock.yaml"), "utf8");
  if (!lock.includes(`'${vitestRunner}@${vitestRunnerVersion}'`)) {
    console.error("el lockfile no fija el runner de vitest");
    process.exit(1);
  }
  if (!existsSync(join(referenceRoot, "node_modules"))) return;
  const require = createRequire(join(referenceRoot, "package.json"));
  try {
    require.resolve(vitestRunner);
  } catch (error) {
    console.error("el runner vitest está declarado y no se resuelve");
    console.error(error);
    process.exit(1);
  }
}

function selfTest() {
  const gates = {
    mutation: {
      modules: ["nomina", "permisos", "auth"],
      threshold: 80,
      paths: { auth: "apps/api/src/modules/auth", permisos: "apps/api/src/modules/auth", nomina: "apps/api/src/modules/nomina" },
    },
  };
  const outside = mutationPlan(gates, ["apps/web/src/features/home/index.ts"]);
  if (outside.mutate.length !== 0) {
    console.error("un archivo fuera de los módulos críticos no se muta");
    process.exit(1);
  }
  const inside = mutationPlan(gates, ["apps/api/src/modules/auth/auth.service.ts"]);
  if (inside.mutate.length !== 1 || inside.threshold !== 80) {
    console.error("el diff de auth no entra al plan");
    process.exit(1);
  }
  const spec = mutationPlan(gates, ["apps/api/src/modules/auth/auth.service.spec.ts"]);
  if (spec.mutate.length !== 0) {
    console.error("el spec no se muta");
    process.exit(1);
  }
  const repositories = mutationPlan({
    mutation: {
      modules: ["employees"],
      threshold: 80,
      paths: { employees: "apps/api/src/modules/employees" },
      exclude: ["**/*.repository.ts", "apps/api/src/modules/tabular-import/**"],
    },
  }, [
    "apps/api/src/modules/employees/employees.repository.ts",
    "apps/api/src/modules/employees/employees.service.ts",
    "apps/api/src/modules/tabular-import/tabular-import.service.ts",
  ]);
  if (repositories.mutate.length !== 1 || repositories.mutate[0] !== "apps/api/src/modules/employees/employees.service.ts") {
    console.error("un exclude de quality-gates.json no puede entrar a la mutación");
    process.exit(1);
  }
  const missing = mutationPlan({ mutation: { modules: ["nomina"], threshold: 0, paths: {} } }, []);
  if (!missing.warnings.some((line) => line.includes("nomina"))) {
    console.error("un módulo sin path tiene que avisar");
    process.exit(1);
  }
  const broken = mutationPlan({ mutation: { modules: ["auth"], paths: { auth: "apps/api/src/modules/auth" } } }, [
    "apps/api/src/modules/auth/auth.service.ts",
  ]);
  if (broken.threshold !== undefined) {
    console.error("sin umbral el plan no puede pasar por alto el número");
    process.exit(1);
  }
  const root = mkdtempSync(join(tmpdir(), "mutation-"));
  try {
    writeFileSync(join(root, "quality-gates.json"), JSON.stringify({ mutation: { modules: ["auth"], paths: {} } }), "utf8");
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: root, encoding: "utf8" });
    if (result.status === 0) {
      console.error("sin umbral el gate tiene que fallar");
      process.exit(1);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const refs = candidateRefs(["node", "check-mutation.mjs"], {});
  if (refs.includes("origin/testing") || refs[0] !== "origin/HEAD") {
    console.error("el fallback no puede quedar en testing");
    process.exit(1);
  }
  const script = fileURLToPath(import.meta.url);
  const committed = mkdtempSync(join(tmpdir(), "mutation-git-"));
  try {
    const run = (args) => spawnSync(process.execPath, [script, ...args], { cwd: committed, encoding: "utf8", env: cleanEnv() });
    git(committed, ["init", "-q"]);
    git(committed, ["config", "user.email", "mutation@invalid.test"]);
    git(committed, ["config", "user.name", "mutation"]);
    writeFileSync(join(committed, "quality-gates.json"), JSON.stringify({
      mutation: { modules: ["auth"], threshold: 80, paths: { auth: "apps/api/src/modules/auth" } },
    }));
    git(committed, ["add", "quality-gates.json"]);
    git(committed, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "base"]);
    const service = join(committed, "apps/api/src/modules/auth/auth.service.ts");
    mkdirSync(join(committed, "apps/api/src/modules/auth"), { recursive: true });
    writeFileSync(service, "export const value = 1;\n");
    git(committed, ["add", "."]);
    git(committed, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "feature"]);
    const dirty = run([]);
    if (dirty.status !== 0 || !dirty.stdout.includes("apps/api/src/modules/auth/auth.service.ts")) {
      console.error("un diff ya commiteado no puede saltarse la mutación");
      console.error(dirty.stdout);
      console.error(dirty.stderr);
      process.exit(1);
    }
    if (dirty.stdout.includes("sin diff")) {
      console.error("el gate se saltó con un diff commiteado");
      process.exit(1);
    }
  } finally {
    rmSync(committed, { recursive: true, force: true });
  }
  const branched = mkdtempSync(join(tmpdir(), "mutation-base-"));
  try {
    const run = (args) => spawnSync(process.execPath, [script, ...args], { cwd: branched, encoding: "utf8", env: cleanEnv() });
    git(branched, ["init", "-q", "-b", "main"]);
    git(branched, ["config", "user.email", "mutation@invalid.test"]);
    git(branched, ["config", "user.name", "mutation"]);
    writeFileSync(join(branched, "quality-gates.json"), JSON.stringify({
      mutation: { modules: ["auth"], threshold: 80, paths: { auth: "apps/api/src/modules/auth" } },
    }));
    git(branched, ["add", "quality-gates.json"]);
    git(branched, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "base"]);
    const service = join(branched, "apps/api/src/modules/auth/auth.service.ts");
    mkdirSync(join(branched, "apps/api/src/modules/auth"), { recursive: true });
    writeFileSync(service, "export const value = 1;\n");
    git(branched, ["add", "."]);
    git(branched, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "feature"]);
    writeFileSync(join(branched, "README.md"), "nota\n");
    git(branched, ["add", "README.md"]);
    git(branched, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "nota"]);
    git(branched, ["update-ref", "refs/remotes/origin/main", "HEAD~2"]);
    git(branched, ["update-ref", "refs/remotes/origin/testing", "HEAD"]);
    git(branched, ["update-ref", "refs/remotes/origin/master", "HEAD"]);
    git(branched, ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main"]);
    const picked = run([]);
    if (picked.status !== 0 || !picked.stdout.includes("apps/api/src/modules/auth/auth.service.ts") || picked.stdout.includes("sin diff")) {
      console.error("el fallback tiene que usar la rama por defecto, no testing");
      console.error(picked.stdout);
      console.error(picked.stderr);
      process.exit(1);
    }
  } finally {
    rmSync(branched, { recursive: true, force: true });
  }
  assertVitestRunner();
  const product = readGates(referenceRoot);
  if (!product.mutation?.modules?.includes("auth") || product.mutation.threshold < 1) {
    console.error("quality-gates.json no configura la mutación");
    process.exit(1);
  }
  console.log("check-mutation self-test ok");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  const gates = readGates(process.cwd() === referenceRoot || existsGates(process.cwd()) ? gatesRoot() : referenceRoot);
  if (typeof gates.mutation?.threshold !== "number" || gates.mutation.threshold < 1) {
    console.error("mutation.threshold es obligatorio");
    process.exit(1);
  }
  const root = gatesRoot();
  const diff = diffSinceMergeBase(root);
  if (!diff.ok) {
    console.error(`mutation: no se pudo calcular el diff (${diff.reason})`);
    if (diff.stderr) console.error(diff.stderr);
    process.exit(1);
  }
  const plan = mutationPlan(gates, diff.files);
  for (const warning of plan.warnings) console.log(`warn ${warning}`);
  if (plan.mutate.length === 0) {
    console.log(`mutation: sin archivos mutables en el diff (base ${diff.base})`);
    return;
  }
  console.log(`mutate ${plan.mutate.join(" ")} threshold ${plan.threshold}`);
  if (!process.argv.includes("--run")) return;
  const apiPrefix = "apps/api/";
  const relative = plan.mutate.map((file) => (file.startsWith(apiPrefix) ? file.slice(apiPrefix.length) : file));
  const incrementalFile = join(root, "apps/api/.stryker-incremental.json");
  const apiRoot = join(root, "apps/api");
  const run = (incremental) => {
    const configDir = mkdtempSync(join(tmpdir(), "stryker-config-"));
    const configFile = join(configDir, "stryker.config.json");
    writeFileSync(configFile, JSON.stringify({
      testRunner: "vitest",
      plugins: [vitestRunner],
      reporters: ["clear-text", "json"],
      coverageAnalysis: "perTest",
      concurrency: 2,
      mutate: relative,
      incremental,
      incrementalFile,
      thresholds: { high: plan.threshold, low: plan.threshold, break: plan.threshold },
    }));
    const result = spawnSync("pnpm", ["exec", "stryker", "run", configFile], {
      cwd: apiRoot,
      stdio: "inherit",
    });
    rmSync(configDir, { recursive: true, force: true });
    return result.status ?? 1;
  };
  let status = run(existsSync(incrementalFile));
  const reportPath = join(apiRoot, "reports", "mutation", "mutation.json");
  const readReport = () => {
    try {
      return JSON.parse(readFileSync(reportPath, "utf8"));
    } catch {
      return null;
    }
  };
  if (status === 0 && existsSync(incrementalFile) && !perTestCoverageOk(readReport())) {
    console.error("Stryker no reportó cobertura perTest; se descarta el incremental y se corre completo");
    rmSync(incrementalFile, { force: true });
    status = run(false);
  }
  const report = readReport();
  const score = mutationScore(report);
  if (!Number.isFinite(score)) {
    console.error("mutation: no hay mutantes puntuados; el score no es un número finito");
    rmSync(incrementalFile, { force: true });
    process.exit(1);
  }
  if (!perTestCoverageOk(report)) {
    console.error("Stryker no reportó cobertura perTest; el resultado incremental no es válido");
    rmSync(incrementalFile, { force: true });
    process.exit(1);
  }
  if (score < plan.threshold) {
    console.error(`mutation: score ${score} por debajo de ${plan.threshold}`);
    process.exit(1);
  }
  if (status !== 0) process.exit(status);
}

function existsGates(root) {
  try {
    readFileSync(join(root, "quality-gates.json"));
    return true;
  } catch {
    return false;
  }
}

function gatesRoot() {
  return existsGates(process.cwd()) ? process.cwd() : referenceRoot;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
