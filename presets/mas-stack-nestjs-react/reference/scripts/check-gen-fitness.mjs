/**
 * Generate two throwaway domains, prove they compile, then delete them.
 * The diff may only add those domains plus the registration lines.
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const domains = ["alpha", "beta"];
const fitnessDomainsPath = join(root, "scripts", ".fitness-domains");

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function output(command, args) {
  return execFileSync(command, args, { cwd: root, encoding: "utf8" });
}

run("git", ["add", "-A"]);
run("git", ["commit", "-m", "fitness snapshot", "--allow-empty", "--no-verify"]);

try {
  for (const domain of domains) run("node", ["scripts/gen-module.mjs", domain]);
  writeFileSync(fitnessDomainsPath, `${domains.join("\n")}\n`);
  run("pnpm", ["db:generate"]);
  run("pnpm", ["lint"]);
  rmSync(fitnessDomainsPath, { force: true });
  run("pnpm", ["typecheck"]);
  run("pnpm", ["test"]);
  run("pnpm", ["build"]);
  run("git", ["add", "-A"]);
  const names = output("git", ["diff", "--cached", "--name-only", "HEAD"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const allowed = (file) =>
    domains.some((domain) => {
      const prefixes = [
        `apps/api/src/modules/${domain}/`,
        `apps/web/src/features/${domain}/`,
        `packages/contracts/src/${domain}/`,
        `apps/api/prisma/schema/${domain}.prisma`,
      ];
      return prefixes.some((prefix) => file === prefix || file.startsWith(prefix));
    }) ||
    file === "apps/api/src/app.module.ts" ||
    file === "apps/web/src/feature-routes.ts" ||
    file === "eslint/model-ownership.js" ||
    file.startsWith("apps/api/src/generated/prisma/");
  const unexpected = names.filter((file) => !allowed(file));
  if (unexpected.length > 0) {
    console.error("generator touched files outside the new domains and the registration lines:");
    for (const file of unexpected) console.error(file);
    process.exit(1);
  }
  if (names.length === 0) {
    console.error("generator produced an empty diff");
    process.exit(1);
  }
  console.log(`fitness diff ok (${names.length} paths)`);
} finally {
  rmSync(fitnessDomainsPath, { force: true });
  execFileSync("git", ["reset", "--hard", "HEAD"], { cwd: root, stdio: "inherit" });
  execFileSync("git", ["clean", "-fd", "-e", "node_modules", "-e", "apps/api/src/generated"], {
    cwd: root,
    stdio: "inherit",
  });
}

for (const domain of domains) {
  for (const path of [
    join(root, "apps/api/src/modules", domain),
    join(root, "apps/web/src/features", domain),
    join(root, "packages/contracts/src", domain),
    join(root, "apps/api/prisma/schema", `${domain}.prisma`),
  ]) {
    if (existsSync(path)) {
      console.error(`throwaway domain left behind: ${path}`);
      process.exit(1);
    }
  }
}
console.log("gen fitness ok");
