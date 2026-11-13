import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "generated") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (/\.(test|spec|e2e)\.ts$/.test(name)) acc.push(path);
  }
  return acc;
}
const bad = [];
for (const file of walk(root)) {
  const text = readFileSync(file, "utf8");
  if (/\b(it|test|describe)\.skip\b|\bxit\b|\bxdescribe\b|\.todo\(/.test(text)) {
    bad.push(file);
  }
}
if (bad.length > 0) {
  console.error("ERROR: skipped tests are forbidden:");
  for (const file of bad) console.error(file);
  process.exit(1);
}
console.log("skips:check ok");
