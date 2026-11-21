/**
 * Mutation testing on the diff, only for critical modules.
 * Existing modules outside the diff are skipped (warn). A changed file in a
 * configured module must be on the stryker mutate list and meet the threshold.
 *
 *   node scripts/check-mutation.mjs --self-test
 *   node scripts/check-mutation.mjs --run
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const referenceRoot = fileURLToPath(new URL("..", import.meta.url));

export function mutationPlan(gates, changedFiles) {
  const modules = gates.mutation?.modules ?? [];
  const paths = gates.mutation?.paths ?? {};
  const threshold = gates.mutation?.threshold;
  const mutate = [];
  const warnings = [];
  for (const file of changedFiles) {
    const moduleName = modules.find((name) => {
      const folder = paths[name];
      return folder && (file === folder || file.startsWith(`${folder}/`));
    });
    if (!moduleName) continue;
    if (file.endsWith(".spec.ts") || file.endsWith(".test.ts")) continue;
    mutate.push(file);
  }
  for (const name of modules) {
    if (!paths[name]) warnings.push(`modulo ${name} sin path`);
  }
  return { mutate, threshold, warnings };
}

function readGates(root) {
  return JSON.parse(readFileSync(join(root, "quality-gates.json"), "utf8"));
}

function changedFiles(root) {
  const result = spawnSync("git", ["diff", "--name-only", "--diff-filter=ACMR", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) return [];
  return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

function selfTest() {
  const gates = {
    mutation: {
      modules: ["nomina", "permisos", "auth"],
      threshold: 80,
      paths: { auth: "apps/api/src/modules/auth", permisos: "apps/api/src/modules/auth", nomina: "apps/api/src/modules/nomina" },
    },
  };
  const outside = mutationPlan(gates, ["apps/web/src/features/home/index.ts"]);
  if (outside.mutate.length !== 0) {
    console.error("un archivo fuera de los módulos críticos no se muta");
    process.exit(1);
  }
  const inside = mutationPlan(gates, ["apps/api/src/modules/auth/auth.service.ts"]);
  if (inside.mutate.length !== 1 || inside.threshold !== 80) {
    console.error("el diff de auth no entra al plan");
    process.exit(1);
  }
  const spec = mutationPlan(gates, ["apps/api/src/modules/auth/auth.service.spec.ts"]);
  if (spec.mutate.length !== 0) {
    console.error("el spec no se muta");
    process.exit(1);
  }
  const missing = mutationPlan({ mutation: { modules: ["nomina"], threshold: 0, paths: {} } }, []);
  if (!missing.warnings.some((line) => line.includes("nomina"))) {
    console.error("un módulo sin path tiene que avisar");
    process.exit(1);
  }
  const broken = mutationPlan({ mutation: { modules: ["auth"], paths: { auth: "apps/api/src/modules/auth" } } }, [
    "apps/api/src/modules/auth/auth.service.ts",
  ]);
  if (broken.threshold !== undefined) {
    console.error("sin umbral el plan no puede pasar por alto el número");
    process.exit(1);
  }
  const root = mkdtempSync(join(tmpdir(), "mutation-"));
  try {
    writeFileSync(join(root, "quality-gates.json"), JSON.stringify({ mutation: { modules: ["auth"], paths: {} } }), "utf8");
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: root, encoding: "utf8" });
    if (result.status === 0) {
      console.error("sin umbral el gate tiene que fallar");
      process.exit(1);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const product = readGates(referenceRoot);
  if (!product.mutation?.modules?.includes("auth") || product.mutation.threshold < 1) {
    console.error("quality-gates.json no configura la mutación");
    process.exit(1);
  }
  console.log("check-mutation self-test ok");
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  const gates = readGates(process.cwd() === referenceRoot || existsGates(process.cwd()) ? gatesRoot() : referenceRoot);
  if (typeof gates.mutation?.threshold !== "number" || gates.mutation.threshold < 1) {
    console.error("mutation.threshold es obligatorio");
    process.exit(1);
  }
  const plan = mutationPlan(gates, changedFiles(gatesRoot()));
  for (const warning of plan.warnings) console.log(`warn ${warning}`);
  if (plan.mutate.length === 0) {
    console.log("check-mutation: sin diff en módulos críticos");
    return;
  }
  console.log(`mutate ${plan.mutate.join(" ")} threshold ${plan.threshold}`);
  if (!process.argv.includes("--run")) return;
  const result = spawnSync("pnpm", ["exec", "stryker", "run", "--mutate", plan.mutate.join(",")], {
    cwd: gatesRoot(),
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

function existsGates(root) {
  try {
    readFileSync(join(root, "quality-gates.json"));
    return true;
  } catch {
    return false;
  }
}

function gatesRoot() {
  return existsGates(process.cwd()) ? process.cwd() : referenceRoot;
}

main();
