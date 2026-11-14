/**
 * Removes the example Note slice and adds a minimal Widget slice.
 * Run after `specify init` and `pnpm install --frozen-lockfile`, on a fresh database.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chdir } from "node:process";

chdir(join(dirname(fileURLToPath(import.meta.url)), ".."));

const pairs = [
  ["notes:", "widgets:"],
  ["Notes", "Widgets"],
  ["notes", "widgets"],
  ["Note", "Widget"],
  ["note", "widget"],
];

function rewrite(text) {
  let next = text;
  for (const [from, to] of pairs) {
    next = next.split(from).join(to);
  }
  return next;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else acc.push(path);
  }
  return acc;
}

const notesDir = "apps/api/src/modules/notes";
const widgetDir = "apps/api/src/modules/widgets";
mkdirSync(widgetDir, { recursive: true });
for (const file of walk(notesDir)) {
  const rel = file.slice(notesDir.length + 1);
  const target = join(widgetDir, rewrite(rel));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, rewrite(readFileSync(file, "utf8")));
}
rmSync(notesDir, { recursive: true, force: true });

const toolFrom = "apps/api/src/mcp/notes.tool.ts";
const toolTo = "apps/api/src/mcp/widgets.tool.ts";
writeFileSync(toolTo, rewrite(readFileSync(toolFrom, "utf8")));
rmSync(toolFrom, { force: true });

const textFiles = [
  "apps/api/src/slices.ts",
  "apps/api/prisma/slice-seed.ts",
  "apps/api/prisma/schema.prisma",
  "packages/contracts/src/index.ts",
  "packages/contracts/src/client.ts",
  "apps/api/openapi.json",
  "apps/api/test/api.e2e.ts",
  "apps/api/test/mcp.e2e.ts",
  "apps/web/e2e/home.spec.ts",
  "apps/web/src/locales/es-CL.json",
];
for (const file of textFiles) {
  writeFileSync(file, rewrite(readFileSync(file, "utf8")));
}

const initSql = "apps/api/prisma/migrations/20261113000000_init/migration.sql";
const sql = readFileSync(initSql, "utf8");
const withoutNote = sql.replace(
  /CREATE TABLE "Note" \([\s\S]*?CONSTRAINT "Note_pkey" PRIMARY KEY \("id"\)\n\);\n\n/,
  "",
);
if (withoutNote === sql || withoutNote.includes('"Note"')) {
  console.error("failed to remove Note from the init migration");
  process.exit(1);
}
writeFileSync(initSql, withoutNote);

const widgetSql = `CREATE TABLE "Widget" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,
  CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);
`;
const migrationDir = "apps/api/prisma/migrations/20261114000000_widget";
mkdirSync(migrationDir, { recursive: true });
writeFileSync(join(migrationDir, "migration.sql"), widgetSql);

const locale = JSON.parse(readFileSync("apps/web/src/locales/es-CL.json", "utf8"));
locale.title = "Widgets";
writeFileSync("apps/web/src/locales/es-CL.json", `${JSON.stringify(locale, null, 2)}\n`);
const spec = readFileSync("apps/web/e2e/home.spec.ts", "utf8").replace('name: "Notas"', 'name: "Widgets"');
writeFileSync("apps/web/e2e/home.spec.ts", spec);

if (readFileSync("apps/api/prisma/schema.prisma", "utf8").includes("model Note")) {
  console.error("Note model remains");
  process.exit(1);
}
console.log("replaced the example slice with Widget");
