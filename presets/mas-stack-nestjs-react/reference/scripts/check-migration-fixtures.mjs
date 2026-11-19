/**
 * Each negative fixture must fail lint-migrations with its expected code.
 * The pass/ directory must stay clean, including an approved destructive change.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { editedMigrationErrors, lintMigrationTree } from "./lint-migrations.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "apps/api/prisma/migration-lint-fixtures");

function codes(errors) {
  return errors.map((error) => error.code);
}

let failed = 0;
for (const name of readdirSync(fixtures).sort()) {
  const dir = join(fixtures, name);
  if (!statSync(dir).isDirectory()) continue;
  const expectPath = join(dir, "expect.txt");
  const expected = readFileSync(expectPath, "utf8").trim();
  const errors = lintMigrationTree(join(dir, "migrations"));
  errors.push(...editedMigrationErrors(join(dir, "migrations"), join(dir, "baseline")));
  const found = codes(errors);
  if (expected === "pass") {
    if (found.length > 0) {
      console.error(`${name}: expected pass, got ${found.join(",")}`);
      for (const error of errors) console.error(`  ${error.code}: ${error.message}`);
      failed += 1;
    }
    continue;
  }
  if (!found.includes(expected)) {
    console.error(`${name}: expected ${expected}, got ${found.join(",") || "no errors"}`);
    failed += 1;
  } else {
    console.log(`${name}: ${expected}`);
  }
}

if (failed > 0) process.exit(1);
console.log("migration fixtures failed as required");
