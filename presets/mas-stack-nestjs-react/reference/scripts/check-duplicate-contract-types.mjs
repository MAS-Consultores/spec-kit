/**
 * Fails when an app file declares a type or interface whose name is already
 * exported from packages/contracts.
 *
 * Usage: node scripts/check-duplicate-contract-types.mjs [contractsDir] [appDir]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const contractsDir = process.argv[2] ?? "packages/contracts/src";
const appDir = process.argv[3] ?? "apps";

function files(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === "lint-fixtures" || name === "generated") continue;
      files(path, found);
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) found.push(path);
  }
  return found;
}

function typeNames(text) {
  const names = new Set();
  for (const match of text.matchAll(/export\s+(?:type|interface)\s+(\w+)/g)) names.add(match[1]);
  return names;
}

function declared(text) {
  const names = [];
  for (const match of text.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:type|interface)\s+(\w+)/g)) names.push(match[1]);
  return names;
}

const catalog = new Set();
for (const file of files(contractsDir)) {
  for (const name of typeNames(readFileSync(file, "utf8"))) catalog.add(name);
}

const hits = [];
for (const file of files(appDir)) {
  const text = readFileSync(file, "utf8");
  for (const name of declared(text)) {
    if (catalog.has(name)) hits.push(`${file} redeclares ${name}`);
  }
}

if (hits.length > 0) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log("contract types ok");
