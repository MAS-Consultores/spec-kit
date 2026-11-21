/**
 * Product knobs for quality gates. Missing file means the skeleton defaults.
 * quality-gates.json:
 *   componentRoots: directories of web components (a missing directory is skipped)
 *   jscpdSkipScripts: script filenames allowed to pass --skip-jscpd-ratchet
 * knip.product.json merges ignore, ignoreDependencies, and ignoreBinaries.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function loadQualityGates(root) {
  const path = join(root, "quality-gates.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

export function resolveComponentRoots(root) {
  const configured = loadQualityGates(root).componentRoots ?? ["apps/web/src"];
  return configured.filter((relativePath) => {
    const absolute = join(root, relativePath);
    return existsSync(absolute) && statSync(absolute).isDirectory();
  });
}

export function jscpdSkipOwners(root) {
  const declared = loadQualityGates(root).jscpdSkipScripts;
  const dir = join(root, "scripts");
  if (!existsSync(dir)) return { owners: [], unexpected: declared ? [...declared] : [] };
  const names = readdirSync(dir).filter((name) => name.endsWith(".mjs") && name !== "check-quality-baseline.mjs");
  const owners = [];
  for (const name of names) {
    const text = readFileSync(join(dir, name), "utf8");
    if (!text.includes('--skip-jscpd-ratchet"]')) continue;
    if (Array.isArray(declared) && !declared.includes(name)) continue;
    owners.push(name);
  }
  const unexpected = [];
  if (Array.isArray(declared)) {
    for (const name of names) {
      const text = readFileSync(join(dir, name), "utf8");
      if (text.includes('--skip-jscpd-ratchet"]') && !declared.includes(name)) unexpected.push(name);
    }
    for (const name of declared) {
      if (!owners.includes(name)) unexpected.push(name);
    }
  }
  return { owners, unexpected };
}

export function mergeKnipConfig(base, product) {
  const next = { ...base };
  if (!product) return next;
  for (const key of ["ignore", "ignoreDependencies", "ignoreBinaries"]) {
    if (!Array.isArray(product[key])) continue;
    next[key] = [...(base[key] ?? []), ...product[key]];
  }
  return next;
}
