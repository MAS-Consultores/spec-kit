/**
 * A web component with enough branching needs a Testing Library spec.
 * Threshold: 3 conditionals (if, ternary, switch case, && / ||).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { resolveComponentRoots } from "./quality-gate-config.mjs";

const THRESHOLD = 3;

export function complexityScore(source) {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\?\./g, ".")
    .replace(/\?\?/g, " ")
    .replace(/typeof\s+[\w.]+\s*===\s*"undefined"\s*\?/g, " ");
  const patterns = [/\bif\s*\(/g, /\?/g, /\bswitch\s*\(/g, /&&/g, /\|\|/g];
  return patterns.reduce((total, pattern) => total + (stripped.match(pattern)?.length ?? 0), 0);
}

function walk(dir, acc) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "lint-fixtures" || entry === "node_modules" || entry === "coverage") continue;
      walk(path, acc);
      continue;
    }
    if (path.endsWith(".tsx") && !path.endsWith(".test.tsx") && !path.endsWith(".spec.tsx")) acc.push(path);
  }
}

export function runComponentGate(projectRoot, threshold = THRESHOLD) {
  const missing = [];
  for (const relativeRoot of resolveComponentRoots(projectRoot)) {
    const absolute = join(projectRoot, relativeRoot);
    for (const file of missingTests(absolute, threshold)) missing.push(join(relativeRoot, file));
  }
  return missing;
}

export function missingTests(root, threshold = THRESHOLD) {
  const files = [];
  walk(root, files);
  const missing = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (complexityScore(source) < threshold) continue;
    const testPath = file.replace(/\.tsx$/, ".test.tsx");
    try {
      statSync(testPath);
    } catch {
      missing.push(relative(root, file));
    }
  }
  return missing;
}

function selfTest() {
  const fixtureRoot = join(new URL(".", import.meta.url).pathname, "fixtures/component-tests");
  const off = missingTests(join(fixtureRoot, "off"), 99);
  const on = missingTests(join(fixtureRoot, "on"), 3);
  if (off.length !== 0) {
    console.error("self-test: con el umbral apagado el componente complejo no exige test");
    process.exit(1);
  }
  if (on.length !== 1 || on[0] !== "complex-panel.tsx") {
    console.error(`self-test: se esperaba complex-panel.tsx sin test, llegó ${on.join(",")}`);
    process.exit(1);
  }
  const covered = missingTests(join(fixtureRoot, "covered"), 3);
  if (covered.length !== 0) {
    console.error("self-test: un .test.tsx al lado cubre el componente");
    process.exit(1);
  }
  const noShell = runComponentGate(join(fixtureRoot, "no-shell"));
  if (noShell.length !== 1 || !noShell[0].endsWith("complex-panel.tsx")) {
    console.error(`self-test: sin shell se esperaba el panel, llegó ${noShell.join(",")}`);
    process.exit(1);
  }
  const custom = runComponentGate(join(fixtureRoot, "custom"));
  if (custom.length !== 1 || !custom[0].startsWith("panels")) {
    console.error(`self-test: quality-gates.json debe limitar las raíces, llegó ${custom.join(",")}`);
    process.exit(1);
  }
  console.log("no-shell ok");
  console.log("check-component-tests self-test ok");
}

const isMain = process.argv[1] && new URL(process.argv[1], "file:").href === import.meta.url;
if (!isMain) {
  // imported by tests
} else if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const web = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const missing = runComponentGate(web);
  if (missing.length > 0) {
    console.error("componente con lógica sin *.test.tsx (Testing Library):");
    for (const file of missing) console.error(file);
    process.exit(1);
  }
  console.log("component tests ok");
}
