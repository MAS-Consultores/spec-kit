/**
 * Scaffold one page inside an existing feature. The file uses t() and no literals.
 *
 *   node scripts/gen-page.mjs <feature> <page>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function renderPage(feature, page) {
  const pascal = page.charAt(0).toUpperCase() + page.slice(1);
  return `import type { ReactElement } from "react";\nimport { useTranslation } from "react-i18next";\n\nexport function ${pascal}Page(): ReactElement {\n  const { t } = useTranslation();\n  return (\n    <main data-feature="${feature}">\n      <p>{t("title")}</p>\n    </main>\n  );\n}\n`;
}

function selfTest() {
  const source = renderPage("reports", "detail");
  const body = source.split("\n").slice(2).join("\n");
  if (!source.includes("useTranslation") || !source.includes('t("title")') || /\d/.test(body)) {
    console.error("la página generada no pasa los gates de copia y números");
    process.exit(1);
  }
  console.log("gen-page self-test ok");
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else if (process.argv[1] && process.argv[1].endsWith("gen-page.mjs")) {
  const [feature, page] = process.argv.slice(2);
  if (!/^[a-z][a-z0-9]*$/.test(feature ?? "") || !/^[a-z][a-z0-9]*$/.test(page ?? "")) {
    console.error("usage: pnpm gen page <feature> <page>  (lowercase words)");
    process.exit(1);
  }
  const dir = join(root, "apps/web/src/features", feature, "components");
  mkdirSync(dir, { recursive: true });
  const target = join(dir, `${page}-page.tsx`);
  writeFileSync(target, renderPage(feature, page));
  console.log(target);
}
