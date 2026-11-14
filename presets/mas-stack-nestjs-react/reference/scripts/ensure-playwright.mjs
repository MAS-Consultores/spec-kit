import { createRequire } from "node:module";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

try {
  const browser = await chromium.launch();
  await browser.close();
} catch (error) {
  console.error("ERROR: Playwright chromium is not installed.");
  console.error("Run: pnpm exec playwright install chromium");
  console.error("Do not rely on ports 3000 or 4173; the config binds a free port.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
console.log("playwright chromium ok");
