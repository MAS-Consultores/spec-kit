/**
 * The four AGENTS.md files must exist. A path inside backticks or a markdown
 * link must exist on disk. A token that contains `{{`, `<`, or `>` is an
 * explicit placeholder and is not resolved.
 *
 *   node scripts/check-agents-md.mjs --self-test
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_AGENTS = [
  "AGENTS.md",
  "apps/api/AGENTS.md",
  "apps/web/AGENTS.md",
  "packages/contracts/AGENTS.md",
];

const TOKEN = /`([^`\n]+)`|\[[^\]]*\]\(([^)\s]+)\)/g;

export function isPlaceholder(token) {
  return token.includes("{{") || token.includes("<") || token.includes(">");
}

export function isProjectPath(token) {
  if (isPlaceholder(token)) return false;
  if (token.includes("*") || token.includes(" ")) return false;
  if (token.startsWith("/") || token.startsWith("http://") || token.startsWith("https://") || token.startsWith("@")) return false;
  if (!token.includes("/")) return false;
  if (token.startsWith("mas/")) return false;
  const prefixed =
    token.startsWith(".specify/") ||
    token.startsWith(".github/") ||
    token.startsWith("apps/") ||
    token.startsWith("packages/") ||
    token.startsWith("scripts/") ||
    token.startsWith("docs/") ||
    token.startsWith("specs/");
  return prefixed || /\.[a-z0-9]+$/i.test(token);
}

export function referencesIn(markdown) {
  const found = [];
  for (const match of markdown.matchAll(TOKEN)) {
    const token = (match[1] ?? match[2] ?? "").trim();
    if (!token) continue;
    found.push(token);
  }
  return found;
}

export function checkAgentsTree(root) {
  const problems = [];
  for (const relativePath of REQUIRED_AGENTS) {
    const absolute = join(root, relativePath);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      problems.push(`falta ${relativePath}`);
      continue;
    }
    const text = readFileSync(absolute, "utf8");
    for (const token of referencesIn(text)) {
      if (!isProjectPath(token)) continue;
      const target = join(root, token);
      if (!existsSync(target)) problems.push(`${relativePath} apunta a ${token}, que no existe`);
    }
  }
  return problems;
}

function selfTest() {
  const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "fixtures/agents-md");
  const missing = checkAgentsTree(join(fixtureRoot, "missing-file"));
  const brokenLink = checkAgentsTree(join(fixtureRoot, "broken-link"));
  const ok = checkAgentsTree(join(fixtureRoot, "ok"));
  if (missing.length === 0 || !missing.some((line) => line.startsWith("falta"))) {
    console.error("self-test: un árbol sin un AGENTS.md debe fallar");
    process.exit(1);
  }
  if (!brokenLink.some((line) => line.includes("docs/no-such.md"))) {
    console.error(`self-test: un path inexistente debe fallar, llegó ${brokenLink.join(" | ")}`);
    process.exit(1);
  }
  if (ok.length !== 0) {
    console.error(`self-test: el fixture ok debe pasar, llegó ${ok.join(" | ")}`);
    process.exit(1);
  }
  const names = readdirSync(join(fixtureRoot, "ok"));
  if (!names.includes("AGENTS.md")) {
    console.error("self-test: el fixture ok no tiene la raíz");
    process.exit(1);
  }
  console.log("check-agents-md self-test ok");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.argv.includes("--self-test")) {
    selfTest();
  } else {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const problems = checkAgentsTree(root);
    if (problems.length > 0) {
      console.error("AGENTS.md incompleto o con rutas que no existen:");
      for (const problem of problems) console.error(problem);
      process.exit(1);
    }
    console.log("agents md ok");
  }
}
