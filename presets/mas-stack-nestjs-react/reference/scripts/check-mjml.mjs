/**
 * Compiles preset MJML fixtures with validationLevel strict.
 * A valid template must compile. A broken template must fail.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mjml2html from "mjml";

const root = new URL("..", import.meta.url).pathname;
const dir = join(root, "fixtures/email");
const files = readdirSync(dir).filter((name) => name.endsWith(".mjml"));
if (!files.includes("welcome.mjml") || !files.includes("broken.mjml")) {
  console.error("fixtures/email must contain welcome.mjml and broken.mjml");
  process.exit(1);
}

async function compile(name) {
  const source = readFileSync(join(dir, name), "utf8");
  return mjml2html(source, { validationLevel: "strict" });
}

try {
  const welcome = await compile("welcome.mjml");
  if (typeof welcome.html !== "string" || welcome.html.length === 0) {
    console.error("welcome.mjml compiled without html");
    process.exit(1);
  }
  console.log("mjml ok welcome.mjml");
} catch (error) {
  console.error("welcome.mjml failed strict MJML");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

let brokenFailed = false;
try {
  await compile("broken.mjml");
} catch {
  brokenFailed = true;
}
if (!brokenFailed) {
  console.error("broken.mjml compiled under validationLevel strict");
  process.exit(1);
}
console.log("mjml ok broken.mjml rejected");
