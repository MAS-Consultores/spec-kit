/**
 * Visual fidelity screenshots are allowed only for screens listed in
 * fidelity-map.json and only inside apps/web/e2e/visual. Everything else
 * stays without screenshots. The agent receives at most the cropped diff,
 * and at most two rounds.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const referenceRoot = fileURLToPath(new URL("..", import.meta.url));
const FORBIDDEN = ["toHaveScreenshot(", "page.screenshot("];

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "lint-fixtures" || entry === "dist") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(path);
  }
}

export function screenshotViolations(root) {
  const files = [];
  for (const folder of ["apps", "packages"]) {
    const dir = join(root, folder);
    try {
      walk(dir, files);
    } catch {
      /* absent in a fixture */
    }
  }
  const problems = [];
  for (const path of files) {
    const relativePath = relative(root, path).split("\\").join("/");
    if (relativePath.startsWith("apps/web/e2e/visual/")) continue;
    const source = readFileSync(path, "utf8");
    for (const token of FORBIDDEN) {
      if (source.includes(token)) problems.push(`${relativePath} ${token}`);
    }
  }
  return problems;
}

function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "visual-"));
  try {
    mkdirSync(join(root, "apps/web/e2e"), { recursive: true });
    writeFileSync(join(root, "apps/web/e2e/home.spec.ts"), "await page.screenshot();\n", "utf8");
    const blocked = screenshotViolations(root);
    if (!blocked.some((line) => line.includes("home.spec.ts"))) {
      console.error("un screenshot fuera de visual tiene que fallar");
      process.exit(1);
    }
    mkdirSync(join(root, "apps/web/e2e/visual"), { recursive: true });
    writeFileSync(join(root, "apps/web/e2e/visual/home.spec.ts"), "await expect(page).toHaveScreenshot();\n", "utf8");
    const allowed = screenshotViolations(root).filter((line) => line.includes("visual"));
    if (allowed.length) {
      console.error("toHaveScreenshot dentro de visual es la excepción");
      process.exit(1);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const map = JSON.parse(readFileSync(join(referenceRoot, "apps/web/e2e/visual/fidelity-map.json"), "utf8"));
  if (!Array.isArray(map.screens) || map.screens.length === 0) {
    console.error("fidelity-map.json no opta por ninguna pantalla");
    process.exit(1);
  }
  const config = readFileSync(join(referenceRoot, "apps/web/playwright.visual.config.ts"), "utf8");
  for (const token of ["animations: \"disabled\"", "timezoneId: \"UTC\"", "maxDiffPixelRatio", "2026-01-15"]) {
    if (!config.includes(token)) {
      console.error(`falta ${token} en la config visual`);
      process.exit(1);
    }
  }
  const agent = readFileSync(join(referenceRoot, "scripts/visual-diff-for-agent.mjs"), "utf8");
  if (!agent.includes("MAX_ROUNDS = 2")) {
    console.error("el tope de vueltas del agente no es 2");
    process.exit(1);
  }
  const workflow = readFileSync(join(referenceRoot, ".github/workflows/visual.yml"), "utf8");
  if (!workflow.includes("timeout-minutes: 2") || workflow.includes("continue-on-error")) {
    console.error("el job visual tiene que cortar a los 2 minutos y, si entra en ese tope, bloquear");
    process.exit(1);
  }
  const live = screenshotViolations(referenceRoot);
  if (live.length) {
    console.error(live.join("\n"));
    process.exit(1);
  }
  console.log("check-visual-policy self-test ok");
}

if (process.argv.includes("--self-test")) selfTest();
else {
  const live = screenshotViolations(process.cwd());
  if (live.length) {
    console.error(live.join("\n"));
    process.exit(1);
  }
  console.log("check-visual-policy ok");
}
