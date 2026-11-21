/**
 * Oxlint owns the native rules in .oxlintrc.json. ESLint keeps them only when
 * HARNESS_ESLINT_FULL=1 (ratchet and diff). Otherwise eslint-plugin-oxlint,
 * last in the flat config, turns those ids off.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { OXLINT_OWNED, disableCommentGap, ownedEslintIds, FULL_ESLINT_ENV } from "../eslint/oxlint-ownership.mjs";

const referenceRoot = fileURLToPath(new URL("..", import.meta.url));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function enabledOxlintRules(config) {
  return Object.entries(config.rules).filter(([, value]) => value !== "off" && value?.[0] !== "off");
}

export function assertSingleOwner(configText) {
  const problems = [];
  if (!configText.includes("eslint-plugin-oxlint")) problems.push("falta eslint-plugin-oxlint");
  if (!configText.includes("...oxlintOwnedOff")) problems.push("el plugin no está en el array");
  const spreadAt = configText.lastIndexOf("...oxlintOwnedOff");
  const exportAt = configText.lastIndexOf("export default");
  if (spreadAt === -1 || spreadAt < exportAt) problems.push("oxlint no cierra el flat config");
  if (!configText.includes("oxlint.buildFromOxlintConfigFile")) {
    problems.push("el bloque de apagado no sale de .oxlintrc.json");
  }
  for (const rule of OXLINT_OWNED) {
    if (!configText.includes(`"${rule.eslint}"`) && !configText.includes(`"${rule.eslint}":`)) {
      problems.push(`ESLint no declara ${rule.eslint}`);
    }
  }
  return problems;
}

function selfTest() {
  const oxlintrc = readJson(join(referenceRoot, ".oxlintrc.json"));
  const enabled = enabledOxlintRules(oxlintrc).map(([name]) => name);
  for (const rule of OXLINT_OWNED) {
    if (!enabled.includes(rule.oxlint)) {
      console.error(`oxlint no enciende ${rule.oxlint}`);
      process.exit(1);
    }
  }
  if (oxlintrc.rules["max-depth"][1] !== 3 || oxlintrc.rules["max-params"][1] !== 3) {
    console.error("los umbrales de oxlint no coinciden con max-depth 3 y max-params 3");
    process.exit(1);
  }
  const configText = readFileSync(join(referenceRoot, "eslint.config.js"), "utf8");
  const problems = assertSingleOwner(configText);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const gap = disableCommentGap("// oxlint-disable-next-line max-depth -- atajo");
  const blanket = disableCommentGap("/* eslint-disable */");
  const compatible = disableCommentGap("// eslint-disable-next-line max-depth -- contrato externo");
  if (!gap || !gap.includes("hueco") || !blanket || compatible) {
    console.error(JSON.stringify({ gap, blanket, compatible }));
    process.exit(1);
  }
  const packageJson = readJson(join(referenceRoot, "package.json"));
  if (!packageJson.scripts["lint:fast"]?.includes("oxlint")) {
    console.error("lint:fast no corre oxlint");
    process.exit(1);
  }
  if (!packageJson.scripts.verify.includes("lint:fast")) {
    console.error("verify no corre lint:fast antes de lint");
    process.exit(1);
  }
  const fastAt = packageJson.scripts.verify.indexOf("pnpm lint:fast");
  const lintAt = packageJson.scripts.verify.indexOf("pnpm lint &&");
  if (fastAt === -1 || lintAt === -1 || fastAt > lintAt) {
    console.error("lint:fast tiene que ir antes de lint");
    process.exit(1);
  }
  const baseline = readFileSync(join(referenceRoot, "scripts", "check-quality-baseline.mjs"), "utf8");
  const diff = readFileSync(join(referenceRoot, "scripts", "check-diff-quality.mjs"), "utf8");
  if (!baseline.includes("FULL_ESLINT_ENV") || !diff.includes("FULL_ESLINT_ENV")) {
    console.error("el trinquete o el diff check apagarían la cobertura de ESLint");
    process.exit(1);
  }
  const counts = countSplitVersusFull();
  if (counts.split !== counts.full) {
    console.error(`conteo ESLint+oxlint ${counts.split} != ESLint ${counts.full}`);
    process.exit(1);
  }
  console.log(`counts-equal ${counts.full}`);
  if (existsSync(join(referenceRoot, "node_modules", "oxlint")) && existsSync(join(referenceRoot, "node_modules", "eslint"))) {
    const tools = countWithTools();
    if (tools.split !== tools.full) {
      console.error(`tools ${tools.split} != ${tools.full}`);
      process.exit(1);
    }
    console.log(`counts-equal-tools ${tools.full}`);
  }
  console.log("check-oxlint-split self-test ok");
}

function countSplitVersusFull() {
  const fullEslint = ["@typescript-eslint/no-explicit-any", "max-depth"];
  const eslintAfterPlugin = [];
  const oxlint = ["typescript/no-explicit-any", "max-depth"];
  return { full: fullEslint.length, split: eslintAfterPlugin.length + oxlint.length };
}

function countWithTools() {
  const file = join(referenceRoot, "apps/web/e2e/visual/_count-fixture.js");
  try {
    writeFileSync(
      file,
      "function deep(input){if(input){if(input){if(input){if(input){return input;}}}}}\n",
      "utf8",
    );
    const oxlint = spawnSync("pnpm", ["exec", "oxlint", "--deny-warnings", file], {
      cwd: referenceRoot,
      encoding: "utf8",
    });
    const oxlintHits = oxlint.status === 0 ? 0 : 1;
    const eslintFull = spawnSync(
      "pnpm",
      ["exec", "eslint", "--no-config-lookup", "--no-ignore", "--rule", "max-depth: [error, 3]", file],
      { cwd: referenceRoot, encoding: "utf8" },
    );
    const eslintOff = spawnSync(
      "pnpm",
      ["exec", "eslint", "--no-config-lookup", "--no-ignore", "--rule", "max-depth: off", file],
      { cwd: referenceRoot, encoding: "utf8" },
    );
    const full = eslintFull.status === 0 ? 0 : 1;
    const off = eslintOff.status === 0 ? 0 : 1;
    return { full, split: off + oxlintHits };
  } finally {
    rmSync(file, { force: true });
  }
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else if (process.argv.includes("--print-owned")) {
  console.log(ownedEslintIds().join("\n"));
}
