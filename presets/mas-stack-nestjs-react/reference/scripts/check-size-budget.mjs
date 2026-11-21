/**
 * Size budgets. An existing file over the line budget warns. A file that is
 * new in the diff and over the budget is an error. size-limit covers the
 * initial web bundle when apps/web/dist exists; the config is always required.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { changedSinceBase } from "./lib/diff-base.mjs";

const referenceRoot = fileURLToPath(new URL("..", import.meta.url));

function gatesOf(root) {
  return JSON.parse(readFileSync(join(root, "quality-gates.json"), "utf8"));
}

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === "generated" || entry === "lint-fixtures") continue;
    const path = join(dir, entry);
    const info = statSync(path);
    if (info.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
  }
}

function lineCount(path) {
  return readFileSync(path, "utf8").split("\n").filter((line) => line.trim() && !line.trim().startsWith("//") && !line.trim().startsWith("*")).length;
}

function changed(root, filter) {
  return changedSinceBase(root, filter);
}

export function reviewSize(root) {
  const gates = gatesOf(root);
  const fileBudget = gates.fileLineBudget ?? 300;
  const moduleBudget = gates.moduleLineBudget ?? 4000;
  const files = [];
  for (const folder of ["apps", "packages"]) {
    const dir = join(root, folder);
    if (existsSync(dir)) walk(dir, files);
  }
  const added = changed(root, "A");
  const touchedModules = changed(root, "AM");
  const errors = [];
  const warnings = [];
  const moduleLines = {};
  for (const path of files) {
    const relativePath = relative(root, path).split("\\").join("/");
    const lines = lineCount(path);
    const moduleMatch = relativePath.match(/^apps\/api\/src\/modules\/([^/]+)\//);
    if (moduleMatch) moduleLines[moduleMatch[1]] = (moduleLines[moduleMatch[1]] ?? 0) + lines;
    if (lines <= fileBudget) continue;
    if (added.has(relativePath)) errors.push(`${relativePath} tiene ${lines} líneas (tope ${fileBudget})`);
    else warnings.push(`${relativePath} tiene ${lines} líneas`);
  }
  for (const [name, lines] of Object.entries(moduleLines)) {
    if (lines <= moduleBudget) continue;
    const message = `módulo ${name} tiene ${lines} líneas (tope ${moduleBudget})`;
    const touched = [...touchedModules].some((file) => file.startsWith(`apps/api/src/modules/${name}/`));
    if (touched) errors.push(message);
    else warnings.push(`módulo ${name} tiene ${lines} líneas`);
  }
  if (!existsSync(join(root, ".size-limit.json"))) errors.push("falta .size-limit.json");
  return { errors, warnings };
}

function selfTest() {
  const baseRefName = ["GITHUB", "BASE", "REF"].join("_");
  const previousBase = process.env[baseRefName];
  delete process.env[baseRefName];
  const root = mkdtempSync(join(tmpdir(), "size-"));
  try {
    writeFileSync(join(root, "quality-gates.json"), JSON.stringify({ fileLineBudget: 3, moduleLineBudget: 3 }), "utf8");
    writeFileSync(join(root, ".size-limit.json"), '[{"name":"web initial","path":"apps/web/dist/assets/*.js","limit":"500 kB"}]\n', "utf8");
    const dir = join(root, "apps", "api", "src", "modules", "auth");
    execFileSync("mkdir", ["-p", dir]);
    writeFileSync(join(dir, "old.ts"), "export const a = 1;\nexport const b = 2;\nexport const c = 3;\nexport const d = 4;\n", "utf8");
    const warned = reviewSize(root);
    if (warned.errors.length || warned.warnings.length === 0) {
      console.error("un archivo viejo por encima del tope tiene que avisar, no fallar");
      process.exit(1);
    }
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["-c", "user.email=a@b.c", "-c", "user.name=t", "commit", "-qm", "base"], { cwd: root });
    writeFileSync(join(dir, "new.ts"), "export const a = 1;\nexport const b = 2;\nexport const c = 3;\nexport const d = 4;\n", "utf8");
    execFileSync("git", ["add", "apps/api/src/modules/auth/new.ts"], { cwd: root });
    const failed = reviewSize(root);
    if (!failed.errors.some((line) => line.includes("new.ts"))) {
      console.error("un archivo nuevo por encima del tope tiene que ser error");
      process.exit(1);
    }
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["-c", "user.email=a@b.c", "-c", "user.name=t", "commit", "-qm", "new"], { cwd: root });
    const committed = reviewSize(root);
    if (!committed.errors.some((line) => line.includes("new.ts"))) {
      console.error("un archivo nuevo ya commiteado por encima del tope tiene que ser error");
      process.exit(1);
    }
    if (!committed.errors.some((line) => line.includes("módulo auth"))) {
      console.error("un módulo que el diff empuja sobre el presupuesto tiene que ser error");
      process.exit(1);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
    if (previousBase === undefined) delete process.env[baseRefName];
    else process.env[baseRefName] = previousBase;
  }
  const limit = readFileSync(join(referenceRoot, ".size-limit.json"), "utf8");
  if (!limit.includes("web initial") || !limit.includes("apps/web/dist")) {
    console.error(".size-limit.json no cubre el bundle inicial");
    process.exit(1);
  }
  const live = reviewSize(referenceRoot);
  if (live.errors.length) {
    console.error(live.errors.join("\n"));
    process.exit(1);
  }
  console.log("check-size-budget self-test ok");
}

function enforceBundle(root) {
  if (!existsSync(join(root, "apps", "web", "dist"))) return;
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (pkg.devDependencies?.["size-limit"] !== "14.3.0") {
    console.error("size-limit tiene que ser 14.3.0");
    process.exit(1);
  }
  const local = join(root, "node_modules", "size-limit", "bin.js");
  const result = existsSync(local)
    ? spawnSync(process.execPath, [local], { cwd: root, encoding: "utf8" })
    : spawnSync("pnpm", ["exec", "size-limit"], { cwd: root, encoding: "utf8" });
  if ((result.status ?? 1) !== 0) {
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(result.status || 1);
  }
}

if (process.argv.includes("--self-test")) selfTest();
else {
  const root = process.cwd();
  const live = reviewSize(root);
  for (const warning of live.warnings) console.log(`warn ${warning}`);
  if (live.errors.length) {
    console.error(live.errors.join("\n"));
    process.exit(1);
  }
  enforceBundle(root);
  console.log("check-size-budget ok");
}
