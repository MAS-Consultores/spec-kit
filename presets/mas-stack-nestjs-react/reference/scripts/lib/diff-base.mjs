/**
 * Merge-base of HEAD and the PR base.
 * Order: `--base`, `GITHUB_BASE_REF` (`origin/<ref>` and the ref), `origin/HEAD`,
 * `origin/main`, `origin/master`, then `HEAD^`.
 */
import { execFileSync } from "node:child_process";

export class GitDiffError extends Error {
  constructor(message, stderr = "") {
    super(message);
    this.name = "GitDiffError";
    this.stderr = stderr;
  }
}

export function candidateRefs(argv, env) {
  const baseFlag = argv.indexOf("--base");
  const explicit = baseFlag === -1 ? "" : (argv[baseFlag + 1] ?? "");
  const fallback = [];
  const githubBase = env.GITHUB_BASE_REF ?? "";
  if (explicit) fallback.push(explicit);
  if (githubBase) fallback.push(`origin/${githubBase}`, githubBase);
  fallback.push("origin/HEAD", "origin/main", "origin/master", "HEAD^");
  return [...new Set(fallback.filter(Boolean))];
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
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

export function diffNames(cwd, ref, filter) {
  try {
    const stdout = execFileSync("git", ["diff", "--name-only", `--diff-filter=${filter}`, ref], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch (error) {
    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr ?? "") : "";
    throw new GitDiffError(`git diff ${ref} falló`, stderr.trim());
  }
}

/** Uncommitted names (`git diff HEAD`) plus names since the PR merge-base. */
export function changedSinceBase(cwd, filter, argv = process.argv, env = process.env) {
  const names = new Set(diffNames(cwd, "HEAD", filter));
  const base = resolveMergeBase(cwd, argv, env);
  if (!base) throw new GitDiffError("sin base para el diff");
  for (const name of diffNames(cwd, base, filter)) names.add(name);
  return names;
}
