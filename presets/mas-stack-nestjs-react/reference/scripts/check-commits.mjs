/**
 * Conventional Commits for the pull request: commitlint from the merge base
 * through HEAD, plus the pull request title when `--title` is set.
 * The base comes from scripts/lib/diff-base.mjs. A missing base is a failure.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveMergeBase } from "./lib/diff-base.mjs";

const cwd = process.cwd();
const base = resolveMergeBase(cwd);
if (!base) {
  console.error("no se pudo calcular la base del diff (merge-base)");
  process.exit(1);
}

execFileSync("pnpm", ["exec", "commitlint", "--from", base, "--to", "HEAD"], {
  cwd,
  stdio: "inherit",
});

const titleFlag = process.argv.indexOf("--title");
const title = titleFlag === -1 ? "" : (process.argv[titleFlag + 1] ?? "");
if (title) {
  const dir = mkdtempSync(join(tmpdir(), "pr-title-"));
  const file = join(dir, "title.txt");
  writeFileSync(file, `${title}\n`);
  execFileSync("pnpm", ["exec", "commitlint", "--edit", file], {
    cwd,
    stdio: "inherit",
  });
}
