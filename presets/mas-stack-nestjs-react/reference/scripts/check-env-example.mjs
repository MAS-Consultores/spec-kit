/**
 * Every env name the app reads must appear in a committed .env.example.
 * Scans apps/ and scripts/ for process.env dot access, process.env index
 * access, requiredEnv calls, and env index access. Names are uppercase.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["apps", "scripts"];
const EXAMPLE_FILES = [".env.example", "apps/api/.env.example"];
const SKIP_DIRS = new Set(["node_modules", "dist", "generated", "coverage"]);

function filesUnder(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      filesUnder(path, acc);
    } else if (/\.(ts|tsx|mjs|js|cjs)$/.test(name)) {
      acc.push(path);
    }
  }
  return acc;
}

function namesIn(text) {
  const found = new Set();
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /process\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
    /requiredEnv\(\s*["']([A-Z][A-Z0-9_]*)["']\s*\)/g,
    /(?<!process\.)env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1];
      if (name) found.add(name);
    }
  }
  return found;
}

function exampleKeys() {
  const keys = new Set();
  let foundFile = false;
  for (const file of EXAMPLE_FILES) {
    if (!existsSync(file)) continue;
    foundFile = true;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=/);
      if (match?.[1]) keys.add(match[1]);
    }
  }
  if (!foundFile) {
    console.error("missing .env.example");
    process.exit(1);
  }
  return keys;
}

const read = new Set();
for (const root of ROOTS) {
  for (const file of filesUnder(root)) {
    for (const name of namesIn(readFileSync(file, "utf8"))) read.add(name);
  }
}

const documented = exampleKeys();
const missing = [...read].filter((name) => !documented.has(name)).sort();
if (missing.length > 0) {
  for (const name of missing) console.error(`env ${name} is read by the app and missing from .env.example`);
  process.exit(1);
}
if (read.size === 0) {
  console.error("no env reads found");
  process.exit(1);
}
console.log(`env-example ok (${String(read.size)} names)`);
