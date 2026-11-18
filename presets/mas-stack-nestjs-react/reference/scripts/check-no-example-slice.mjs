import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skip = new Set(["node_modules", "dist", "generated", ".git"]);
const note = "not" + "es";
const widget = "wid" + "gets";
const forbidden = new RegExp(
  `@example\\.com\\b|\\b${note}\\b|\\b${widget}\\b|replace-example-slice|model Note\\b|model Widget\\b`,
  "i",
);

function files(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name) || name === "pnpm-lock.yaml") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, acc);
    else if (/\.(ts|tsx|mjs|js|json|sql|prisma|md|yml|yaml)$/.test(name)) acc.push(path);
  }
  return acc;
}

const hits = [];
for (const file of files(root)) {
  if (file.endsWith("check-no-example-slice.mjs")) continue;
  const rel = relative(root, file);
  const text = readFileSync(file, "utf8");
  if (forbidden.test(rel) || forbidden.test(text)) hits.push(rel);
}
if (hits.length > 0) {
  console.error("example slice or example.com account found:");
  for (const hit of hits) console.error(hit);
  process.exit(1);
}
console.log("no example slice");
