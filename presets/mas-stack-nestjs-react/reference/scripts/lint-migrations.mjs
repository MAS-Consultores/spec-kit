/**
 * Static checks for prisma/migrations SQL. No database.
 *
 * Codes:
 * - not-null-add: NOT NULL column added to an existing table without DEFAULT
 * - not-null-set: SET NOT NULL without an earlier non-null UPDATE of that column
 * - null-into-not-null: UPDATE assigns NULL while the column is still NOT NULL
 * - destructive: DROP COLUMN, DROP TABLE, rename, TRUNCATE, DELETE without WHERE,
 *   or a column type change, without `-- mas:allow-destructive <motivo>`
 * - unique-on-existing: UNIQUE constraint or unique index on a table that already has rows
 * - edited-migration: a migration directory that exists on the base ref changed
 *
 * The approval comment applies only to the next statement (or the same line).
 * The motivo must be non-empty. Editing a migration that is already on the base
 * branch is rejected; ship a new migration instead.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOW = /^mas:allow-destructive\s+(\S(?:.*\S)?)\s*$/;

export function lintMigrationTree(migrationsDir) {
  const files = listSql(migrationsDir);
  return lintFiles(files);
}

export function lintFiles(files) {
  const errors = [];
  const tables = new Map();
  for (const file of files) {
    for (const table of tables.values()) table.backfilled = new Set();
    const before = snapshot(tables);
    for (const statement of statements(file.sql)) {
      const problem = checkStatement(statement, tables, before);
      if (problem) errors.push({ file: file.name, ...problem });
      applyStatement(statement, tables);
    }
  }
  return errors;
}

export function editedMigrationErrors(headDir, baselineDir) {
  const errors = [];
  if (!existsSync(baselineDir)) return errors;
  const baseNames = new Set(listSql(baselineDir).map((file) => file.name));
  for (const file of listSql(headDir)) {
    if (!baseNames.has(file.name)) continue;
    const baseSql = readFileSync(join(baselineDir, file.name), "utf8").replace(/\r\n/g, "\n");
    const headSql = file.sql.replace(/\r\n/g, "\n");
    if (baseSql !== headSql) {
      errors.push({
        file: file.name,
        code: "edited-migration",
        message: `migration ${file.name} already exists on the base and its SQL changed; add a new migration instead`,
      });
    }
  }
  return errors;
}

function listSql(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const folder = join(dir, name);
    if (!statSync(folder).isDirectory()) continue;
    const sqlPath = join(folder, "migration.sql");
    if (!existsSync(sqlPath)) continue;
    out.push({ name: `${name}/migration.sql`, sql: readFileSync(sqlPath, "utf8") });
  }
  return out;
}

function snapshot(tables) {
  const copy = new Map();
  for (const [table, columns] of tables) {
    copy.set(table, {
      createdHere: columns.createdHere,
      hasRows: columns.hasRows,
      cols: new Map(columns.cols),
    });
  }
  return copy;
}

function statements(sql) {
  const out = [];
  let current = "";
  let allow = false;
  let i = 0;
  while (i < sql.length) {
    if (sql.startsWith("/*", i)) {
      const end = sql.indexOf("*/", i + 2);
      const block = sql.slice(i + 2, end === -1 ? sql.length : end);
      const marker = markerIn(block);
      if (marker) allow = true;
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (sql.startsWith("--", i)) {
      const end = sql.indexOf("\n", i);
      const line = sql.slice(i + 2, end === -1 ? sql.length : end);
      const marker = markerIn(line);
      if (marker) allow = true;
      i = end === -1 ? sql.length : end + 1;
      continue;
    }
    const quote = sql[i];
    if (quote === "'" || quote === '"') {
      const end = skipQuoted(sql, i, quote);
      current += sql.slice(i, end);
      i = end;
      continue;
    }
    if (sql.startsWith("$$", i)) {
      const end = sql.indexOf("$$", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (quote === ";") {
      const text = current.trim();
      if (text) out.push({ text, allow });
      current = "";
      allow = false;
      i += 1;
      continue;
    }
    current += quote;
    i += 1;
  }
  const tail = current.trim();
  if (tail) out.push({ text: tail, allow });
  return out;
}

function markerIn(text) {
  return ALLOW.test(text.trim());
}

function skipQuoted(sql, start, quote) {
  let i = start + 1;
  while (i < sql.length) {
    if (sql[i] === quote && sql[i + 1] === quote) {
      i += 2;
      continue;
    }
    if (sql[i] === quote) return i + 1;
    i += 1;
  }
  return sql.length;
}

function ident(token) {
  return token.replace(/"/g, "").split(".").pop().toLowerCase();
}

function tableOf(sql) {
  if (/^create\s+(unique\s+)?index\b/i.test(sql)) {
    const on = sql.match(/\bon\s+((?:"[^"]+"|\w+)(?:\s*\.\s*(?:"[^"]+"|\w+))?)/i);
    return on ? ident(on[1]) : null;
  }
  const match = sql.match(/\b(?:table|into|update|from)\s+((?:"[^"]+"|\w+)(?:\s*\.\s*(?:"[^"]+"|\w+))?)/i);
  return match ? ident(match[1]) : null;
}

function checkStatement(statement, tables, before) {
  const sql = statement.text.replace(/\s+/g, " ").trim();
  const table = tableOf(sql);
  const known = table ? tables.get(table) : undefined;
  const prior = table ? before.get(table) : undefined;
  const existed = Boolean(prior);

  if (/^alter\s+table\b/i.test(sql) && /\badd\s+column\b/i.test(sql)) {
    const column = columnAdded(sql);
    if (column && column.notNull && !column.hasDefault && existed) {
      return {
        code: "not-null-add",
        message: `ADD COLUMN ${column.name} NOT NULL without DEFAULT on existing table ${table}; add it nullable, backfill, then SET NOT NULL`,
      };
    }
  }

  if (/^alter\s+table\b/i.test(sql) && /\balter\s+column\b/i.test(sql) && /\bset\s+not\s+null\b/i.test(sql)) {
    const column = columnAltered(sql);
    const meta = known?.cols.get(column);
    const needsBackfill = existed && meta?.nullable !== false && !known?.backfilled?.has(column);
    if (needsBackfill) {
      return {
        code: "not-null-set",
        message: `SET NOT NULL on ${table}.${column} without an earlier UPDATE that assigns a non-null value in this migration`,
      };
    }
  }

  if (/^update\b/i.test(sql) && known) {
    for (const assignment of assignments(sql)) {
      if (!assignment.isNull) continue;
      const meta = known.cols.get(assignment.column);
      if (meta && meta.nullable === false) {
        return {
          code: "null-into-not-null",
          message: `UPDATE sets ${table}.${assignment.column} to NULL while the column is still NOT NULL; drop NOT NULL first`,
        };
      }
    }
  }

  if (isDestructive(sql) && !statement.allow) {
    return {
      code: "destructive",
      message: `destructive change requires a comment \`-- mas:allow-destructive <motivo>\` on the statement: ${sql.slice(0, 120)}`,
    };
  }

  if (isUniqueOnExisting(sql, existed, known) && !statement.allow) {
    return {
      code: "unique-on-existing",
      message: `unique index or constraint on existing table ${table} can fail when rows duplicate; backfill or mark \`-- mas:allow-destructive <motivo>\``,
    };
  }

  return null;
}

function columnAdded(sql) {
  const match = sql.match(/\badd\s+column\s+(?:if\s+not\s+exists\s+)?("?[a-zA-Z_][\w]*"?)\s+([\s\S]*)$/i);
  if (!match) return null;
  const rest = match[2];
  return {
    name: ident(match[1]),
    notNull: /\bnot\s+null\b/i.test(rest),
    hasDefault: /\bdefault\b/i.test(rest),
  };
}

function columnAltered(sql) {
  const match = sql.match(/\balter\s+column\s+("?[a-zA-Z_][\w]*"?)/i);
  return match ? ident(match[1]) : "";
}

function assignments(sql) {
  const set = sql.match(/\bset\s+([\s\S]*?)(?:\bwhere\b|\bfrom\b|\breturning\b|$)/i);
  if (!set) return [];
  return set[1].split(",").map((part) => {
    const bits = part.trim().match(/^("?[a-zA-Z_][\w]*"?)\s*=\s*([\s\S]+)$/);
    if (!bits) return null;
    return { column: ident(bits[1]), isNull: /^null\b/i.test(bits[2].trim()) };
  }).filter(Boolean);
}

function isDestructive(sql) {
  if (/^drop\s+table\b/i.test(sql)) return true;
  if (/^drop\s+schema\b/i.test(sql)) return true;
  if (/^truncate\b/i.test(sql)) return true;
  if (/^delete\s+from\b/i.test(sql) && !/\bwhere\b/i.test(sql)) return true;
  if (/^alter\s+table\b/i.test(sql) && /\bdrop\s+column\b/i.test(sql)) return true;
  if (/^alter\s+table\b/i.test(sql) && /\brename\s+(to|column)\b/i.test(sql)) return true;
  if (/^alter\s+table\b/i.test(sql) && /\balter\s+column\b/i.test(sql) && /\b(type|set\s+data\s+type)\b/i.test(sql)) {
    return true;
  }
  return false;
}

function isUniqueOnExisting(sql, existed) {
  if (!existed) return false;
  if (/^create\s+unique\s+index\b/i.test(sql)) return true;
  if (/^alter\s+table\b/i.test(sql) && /\badd\s+constraint\b/i.test(sql) && /\bunique\b/i.test(sql)) return true;
  return false;
}

function applyStatement(statement, tables) {
  const sql = statement.text.replace(/\s+/g, " ").trim();
  if (/^create\s+table\b/i.test(sql)) {
    const table = tableOf(sql);
    if (!table || tables.has(table)) return;
    const cols = new Map();
    const body = sql.slice(sql.indexOf("(") + 1, sql.lastIndexOf(")"));
    for (const part of splitComma(body)) {
      const piece = part.trim();
      if (/^(constraint|primary|unique|check|foreign)\b/i.test(piece)) continue;
      const name = piece.match(/^("?[a-zA-Z_][\w]*"?)\s+/);
      if (!name) continue;
      const notNull = /\bnot\s+null\b/i.test(piece) || /\bprimary\s+key\b/i.test(piece);
      cols.set(ident(name[1]), { nullable: !notNull });
    }
    tables.set(table, { cols, createdHere: true, hasRows: false, backfilled: new Set() });
    return;
  }

  const table = tableOf(sql);
  const known = table ? tables.get(table) : undefined;
  if (!known) return;

  if (/^insert\s+into\b/i.test(sql)) known.hasRows = true;

  if (/^alter\s+table\b/i.test(sql) && /\badd\s+column\b/i.test(sql)) {
    const column = columnAdded(sql);
    if (column) known.cols.set(column.name, { nullable: !column.notNull });
  }

  if (/^alter\s+table\b/i.test(sql) && /\bdrop\s+column\b/i.test(sql)) {
    const match = sql.match(/\bdrop\s+column\s+(?:if\s+exists\s+)?("?[a-zA-Z_][\w]*"?)/i);
    if (match) known.cols.delete(ident(match[1]));
  }

  if (/^alter\s+table\b/i.test(sql) && /\balter\s+column\b/i.test(sql) && /\bdrop\s+not\s+null\b/i.test(sql)) {
    const column = columnAltered(sql);
    const meta = known.cols.get(column);
    if (meta) meta.nullable = true;
  }

  if (/^alter\s+table\b/i.test(sql) && /\balter\s+column\b/i.test(sql) && /\bset\s+not\s+null\b/i.test(sql)) {
    const column = columnAltered(sql);
    const meta = known.cols.get(column) ?? { nullable: true };
    meta.nullable = false;
    known.cols.set(column, meta);
  }

  if (/^update\b/i.test(sql)) {
    for (const assignment of assignments(sql)) {
      if (!assignment.isNull) known.backfilled.add(assignment.column);
    }
  }

  if (/^drop\s+table\b/i.test(sql)) tables.delete(table);
}

function splitComma(body) {
  const parts = [];
  let current = "";
  let depth = 0;
  for (const char of body) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" });
  } catch {
    return null;
  }
}

function resolveBaseRef() {
  const explicit = process.env.MIGRATION_BASE_REF;
  if (explicit) return explicit;
  const pr = process.env.GITHUB_BASE_REF;
  const candidates = [];
  if (pr) candidates.push(`origin/${pr}`);
  candidates.push("origin/master", "origin/main", "master", "main");
  for (const candidate of candidates) {
    if (git(["rev-parse", "--verify", "--quiet", candidate]) !== null) return candidate;
  }
  return null;
}

function baselineFromGit(migrationsDir, ref) {
  const top = git(["rev-parse", "--show-toplevel"]);
  if (top === null) return null;
  const rel = relative(top.trim(), resolve(migrationsDir)).split("\\").join("/");
  const listed = git(["ls-tree", "-r", "--name-only", ref, "--", rel]);
  if (listed === null) return null;
  const files = [];
  for (const path of listed.split("\n")) {
    if (!path.endsWith("/migration.sql")) continue;
    const sql = git(["show", `${ref}:${path}`]);
    if (sql === null) continue;
    const name = relative(rel, path).split("\\").join("/");
    files.push({ name, sql });
  }
  return files;
}

function printErrors(errors) {
  for (const error of errors) {
    console.error(`${error.code}: ${error.file}: ${error.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const migrationsDir = argValue(args, "--migrations") ?? join(root, "apps/api/prisma/migrations");
  const baselineDir = argValue(args, "--baseline");
  const errors = lintMigrationTree(migrationsDir);
  if (baselineDir) {
    errors.push(...editedMigrationErrors(migrationsDir, baselineDir));
  } else if (!args.includes("--no-git")) {
    const ref = resolveBaseRef();
    if (!ref) {
      console.log("lint-migrations: no base ref; skipped edited-migration");
    } else {
      const baseFiles = baselineFromGit(migrationsDir, ref);
      if (baseFiles) {
        const headFiles = listSql(migrationsDir);
        const baseByName = new Map(baseFiles.map((file) => [file.name, file.sql.replace(/\r\n/g, "\n")]));
        for (const file of headFiles) {
          const baseSql = baseByName.get(file.name);
          if (baseSql === undefined) continue;
          if (baseSql !== file.sql.replace(/\r\n/g, "\n")) {
            errors.push({
              file: file.name,
              code: "edited-migration",
              message: `migration ${file.name} differs from ${ref}; add a new migration instead of editing one that is already on the base`,
            });
          }
        }
      }
    }
  }
  if (errors.length > 0) {
    printErrors(errors);
    process.exit(1);
  }
  console.log(`lint-migrations: ${listSql(migrationsDir).length} migration(s) ok`);
}

function argValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invoked) main();
