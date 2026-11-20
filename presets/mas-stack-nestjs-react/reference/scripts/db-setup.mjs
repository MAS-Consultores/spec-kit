/**
 * Migrate DATABASE_URL, then seed.
 * When SEED_DATABASE_URL is set, also migrate that database first (it must differ).
 * When it is unset, seed uses DATABASE_URL only for a loopback host.
 */
import { spawnSync } from "node:child_process";

function run(args, env) {
  const result = spawnSync("pnpm", args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["db:migrate"], process.env);

const seed = process.env.SEED_DATABASE_URL;
if (typeof seed === "string" && seed.trim() !== "") {
  run(["--filter", "@demo/api", "exec", "prisma", "migrate", "deploy"], {
    ...process.env,
    DATABASE_URL: seed,
  });
}

run(["db:seed"], process.env);
