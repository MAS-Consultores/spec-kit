/**
 * Oxlint is the fast pass. ESLint stays the source of truth for adoption
 * rules. The oxlint plugin must not change those counts.
 *
 *   node scripts/check-oxlint.mjs
 */
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const probe = join(root, "apps/api/src/oxlint-probe.ts");
const source = `export function probe(value: number, other: number): number {
  if (value == other) return 15;
  return 0;
}
`;

function run(command, args, env) {
  try {
    return {
      status: 0,
      stdout: execFileSync(command, args, { cwd: root, encoding: "utf8", env }),
    };
  } catch (error) {
    const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
    return { status: error.status ?? 1, stdout };
  }
}

function count(results, ruleId) {
  let total = 0;
  for (const result of results) {
    for (const message of result.messages ?? []) {
      if (message.ruleId === ruleId) total += 1;
    }
  }
  return total;
}

function eslint(full) {
  const env = { ...process.env };
  if (full) env.SPECIFY_ESLINT_FULL = "1";
  else delete env.SPECIFY_ESLINT_FULL;
  const result = run("pnpm", ["exec", "eslint", probe, "-f", "json"], env);
  return JSON.parse(result.stdout);
}

writeFileSync(probe, source);
try {
  const ox = run("pnpm", ["exec", "oxlint", probe, "-f", "unix"], process.env);
  if (ox.status === 0 || !ox.stdout.includes("eqeqeq")) {
    console.error("oxlint debía marcar ==");
    console.error(ox.stdout);
    process.exit(1);
  }
  const fast = eslint(false);
  const full = eslint(true);
  const fastMagic = count(fast, "no-magic-numbers");
  const fullMagic = count(full, "no-magic-numbers");
  const fastEq = count(fast, "eqeqeq");
  const fullEq = count(full, "eqeqeq");
  if (fastMagic === 0 || fastMagic !== fullMagic) {
    console.error(`el trinquete perdería no-magic-numbers: plugin ${fastMagic}, sin plugin ${fullMagic}`);
    process.exit(1);
  }
  if (fullEq === 0 || fastEq !== 0) {
    console.error(`eqeqeq debe quedar solo en la pasada completa (${fullEq}) y apagado con el plugin (${fastEq})`);
    process.exit(1);
  }
  console.log("check-oxlint ok");
} finally {
  rmSync(probe, { force: true });
}
