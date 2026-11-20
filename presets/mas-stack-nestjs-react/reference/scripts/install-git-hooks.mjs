/**
 * Points core.hooksPath at .githooks only when this skeleton is the git root
 * (a project created by specify init). A checkout nested in another repo is left alone.
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let top = "";
try {
  top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8" }).trim();
} catch {
  process.exit(0);
}

if (resolve(top) !== root) {
  console.log("git hooks skipped: this checkout is not the skeleton root");
  process.exit(0);
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root });
console.log("pre-commit hook installed");
