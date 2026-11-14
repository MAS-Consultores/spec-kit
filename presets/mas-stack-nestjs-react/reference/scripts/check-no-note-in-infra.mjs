import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chdir } from "node:process";

chdir(join(dirname(fileURLToPath(import.meta.url)), ".."));

/**
 * Infrastructure must not mention the example slice.
 * Feature code lives under modules/, mcp tools, slices.ts, slice-seed, contracts, and e2e specs.
 */
const ROOTS = [
  "apps/api/src/auth",
  "apps/api/src/health.controller.ts",
  "apps/api/src/http.ts",
  "apps/api/src/env.ts",
  "apps/api/src/main.ts",
  "apps/api/src/prisma.service.ts",
  "apps/api/src/app.module.ts",
  "apps/api/src/mcp/token-verifier.ts",
  "apps/api/prisma/seed.ts",
  "apps/api/prisma.config.ts",
  "apps/api/prisma/database-url.mjs",
  "scripts/truncate-e2e.mjs",
  "scripts/ensure-postgres.sh",
];

const FORBIDDEN = /(?<![A-Za-z0-9_])(?:notes:|Note|note)(?![A-Za-z0-9_])/g;

function filesOf(path, acc = []) {
  const info = statSync(path);
  if (info.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (name === "node_modules" || name === "generated" || name === "dist") continue;
      filesOf(join(path, name), acc);
    }
    return acc;
  }
  if (/\.(ts|mjs|js|sh|md)$/.test(path)) acc.push(path);
  return acc;
}

const hits = [];
for (const root of ROOTS) {
  let entries;
  try {
    entries = filesOf(root);
  } catch {
    hits.push(`${root}: missing`);
    continue;
  }
  for (const file of entries) {
    const text = readFileSync(file, "utf8");
    const matches = text.match(FORBIDDEN);
    if (matches) hits.push(`${file}: ${matches.join(", ")}`);
  }
}
if (hits.length > 0) {
  console.error("infrastructure references the example slice:");
  for (const hit of hits) console.error(hit);
  process.exit(1);
}
console.log("infrastructure has no example-slice references");
