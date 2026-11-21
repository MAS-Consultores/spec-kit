/**
 * Each feature in quality-gates.json needs a Playwright spec tagged @critical.
 * Branch protection that requires this check on testing and main is configured
 * by Manuel. This script does not call the GitHub API.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const referenceRoot = fileURLToPath(new URL("..", import.meta.url));

export function missingCritical(root, features) {
  const missing = [];
  for (const feature of features) {
    let source = "";
    try {
      source = readFileSync(join(root, feature.spec), "utf8");
    } catch {
      missing.push(feature.name);
      continue;
    }
    if (!source.includes("@critical")) missing.push(feature.name);
  }
  return missing;
}

function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "critical-"));
  try {
    mkdirSync(join(root, "apps/web/e2e"), { recursive: true });
    writeFileSync(join(root, "apps/web/e2e/home.spec.ts"), 'test("home", async () => {});\n', "utf8");
    const bare = missingCritical(root, [{ name: "home", spec: "apps/web/e2e/home.spec.ts" }]);
    if (!bare.includes("home")) {
      console.error("una feature sin @critical tiene que fallar");
      process.exit(1);
    }
    writeFileSync(
      join(root, "apps/web/e2e/home.spec.ts"),
      'test("home", { tag: "@critical" }, async () => {});\n',
      "utf8",
    );
    if (missingCritical(root, [{ name: "home", spec: "apps/web/e2e/home.spec.ts" }]).length) {
      console.error("el tag @critical tiene que alcanzar");
      process.exit(1);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const workflow = readFileSync(join(referenceRoot, ".github/workflows/e2e-critical.yml"), "utf8");
  if (!workflow.includes("e2e-critical") || !workflow.includes("retries") || !workflow.includes("@critical")) {
    console.error("el workflow e2e-critical no es bloqueante ni fija retries");
    process.exit(1);
  }
  if (workflow.includes("branch protection") || workflow.includes("protection")) {
    console.error("el workflow no configura protección de ramas");
    process.exit(1);
  }
  const readme = readFileSync(join(referenceRoot, "README.md"), "utf8");
  if (!readme.includes("Manuel") || !readme.toLowerCase().includes("protección") && !readme.includes("proteccion")) {
    console.error("falta la nota de que Manuel configura la protección de ramas");
    process.exit(1);
  }
  const gates = JSON.parse(readFileSync(join(referenceRoot, "quality-gates.json"), "utf8"));
  const live = missingCritical(referenceRoot, gates.features ?? []);
  if (live.length) {
    console.error(`sin @critical: ${live.join(", ")}`);
    process.exit(1);
  }
  console.log("check-critical-e2e self-test ok");
}

if (process.argv.includes("--self-test")) selfTest();
else {
  const gates = JSON.parse(readFileSync(join(process.cwd(), "quality-gates.json"), "utf8"));
  const live = missingCritical(process.cwd(), gates.features ?? []);
  if (live.length) {
    console.error(`sin @critical: ${live.join(", ")}`);
    process.exit(1);
  }
  console.log("check-critical-e2e ok");
}
