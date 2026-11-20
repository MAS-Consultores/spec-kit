import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function flatten(value, prefix, out) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix === "" ? key : `${prefix}.${key}`, out);
    }
    return;
  }
  if (prefix !== "") out.add(prefix);
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (path.endsWith(".ts") || path.endsWith(".tsx")) acc.push(path);
  }
  return acc;
}

function localeKeys(dir) {
  const files = readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  const bundles = new Map();
  for (const name of files) {
    const keys = new Set();
    flatten(JSON.parse(readFileSync(join(dir, name), "utf8")), "", keys);
    bundles.set(name, keys);
  }
  return bundles;
}

function referencedKeys(files) {
  const used = new Set();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/\bt\(\s*["']([^"']+)["']/g)) used.add(match[1]);
    for (const match of text.matchAll(/\blabelKey\s*[:=]\s*["']([^"']+)["']/g)) used.add(match[1]);
    for (const match of text.matchAll(/\bi18nKey\s*:\s*["']([^"']+)["']/g)) used.add(match[1]);
  }
  return used;
}

export function auditLocales(localesDir, sourceDir) {
  const sourceDirs = Array.isArray(sourceDir) ? sourceDir : [sourceDir];
  const errors = [];
  if (!existsSync(localesDir)) {
    errors.push(`${localesDir}: no locales directory`);
    return errors;
  }
  const bundles = localeKeys(localesDir);
  const union = new Set();
  for (const keys of bundles.values()) {
    for (const key of keys) union.add(key);
  }
  for (const [name, keys] of bundles) {
    for (const key of union) {
      if (!keys.has(key)) errors.push(`${name}: missing key ${key}`);
    }
  }
  const used = referencedKeys(sourceDirs.flatMap((dir) => walk(dir)));
  for (const key of used) {
    for (const [name, keys] of bundles) {
      if (!keys.has(key)) errors.push(`${name}: missing key ${key} referenced in source`);
    }
  }
  for (const key of union) {
    if (!used.has(key)) errors.push(`orphan key ${key}`);
  }
  return errors;
}

function fixtureRoot() {
  return new URL("./i18n-fixtures/", import.meta.url).pathname;
}

function runFixtures() {
  const expected = [
    { dir: "pass", ok: true },
    { dir: "missing", ok: false, includes: "missing key" },
    { dir: "orphan", ok: false, includes: "orphan key" },
    { dir: "gap", ok: false, includes: "missing key" },
  ];
  let failed = false;
  for (const item of expected) {
    const root = join(fixtureRoot(), item.dir);
    const errors = auditLocales(join(root, "locales"), join(root, "src"));
    const hit = errors.some((line) => item.includes === undefined || line.includes(item.includes));
    if (item.ok && errors.length > 0) {
      failed = true;
      console.error(`i18n fixture ${item.dir} should pass`);
      for (const line of errors) console.error(`  ${line}`);
    } else if (!item.ok && !hit) {
      failed = true;
      console.error(`i18n fixture ${item.dir} missed ${item.includes}`);
      for (const line of errors) console.error(`  ${line}`);
    } else {
      console.log(`i18n fixture ok ${item.dir}`);
    }
  }
  return failed;
}

const webSrc = new URL("../apps/web/src/", import.meta.url).pathname;
const contractsSrc = new URL("../packages/contracts/src/", import.meta.url).pathname;
const project = auditLocales(join(webSrc, "locales"), [webSrc, contractsSrc]);
const template = readFileSync(new URL("../templates/i18n-login.spec.ts", import.meta.url), "utf8");
if (!template.includes("RESPOND_MS") || template.includes("page.screenshot") || template.includes("toHaveScreenshot")) {
  project.push("templates/i18n-login.spec.ts must assert a response budget and must not take screenshots");
}
if (project.length > 0 || runFixtures()) {
  for (const line of project) console.error(line);
  process.exit(1);
}
console.log("i18n:check ok");
