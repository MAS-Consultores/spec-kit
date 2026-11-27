/**
 * Falla si el diff del PR agrega una trampa a un gate.
 * Una línea en la sección "## Excepciones de gates" del cuerpo del PR
 * que nombre el archivo deja pasar ese archivo.
 *
 *   node scripts/check-gate-gaming.mjs --self-test
 *   node scripts/check-gate-gaming.mjs --base origin/main
 *
 * No mira este archivo ni scripts/fixtures/gate-gaming/.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveMergeBase } from "./lib/diff-base.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const DISABLE = /eslint-disable|oxlint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck/;
const SKIP = /\.(skip|only)\b|\bxit\s*\(|\bxdescribe\s*\(/;
const ENV_SPLIT = /process\.env\s*\[\s*\[|process\.env\s*\[[^\]]*\.join\s*\(|process\.env\s*\[[^\]]*\$\{|process\.env\s*\[[^\]]*?\+/;
const TEST_FILE = /\.(spec|test)\.[cm]?[jt]sx?$|\/e2e\//;
const CONFIG = /(^|\/)(quality-gates\.json|quality-baseline\.json|\.oxlintrc\.json|eslint\.config\.js|vitest\.config\.ts|stryker\.conf\.json|\.semgrepignore|\.jscpd\.json|jscpd\.json)$/;
const CEILING = /["']?(max-lines|max-params|max-depth|complexity|max)["']?\s*[:=]\s*(\d+)/g;
const FLOOR = /["']?(threshold|lines|statements|functions|branches|break)["']?\s*[:=]\s*(\d+)/g;

export function ignoredPath(file) {
  const normal = file.split("\\").join("/");
  return normal.endsWith("scripts/check-gate-gaming.mjs") || normal.includes("scripts/fixtures/gate-gaming/");
}

export function exceptionFiles(body) {
  const text = body ?? "";
  const start = text.indexOf("## Excepciones de gates");
  if (start === -1) return new Set();
  const rest = text.slice(start).split(/^## [^E]/m)[0] ?? "";
  const files = new Set();
  for (const token of rest.match(/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g) ?? []) files.add(token);
  return files;
}

function addedByFile(diffText) {
  const files = new Map();
  let file = "";
  for (const line of diffText.split("\n")) {
    const match = /^\+\+\+ b\/(.*)$/.exec(line);
    if (match) {
      file = match[1] ?? "";
      if (!files.has(file)) files.set(file, { added: [], removed: [] });
      continue;
    }
    if (!file || line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("@@") || line.startsWith("\\")) continue;
    if (line.startsWith("+")) files.get(file).added.push(line.slice(1));
    else if (line.startsWith("-")) files.get(file).removed.push(line.slice(1));
  }
  return files;
}

function numbers(lines, pattern) {
  const found = [];
  for (const line of lines) {
    pattern.lastIndex = 0;
    for (const match of line.matchAll(pattern)) found.push([match[1], Number(match[2])]);
  }
  return found;
}

function weaker(removed, added) {
  const hits = [];
  const ceilings = numbers(removed, CEILING);
  const floors = numbers(removed, FLOOR);
  for (const [key, value] of numbers(added, CEILING)) {
    const before = ceilings.filter(([name]) => name === key).map(([, number]) => number);
    if (before.length && value > Math.min(...before)) hits.push(`${key} ${Math.min(...before)} -> ${value}`);
  }
  for (const [key, value] of numbers(added, FLOOR)) {
    const before = floors.filter(([name]) => name === key).map(([, number]) => number);
    if (before.length && value < Math.max(...before)) hits.push(`${key} ${Math.max(...before)} -> ${value}`);
  }
  return hits;
}

export function findingsIn(diffText) {
  const findings = [];
  for (const [file, hunk] of addedByFile(diffText)) {
    if (!file || file === "/dev/null" || ignoredPath(file)) continue;
    for (const line of hunk.added) {
      if (DISABLE.test(line)) findings.push({ file, kind: "disable", detail: line.trim() });
      if (TEST_FILE.test(file) && SKIP.test(line)) findings.push({ file, kind: "skip", detail: line.trim() });
      if (ENV_SPLIT.test(line)) findings.push({ file, kind: "env", detail: line.trim() });
    }
    if (CONFIG.test(file)) {
      for (const change of weaker(hunk.removed, hunk.added)) findings.push({ file, kind: "threshold", detail: change });
      const removed = new Set(hunk.removed.map((line) => line.trim()));
      for (const line of hunk.added) {
        if (!/\b(exclude|ignore|ignorePatterns|ignores)\b/.test(line) && !file.endsWith(".semgrepignore")) continue;
        if (file.endsWith(".semgrepignore") && /^\s*(#|$)/.test(line)) continue;
        if (file.endsWith(".semgrepignore") || /\b(exclude|ignore|ignorePatterns|ignores)\b/.test(line)) {
          if (!removed.has(line.trim())) findings.push({ file, kind: "ignore", detail: line.trim() });
        }
      }
    }
  }
  return findings;
}

export function unwaived(diffText, body) {
  const allowed = exceptionFiles(body);
  return findingsIn(diffText).filter((finding) => ![...allowed].some((token) => finding.file.endsWith(token) || finding.file === token));
}

function report(findings) {
  for (const finding of findings) console.error(`gate gaming ${finding.kind} en ${finding.file}: ${finding.detail}`);
  if (findings.length) console.error("Justificalo en el PR, sección ## Excepciones de gates, con el archivo y el motivo. Si no, arregla la causa.");
}

function selfTest() {
  const dir = join(ROOT, "scripts/fixtures/gate-gaming");
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".diff")) continue;
    const diff = readFileSync(join(dir, name), "utf8");
    const body = name.endsWith(".justified.diff") ? readFileSync(join(dir, name.replace(/\.diff$/, ".md")), "utf8") : "";
    const found = unwaived(diff, body);
    const kind = { a: "disable", b: "skip", c: "threshold", d: "ignore", e: "env" }[name[0]];
    const expectFail = !name.endsWith(".justified.diff");
    if (expectFail && !found.some((finding) => finding.kind === kind)) {
      console.error(`self-test: ${name} debía fallar`);
      process.exit(1);
    }
    if (!expectFail && found.length !== 0) {
      console.error(`self-test: ${name} está justificado y falló`);
      console.error(found);
      process.exit(1);
    }
  }
  const own = findingsIn("diff --git a/scripts/check-gate-gaming.mjs b/scripts/check-gate-gaming.mjs\n--- a/scripts/check-gate-gaming.mjs\n+++ b/scripts/check-gate-gaming.mjs\n@@ -1 +1 @@\n+// eslint-disable\n");
  if (own.length !== 0) {
    console.error("self-test: el script no debe marcarse a sí mismo");
    process.exit(1);
  }
  console.log("check-gate-gaming self-test ok");
}

function gitRoot(root) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8" }).trim();
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked && process.argv.includes("--self-test")) selfTest();
else if (invoked) {
  const top = gitRoot(ROOT);
  const base = resolveMergeBase(top);
  if (!base) {
    console.error("check-gate-gaming: sin base para el diff");
    process.exit(1);
  }
  const prefix = relative(top, ROOT).split("\\").join("/");
  const diffText = execFileSync("git", ["diff", "-U0", base, "--", prefix || "."], { cwd: top, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const body = process.env.PR_BODY ?? "";
  const found = unwaived(diffText, body);
  report(found);
  if (found.length) process.exit(1);
  console.log("check-gate-gaming ok");
}
