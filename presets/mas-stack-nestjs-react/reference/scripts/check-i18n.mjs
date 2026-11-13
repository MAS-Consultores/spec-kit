import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../apps/web/src", import.meta.url).pathname;
const messages = JSON.parse(readFileSync(join(root, "locales/es-CL.json"), "utf8"));
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (path.endsWith(".ts") || path.endsWith(".tsx")) acc.push(path);
  }
  return acc;
}
const missing = [];
for (const file of walk(root)) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/\bt\(\s*["']([^"']+)["']/g)) {
    const key = match[1];
    if (!(key in messages)) missing.push(`${file}: missing es-CL key ${key}`);
  }
}
if (missing.length > 0) {
  for (const item of missing) console.error(item);
  process.exit(1);
}
console.log("i18n:check ok");
