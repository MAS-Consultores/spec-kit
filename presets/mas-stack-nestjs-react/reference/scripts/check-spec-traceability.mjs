/**
 * Cross acceptance ids in specs against tests.
 *   node scripts/check-spec-traceability.mjs
 *   node scripts/check-spec-traceability.mjs --self-test
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ID = /\bAC-\d+\b/g;

function files(dir, out = [], skipFixtures = true) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (skipFixtures && path.includes(`${join("scripts", "fixtures")}`)) continue;
    const info = statSync(path);
    if (info.isDirectory()) files(path, out, skipFixtures);
    else out.push(path);
  }
  return out;
}

export function trace(root) {
  const skip = !root.includes(`${join("scripts", "fixtures")}`);
  const specs = files(join(root, "specs"), [], skip).filter((path) => path.endsWith(`${join("spec.md")}`));
  const tests = files(root, [], skip).filter((path) => /\.(spec|test)\.tsx?$/.test(path));
  const declared = new Set();
  for (const path of specs) {
    for (const id of readFileSync(path, "utf8").match(ID) ?? []) declared.add(id);
  }
  const cited = new Map();
  for (const path of tests) {
    for (const id of readFileSync(path, "utf8").match(ID) ?? []) {
      cited.set(id, cited.get(id) ?? relative(root, path));
    }
  }
  const missing = [...declared].filter((id) => !cited.has(id));
  const unknown = [...cited.keys()].filter((id) => !declared.has(id));
  return { missing, unknown };
}

function report(root) {
  const { missing, unknown } = trace(root);
  if (missing.length === 0 && unknown.length === 0) {
    console.log("spec-traceability ok");
    return 0;
  }
  for (const id of missing) console.error(`spec-traceability: ${id} no tiene test`);
  for (const id of unknown) console.error(`spec-traceability: ${id} no está en la spec`);
  return 1;
}

if (process.argv.includes("--self-test")) {
  const base = new URL("./fixtures/spec-trace/", import.meta.url);
  const bad = report(new URL("missing/", base).pathname);
  const ghost = report(new URL("unknown/", base).pathname);
  const good = report(new URL("ok/", base).pathname);
  if (bad !== 1 || ghost !== 1 || good !== 0) {
    console.error("spec-traceability self-test failed");
    process.exit(1);
  }
  console.log("spec-traceability self-test ok");
} else if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  process.exit(report(process.cwd()));
}
