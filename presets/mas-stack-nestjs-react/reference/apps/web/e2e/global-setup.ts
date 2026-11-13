import { execFileSync } from "node:child_process";

export default function globalSetup(): void {
  const seed = process.env["SEED_DATABASE_URL"];
  if (!seed) {
    throw new Error("SEED_DATABASE_URL is required for Playwright global setup");
  }
  execFileSync("node", ["scripts/truncate-e2e.mjs"], {
    cwd: new URL("../../..", import.meta.url).pathname,
    stdio: "inherit",
    env: process.env,
  });
  execFileSync("pnpm", ["--filter", "@demo/api", "exec", "prisma", "db", "seed"], {
    cwd: new URL("../../..", import.meta.url).pathname,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `${seed}_not_the_e2e_database` },
  });
}
