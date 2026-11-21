/**
 * Promotes adoption-rule warnings to errors on lines added in the diff.
 * Existing code stays at warn. New or modified lines fail the check.
 *
 *   node scripts/check-diff-quality.mjs --self-test
 *   node scripts/check-diff-quality.mjs --base origin/main
 *   node scripts/check-diff-quality.mjs --print-base
 *
 * The diff base is the merge-base of HEAD and the PR base. Resolution order:
 * `--base`, then `GITHUB_BASE_REF` (`origin/<ref>` and the ref itself), then
 * `origin/main`, `origin/master`, then the first parent `HEAD^`. A CI checkout
 * needs enough history to compute that merge-base (see
 * `.github/workflows/diff-quality.yml`, `fetch-depth: 0`).
 *
 * Paso a error total: en eslint.config.js sube las reglas de ADOPTION_RULES
 * de "warn" a "error", bórralas de la lista y deja de depender del diff.
 * Documentado en docs/quality-loop.md del preset.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { relative, resolve } from "node:path";

export const ADOPTION_RULES = ["no-magic-numbers", "mas/no-commented-code", "mas/no-hidden-service-deps"];

export function candidateRefs(argv, env) {
  const baseFlag = argv.indexOf("--base");
  const explicit = baseFlag === -1 ? "" : (argv[baseFlag + 1] ?? "");
  const fallback = [];
  const githubBase = env.GITHUB_BASE_REF ?? "";
  if (explicit) fallback.push(explicit);
  if (githubBase) fallback.push(`origin/${githubBase}`, githubBase);
  fallback.push("origin/main", "origin/master", "HEAD^");
  return [...new Set(fallback.filter(Boolean))];
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

export function resolveMergeBase(cwd, argv = process.argv, env = process.env) {
  for (const ref of candidateRefs(argv, env)) {
    try {
      git(cwd, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    } catch {
      continue;
    }
    try {
      return git(cwd, ["merge-base", "HEAD", ref]);
    } catch {
      continue;
    }
  }
  return null;
}

export function overrideGitDir(env = process.env) {
  const name = ["QUALITY", "GIT", "DIR"].join("_");
  return env[name] || "";
}

function gitCwd(root) {
  const override = overrideGitDir();
  if (override) return override;
  return git(root, ["rev-parse", "--show-toplevel"]);
}

export function addedLineMap(diffText) {
  const map = new Map();
  let file = "";
  let newLine = 0;
  for (const line of diffText.split("\n")) {
    const fileMatch = /^\+\+\+ b\/(.*)$/.exec(line);
    if (fileMatch) {
      file = fileMatch[1] ?? "";
      if (!map.has(file)) map.set(file, new Set());
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (!file || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) continue;
    if (line.startsWith("+")) {
      map.get(file)?.add(newLine);
      newLine += 1;
      continue;
    }
    if (line.startsWith("-")) continue;
    if (line.startsWith("\\")) continue;
    newLine += 1;
  }
  return map;
}

export function findingsOnAddedLines(messages, added, rules = ADOPTION_RULES) {
  return messages.filter(
    (message) =>
      rules.includes(message.ruleId) &&
      (message.severity === 1 || message.severity === 2) &&
      added.has(message.line),
  );
}

function selfTest() {
  const added = new Set([4]);
  const warned = [{ ruleId: "no-magic-numbers", severity: 1, line: 4, message: "magic" }];
  const oldLine = [{ ruleId: "no-magic-numbers", severity: 1, line: 2, message: "magic" }];
  const other = [{ ruleId: "no-console", severity: 2, line: 4, message: "console" }];
  if (findingsOnAddedLines(warned, added).length !== 1) {
    console.error("self-test: una línea nueva con no-magic-numbers debe fallar");
    process.exit(1);
  }
  if (findingsOnAddedLines(oldLine, added).length !== 0) {
    console.error("self-test: un warning en una línea que no cambió no es hallazgo nuevo");
    process.exit(1);
  }
  if (findingsOnAddedLines(other, added).length !== 0) {
    console.error("self-test: una regla fuera de adopción no entra al diff");
    process.exit(1);
  }
  const hidden = [{ ruleId: "mas/no-hidden-service-deps", severity: 1, line: 4, message: "Clock" }];
  if (findingsOnAddedLines(hidden, added).length !== 1) {
    console.error("self-test: Date.now() en una línea nueva es hallazgo de adopción");
    process.exit(1);
  }
  const parsed = addedLineMap("diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1,2 +1,3 @@\n keep\n-old\n+const wait = 15;\n");
  if (!parsed.get("a.ts")?.has(2)) {
    console.error("self-test: el parser no marcó la línea agregada");
    process.exit(1);
  }
  console.log("check-diff-quality self-test ok");
}

async function lintDiff() {
  const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const gitRoot = gitCwd(root);
  const prefix = overrideGitDir() ? "" : relative(gitRoot, root);
  if (process.argv.includes("--print-base")) {
    console.log(resolveMergeBase(gitRoot) ?? "NONE");
    return;
  }
  const base = resolveMergeBase(gitRoot);
  let diffText = "";
  if (base) {
    try {
      diffText = execFileSync("git", ["diff", "-U0", base, "--", prefix || "."], {
        cwd: gitRoot,
        encoding: "utf8",
      });
    } catch (error) {
      const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
      diffText = stdout;
    }
  }
  const map = addedLineMap(diffText);
  if (prefix) {
    for (const file of [...map.keys()]) {
      if (!file.startsWith(`${prefix}/`)) {
        map.delete(file);
        continue;
      }
      const local = file.slice(prefix.length + 1);
      map.set(local, map.get(file) ?? new Set());
      map.delete(file);
    }
  }
  const files = [...map.keys()].filter(
    (file) =>
      /\.(ts|tsx|js|mjs)$/.test(file) &&
      !file.includes("lint-fixtures/") &&
      !file.includes("scripts/") &&
      (map.get(file)?.size ?? 0) > 0,
  );
  if (files.length === 0) {
    console.log("check-diff-quality: sin líneas nuevas de producto");
    return;
  }
  const { ESLint } = await import("eslint");
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintFiles(files);
  const problems = [];
  for (const result of results) {
    const relativePath = result.filePath.startsWith(`${root}/`) ? result.filePath.slice(root.length + 1) : result.filePath;
    const added = map.get(relativePath) ?? map.get(result.filePath) ?? new Set();
    for (const hit of findingsOnAddedLines(result.messages, added)) {
      problems.push(`${relativePath}:${hit.line} ${hit.ruleId} ${hit.message}`);
    }
  }
  if (problems.length > 0) {
    console.error("código nuevo o modificado con reglas de adopción (warn en lo viejo, error en el diff):");
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log("check-diff-quality ok");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.argv.includes("--self-test")) selfTest();
  else await lintDiff();
}
