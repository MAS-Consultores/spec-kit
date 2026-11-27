/**
 * pnpm gen module <domain>
 * pnpm gen page <feature> <page>
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [kind, ...rest] = process.argv.slice(2);
const script = kind === "module" ? "gen-module.mjs" : kind === "page" ? "gen-page.mjs" : "";
if (!script) {
  console.error("usage: pnpm gen module <domain> | pnpm gen page <feature> <page>");
  process.exit(1);
}
const result = spawnSync(process.execPath, [join(here, script), ...rest], { stdio: "inherit" });
process.exit(result.status ?? 1);
