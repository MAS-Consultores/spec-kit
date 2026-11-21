/**
 * One-time baseline generator for the screens in fidelity-map.json.
 * Run locally when a screen opts in. CI compares; it does not refresh baselines.
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  ["--filter", "@demo/web", "exec", "playwright", "test", "--config", "playwright.visual.config.ts", "--update-snapshots"],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
