/**
 * Knip treats the git root as the project. The skeleton is linted both from
 * this folder and from a generated tree where this folder is nested, so a
 * temporary git root keeps the report on this package.
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8" }).trim();
const nested = join(root, ".git");
const created = top !== root.replace(/\/$/, "");
if (created) execFileSync("git", ["init", "-q"], { cwd: root });

try {
  execFileSync("pnpm", ["exec", "knip"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://user:pass@127.0.0.1:5432/demo",
    },
  });
} finally {
  if (created && existsSync(nested)) rmSync(nested, { recursive: true, force: true });
}
