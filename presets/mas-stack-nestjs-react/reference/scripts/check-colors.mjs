/**
 * CSS half of the color gate. Hex, rgb/hsl/oklch, and white/black outside
 * apps/web/src/index.css fail. A var(--token) must be defined in that file
 * for :root (global) or for the same selector.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const tokenFile = join(root, "apps/web/src/index.css");
const tokenText = readFileSync(tokenFile, "utf8");

const LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\(|(?:^|[^\w-])(?:white|black)(?:$|[^\w-])/;

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function blocks(css) {
  const found = [];
  const selector = [];
  let current = "";
  let depth = 0;
  let body = false;
  const text = stripComments(css);
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") {
      if (depth === 0) {
        selector.push(current.trim());
        current = "";
        body = true;
      } else {
        current += char;
      }
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        found.push({ selector: selector.pop() ?? "", body: current });
        current = "";
        body = false;
      } else {
        current += char;
      }
      continue;
    }
    if (depth === 0 || body) current += char;
  }
  return found;
}

function definedTokens(css) {
  const global = new Set();
  const bySelector = new Map();
  for (const block of blocks(css)) {
    const names = [...block.body.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((match) => match[1]);
    const key = block.selector.replace(/\s+/g, " ");
    const bucket = bySelector.get(key) ?? new Set();
    for (const name of names) bucket.add(name);
    bySelector.set(key, bucket);
    if (/^:root$|^html$|^body$|^\*$/.test(key) || key.includes(":root")) {
      for (const name of names) global.add(name);
    }
  }
  return { global, bySelector };
}

const tokens = definedTokens(tokenText);

function walk(dir, found) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "coverage") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (name.endsWith(".css")) found.push(path);
  }
}

function literalHits(css) {
  const text = stripComments(css);
  return LITERAL.test(text);
}

function undefinedVars(css) {
  const local = definedTokens(css);
  const missing = [];
  for (const block of blocks(css)) {
    const key = block.selector.replace(/\s+/g, " ");
    const uses = [...block.body.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((match) => match[1]);
    for (const name of uses) {
      const inToken =
        tokens.global.has(name) ||
        tokens.bySelector.get(key)?.has(name) === true ||
        tokens.bySelector.get(":root")?.has(name) === true;
      const inFile = local.global.has(name) || local.bySelector.get(key)?.has(name) === true;
      if (!inToken && !inFile) missing.push(name);
    }
  }
  return missing;
}

const cssFiles = [];
walk(join(root, "apps"), cssFiles);
walk(join(root, "packages"), cssFiles);

let failed = false;
for (const file of cssFiles) {
  if (file === tokenFile || file.includes(`${join("apps", "web", "lint-fixtures")}`)) continue;
  const css = readFileSync(file, "utf8");
  const rel = relative(root, file);
  if (literalHits(css)) {
    failed = true;
    console.error(`mas/no-literal-color ${rel}: literal color outside apps/web/src/index.css`);
  }
  for (const name of undefinedVars(css)) {
    failed = true;
    console.error(`mas/css-token-defined ${rel}: var(${name}) is not defined in apps/web/src/index.css for that scope`);
  }
}

const fixtures = [
  {
    file: "apps/web/lint-fixtures/colors/literal.css",
    rule: "mas/no-literal-color",
    pass: false,
  },
  {
    file: "apps/web/lint-fixtures/colors/undefined-var.css",
    rule: "mas/css-token-defined",
    pass: false,
  },
  {
    file: "apps/web/lint-fixtures/colors/valid.css",
    rule: "",
    pass: true,
  },
  {
    file: "apps/web/lint-fixtures/colors/dark-scope.css",
    rule: "mas/css-token-defined",
    pass: false,
  },
  {
    file: "apps/web/lint-fixtures/colors/scoped-ok.css",
    rule: "",
    pass: true,
  },
  {
    file: "apps/web/lint-fixtures/colors/root-uses-dark.css",
    rule: "mas/css-token-defined",
    pass: false,
  },
];

for (const fixture of fixtures) {
  const css = readFileSync(join(root, fixture.file), "utf8");
  const literal = literalHits(css);
  const missing = undefinedVars(css);
  const bad = literal || missing.length > 0;
  if (fixture.pass && bad) {
    failed = true;
    console.error(`fixture ${fixture.file} should pass and did not`);
  }
  if (!fixture.pass && fixture.rule === "mas/no-literal-color" && !literal) {
    failed = true;
    console.error(`fixture ${fixture.file} missed mas/no-literal-color`);
  }
  if (!fixture.pass && fixture.rule === "mas/css-token-defined" && missing.length === 0) {
    failed = true;
    console.error(`fixture ${fixture.file} missed mas/css-token-defined`);
  }
  if (!bad || fixture.pass) console.log(`fixture ok ${fixture.file}`);
  else console.log(`fixture ok ${fixture.file} ${fixture.rule}`);
}

if (failed) process.exit(1);
console.log("color-css ok");
