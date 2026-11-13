import { readFileSync } from "node:fs";
import { join } from "node:path";

const lock = readFileSync(new URL("../pnpm-lock.yaml", import.meta.url), "utf8");
const bad = [];
for (const line of lock.split("\n")) {
  if (/-rc\.|-beta|-alpha|-canary|-next\.|-dev\./.test(line) && /@/.test(line)) {
    bad.push(line.trim());
  }
}
if (bad.length > 0) {
  console.error("ERROR: prerelease versions in the lockfile:");
  for (const line of bad.slice(0, 20)) console.error(line);
  process.exit(1);
}
const root = JSON.parse(readFileSync(join(new URL("..", import.meta.url).pathname, "package.json"), "utf8"));
if (!root.packageManager || root.packageManager.includes("-")) {
  console.error("ERROR: packageManager must be an exact stable pin");
  process.exit(1);
}
console.log("prerelease:check ok", root.packageManager);
