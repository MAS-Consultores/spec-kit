/**
 * A web component with enough branching needs a Testing Library spec.
 * Threshold: 3 conditionals (if, ternary, switch case, && / ||).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

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
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "lint-fixtures" || entry === "node_modules") continue;
      walk(path, acc);
      continue;
    }
    if (path.endsWith(".tsx") && !path.endsWith(".test.tsx") && !path.endsWith(".spec.tsx")) acc.push(path);
  }
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
  console.log("check-component-tests self-test ok");
}

const isMain = process.argv[1] && new URL(process.argv[1], "file:").href === import.meta.url;
if (!isMain) {
  // imported by tests
} else if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const web = new URL("..", import.meta.url).pathname;
  const missing = [
    ...missingTests(join(web, "apps/web/src/features")),
    ...missingTests(join(web, "apps/web/src/shell")),
  ];
  if (missing.length > 0) {
    console.error("componente con lógica sin *.test.tsx (Testing Library):");
    for (const file of missing) console.error(file);
    process.exit(1);
  }
  console.log("component tests ok");
}
