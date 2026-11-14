import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const rootDir = new URL("..", import.meta.url).pathname;
const prerelease = /-rc\.|-beta|-alpha|-canary|-next\.|-dev\./;
const names = new Set();
const bad = [];

function readPackage(file) {
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const block = manifest[field];
    if (!block || typeof block !== "object") continue;
    for (const [name, version] of Object.entries(block)) {
      names.add(name);
      if (typeof version === "string" && prerelease.test(version)) {
        bad.push(`${file} ${name}@${version}`);
      }
    }
  }
  return manifest;
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (entry === "package.json") readPackage(full);
  }
}

const root = readPackage(join(rootDir, "package.json"));
walk(join(rootDir, "apps"));
walk(join(rootDir, "packages"));
walk(join(rootDir, "scripts"));
if (!root.packageManager || prerelease.test(root.packageManager)) {
  bad.push(`packageManager ${root.packageManager}`);
}
const lock = readFileSync(join(rootDir, "pnpm-lock.yaml"), "utf8");
for (const line of lock.split("\n")) {
  const match = line.match(/^\s{2}'?(@?[^@'\s]+)@([^':]+)'?:/);
  if (!match) continue;
  const [, name, version] = match;
  if (names.has(name) && prerelease.test(version)) {
    bad.push(`lock ${name}@${version}`);
  }
}
if (bad.length > 0) {
  console.error("ERROR: a direct dependency resolves to a prerelease:");
  for (const line of bad) console.error(line);
  process.exit(1);
}
console.log("prerelease:check ok", root.packageManager);
