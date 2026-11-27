/**
 * Every env name the app reads must appear in a committed .env.example.
 *
 * Scope is application code under apps/. scripts/ is harness and CI tooling.
 * A literal process.env.CI there is not product configuration and is not
 * required in .env.example. Inside apps/, the name has to be a literal
 * (process.env.NAME or process.env["NAME"]). Building it with join or with
 * a nested array hides the name from this check, so that form fails.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export function namesIn(text) {
  const found = new Set();
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /process\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
    /requiredEnv\(\s*["']([A-Z][A-Z0-9_]*)["']\s*\)/g,
    /\bsource\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
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

export function hidesEnvName(text) {
  return /process\.env\s*\[\s*\[/.test(text) || /process\.env\s*\[[^\]]*\.join\s*\(/.test(text);
}

function exampleKeys(root) {
  const keys = new Set();
  let foundFile = false;
  for (const file of EXAMPLE_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    foundFile = true;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=/);
      if (match?.[1]) keys.add(match[1]);
    }
  }
  return { foundFile, keys };
}

export function auditEnv(root) {
  const hidden = [];
  const read = new Set();
  const apps = join(root, "apps");
  for (const file of filesUnder(apps)) {
    const text = readFileSync(file, "utf8");
    if (hidesEnvName(text)) hidden.push(file);
    for (const name of namesIn(text)) read.add(name);
  }
  const documented = exampleKeys(root);
  const missing = [...read].filter((name) => !documented.keys.has(name)).sort();
  return { hidden, read, missing, foundFile: documented.foundFile };
}

function report(root) {
  const result = auditEnv(root);
  if (!result.foundFile) {
    console.error("missing .env.example");
    return 1;
  }
  for (const file of result.hidden) {
    console.error(`env name in ${file} must be a literal, not built from parts`);
  }
  for (const name of result.missing) {
    console.error(`env ${name} is read by the app and missing from .env.example`);
  }
  if (result.hidden.length > 0 || result.missing.length > 0) return 1;
  if (result.read.size === 0) {
    console.error("no env reads found");
    return 1;
  }
  console.log(`env-example ok (${String(result.read.size)} names)`);
  return 0;
}

function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "env-example-"));
  try {
    const appFile = join(root, "apps", "api", "src", "main.ts");
    const tool = join(root, "scripts", "harness.mjs");
    mkdirSync(join(root, "apps", "api", "src"), { recursive: true });
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(join(root, ".env.example"), "DATABASE_URL=postgresql://USER:PASSWORD@localhost/app\n", "utf8");
    writeFileSync(appFile, 'const url = process.env.DATABASE_URL;\nconst port = process.env["PORT"];\n', "utf8");
    writeFileSync(tool, 'const onCi = process.env.CI;\n', "utf8");
    const missing = auditEnv(root);
    if (missing.missing.includes("PORT") === false || missing.missing.includes("CI")) {
      console.error("self-test: PORT de la app tiene que faltar y CI de tooling no");
      process.exit(1);
    }
    writeFileSync(appFile, "const url = process.env.DATABASE_URL;\n", "utf8");
    const tooling = auditEnv(root);
    if (tooling.missing.length !== 0 || tooling.hidden.length !== 0) {
      console.error("self-test: process.env.CI en scripts/ no es configuración de la app");
      process.exit(1);
    }
    writeFileSync(appFile, 'const url = process.env.DATABASE_URL;\nconst flag = process.env[["C", "I"].join("")];\n', "utf8");
    const split = auditEnv(root);
    if (split.hidden.length !== 1) {
      console.error("self-test: un nombre armado por partes en apps/ tiene que fallar");
      process.exit(1);
    }
    console.log("check-env-example self-test ok");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly && process.argv.includes("--self-test")) selfTest();
else if (invokedDirectly) process.exit(report(process.cwd()));
