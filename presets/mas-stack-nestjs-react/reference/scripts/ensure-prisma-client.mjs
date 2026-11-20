/**
 * `pnpm lint` typechecks imports of the generated Prisma client.
 * Generate it first so a clean tree does not fail with hundreds of missing-module errors.
 * Generate does not open a connection. A placeholder URL is only for this child
 * when DATABASE_URL is unset; migrate still refuses a blank URL.
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env };
const current = env["DATABASE_URL"];
if (typeof current !== "string" || current.trim() === "") {
  env["DATABASE_URL"] = "postgresql://127.0.0.1:5432/unused";
}

const result = spawnSync("pnpm", ["--filter", "@demo/api", "exec", "prisma", "generate"], {
  stdio: "inherit",
  env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
