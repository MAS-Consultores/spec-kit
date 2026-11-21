/**
 * Contract check: packages/contracts fixtures must match the keys the API returns.
 * A stored sample that gains a field the contract does not name is an error.
 * A sample that only lacks a field already shipped warns.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const referenceRoot = fileURLToPath(new URL("..", import.meta.url));

export function compareContract(contract, actual) {
  const errors = [];
  const warnings = [];
  if (typeof contract !== "object" || contract === null || typeof actual !== "object" || actual === null) {
    return { errors: ["la respuesta no es un objeto"], warnings };
  }
  for (const key of Object.keys(actual)) {
    if (!(key in contract)) errors.push(`campo extra ${key}`);
    else if (typeof actual[key] !== typeof contract[key]) errors.push(`tipo de ${key}`);
  }
  for (const key of Object.keys(contract)) {
    if (!(key in actual)) warnings.push(`falta ${key} en una respuesta ya desplegada`);
  }
  return { errors, warnings };
}

function loadPair(root) {
  const contract = JSON.parse(readFileSync(join(root, "packages/contracts/responses/health.json"), "utf8"));
  const actual = JSON.parse(readFileSync(join(root, "packages/contracts/responses/health.sample.json"), "utf8"));
  return { contract, actual };
}

function selfTest() {
  const extra = compareContract({ isOk: true }, { isOk: true, leak: 1 });
  if (!extra.errors.some((line) => line.includes("leak"))) {
    console.error("un campo fuera del contrato tiene que ser error");
    process.exit(1);
  }
  const missing = compareContract({ isOk: true, status: "up" }, { isOk: true });
  if (missing.errors.length || !missing.warnings.some((line) => line.includes("status"))) {
    console.error("un campo viejo ausente tiene que avisar");
    process.exit(1);
  }
  const root = mkdtempSync(join(tmpdir(), "contract-"));
  try {
    const dir = join(root, "packages/contracts/responses");
    writeFileSync(join(root, "package.json"), "{}\n");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "health.json"), '{"isOk":true}\n');
    writeFileSync(join(dir, "health.sample.json"), '{"isOk":true,"leak":1}\n');
    const result = compareContract(
      JSON.parse(readFileSync(join(dir, "health.json"), "utf8")),
      JSON.parse(readFileSync(join(dir, "health.sample.json"), "utf8")),
    );
    if (!result.errors.length) process.exit(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const live = compareContract(...Object.values(loadPair(referenceRoot)));
  if (live.errors.length) {
    console.error(live.errors.join("\n"));
    process.exit(1);
  }
  const source = readFileSync(join(referenceRoot, "apps/api/src/modules/health/health.controller.ts"), "utf8");
  if (!source.includes("isOk: true")) {
    console.error("el controller de health no devuelve el contrato");
    process.exit(1);
  }
  console.log("check-api-contract self-test ok");
}

if (process.argv.includes("--response")) {
  const file = process.argv[process.argv.indexOf("--response") + 1];
  const contract = JSON.parse(readFileSync(join(referenceRoot, "packages/contracts/responses/health.json"), "utf8"));
  const actual = JSON.parse(readFileSync(file, "utf8"));
  const result = compareContract(contract, actual);
  for (const warning of result.warnings) console.log(`warn ${warning}`);
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exit(1);
  }
  console.log("check-api-contract response ok");
} else if (process.argv.includes("--self-test")) selfTest();
else {
  const live = compareContract(...Object.values(loadPair(process.cwd().includes("reference") ? process.cwd() : referenceRoot)));
  for (const warning of live.warnings) console.log(`warn ${warning}`);
  if (live.errors.length) {
    console.error(live.errors.join("\n"));
    process.exit(1);
  }
  console.log("check-api-contract ok");
}
