import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url);
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "generated") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else acc.push(path);
  }
  return acc;
}
const failures = [];
const files = walk(new URL(root).pathname);
for (const file of files) {
  if (file.includes(`${join("src", "src")}`)) failures.push(`invalid path ${file}`);
  if (!file.endsWith(".ts") && !file.endsWith(".tsx") && !file.endsWith(".json")) continue;
  const text = readFileSync(file, "utf8");
  if (text.includes('from "cn"') || text.includes("from 'cn'")) failures.push(`import from cn in ${file}`);
  if (text.includes("src/src")) failures.push(`src/src in ${file}`);
}
for (const file of files.filter((item) => item.endsWith("components.json"))) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  const aliases = json.aliases ?? {};
  const values = Object.values(aliases).join(" ");
  if (!values.includes("@demo/ui")) failures.push(`${file} aliases must point at @demo/ui`);
}
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  console.error("ERROR: shadcn output is invalid. init/add must be non-interactive (--yes) with a prebuilt components.json.");
  process.exit(1);
}
console.log("shadcn:check ok");
