/**
 * Size budgets. An existing file over the line budget warns. A file that is
 * new in the diff and over the budget is an error. size-limit covers the
 * initial web bundle when apps/web/dist exists; the config is always required.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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

function changed(root) {
  try {
    const stdout = execFileSync("git", ["diff", "--name-only", "--diff-filter=A", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return new Set(stdout.split("\n").map((line) => line.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
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
  const added = changed(root);
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
    if (lines > moduleBudget) warnings.push(`módulo ${name} tiene ${lines} líneas`);
  }
  if (!existsSync(join(root, ".size-limit.json"))) errors.push("falta .size-limit.json");
  return { errors, warnings };
}

function selfTest() {
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
  } finally {
    rmSync(root, { recursive: true, force: true });
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

if (process.argv.includes("--self-test")) selfTest();
else {
  const live = reviewSize(process.cwd());
  for (const warning of live.warnings) console.log(`warn ${warning}`);
  if (live.errors.length) {
    console.error(live.errors.join("\n"));
    process.exit(1);
  }
  console.log("check-size-budget ok");
}
