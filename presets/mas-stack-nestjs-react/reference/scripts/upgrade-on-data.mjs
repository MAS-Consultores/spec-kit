/**
 * Apply the base schema, seed that same database, then deploy the new migrations.
 *
 * --split-last: no git base. Deploy every migration except the newest, seed, then deploy the newest.
 * --prove-reject: deploy the oldest migration, insert one row, and require a NULL-into-NOT-NULL
 *   migration to fail. Restores prisma/migrations before exiting.
 *
 * The seed step unsets SEED_DATABASE_URL so the loopback rule writes into DATABASE_URL
 * (the database that just received the base migrations). CI keeps a separate
 * SEED_DATABASE_URL for e2e; this process does not use it.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "apps/api/prisma/migrations");

function migrationDirs() {
  return readdirSync(migrationsDir)
    .filter((name) => {
      const folder = join(migrationsDir, name);
      return statSync(folder).isDirectory() && existsSync(join(folder, "migration.sql"));
    })
    .sort();
}

function run(command, args, env) {
  execFileSync(command, args, { cwd: root, env, stdio: "inherit" });
}

function runStatus(command, args, env) {
  try {
    execFileSync(command, args, { cwd: root, env, stdio: "pipe" });
    return 0;
  } catch (error) {
    const stdout = error.stdout?.toString() ?? "";
    const stderr = error.stderr?.toString() ?? "";
    process.stderr.write(stdout);
    process.stderr.write(stderr);
    return error.status ?? 1;
  }
}

function deploy(env) {
  run("pnpm", ["--filter", "@demo/api", "exec", "prisma", "migrate", "deploy"], env);
}

function seedSameDatabase(env) {
  const child = { ...env };
  delete child.SEED_DATABASE_URL;
  run("pnpm", ["db:seed"], child);
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" });
  } catch {
    return null;
  }
}

function baseRef() {
  if (process.env.MIGRATION_BASE_REF) return process.env.MIGRATION_BASE_REF;
  const pr = process.env.GITHUB_BASE_REF;
  const candidates = [];
  if (pr) candidates.push(`origin/${pr}`);
  candidates.push("origin/master", "origin/main", "master", "main");
  for (const candidate of candidates) {
    if (git(["rev-parse", "--verify", "--quiet", candidate]) !== null) return candidate;
  }
  return null;
}

function hide(names) {
  const park = mkdtempSync(join(tmpdir(), "mas-migrations-"));
  for (const name of names) renameSync(join(migrationsDir, name), join(park, name));
  return park;
}

function restore(park, names) {
  for (const name of names) {
    const from = join(park, name);
    if (existsSync(from)) renameSync(from, join(migrationsDir, name));
  }
  rmSync(park, { recursive: true, force: true });
}

function splitLast(env) {
  const names = migrationDirs();
  if (names.length < 2) {
    deploy(env);
    seedSameDatabase(env);
    deploy(env);
    console.log("upgrade-on-data: fewer than 2 migrations; deploy and seed only");
    return;
  }
  const newest = names[names.length - 1];
  const park = hide([newest]);
  try {
    deploy(env);
    seedSameDatabase(env);
  } finally {
    restore(park, [newest]);
  }
  deploy(env);
  console.log(`upgrade-on-data: applied ${newest} on top of seeded data`);
}

function proveReject(env) {
  const names = migrationDirs();
  const oldest = names[0];
  if (!oldest) {
    console.error("upgrade-on-data: no migrations to prove");
    process.exit(1);
  }
  const hidden = names.slice(1);
  const park = hide(hidden);
  const badName = "20990101000000_unsafe_null";
  const badDir = join(migrationsDir, badName);
  try {
    deploy(env);
    run("psql", [env.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-c",
      "INSERT INTO users (id, email, password_hash) VALUES ('upgrade-probe', 'probe@localhost', 'hash')"], env);
    mkdirSync(badDir);
    writeFileSync(
      join(badDir, "migration.sql"),
      "UPDATE \"users\" SET \"email\" = NULL WHERE \"email\" = 'probe@localhost';\n",
    );
    const status = runStatus("pnpm", ["--filter", "@demo/api", "exec", "prisma", "migrate", "deploy"], env);
    if (status === 0) {
      console.error("upgrade-on-data: NULL into NOT NULL was applied; the gate must reject it");
      process.exit(1);
    }
    console.log("upgrade-on-data: rejected NULL into a NOT NULL column");
  } finally {
    rmSync(badDir, { recursive: true, force: true });
    restore(park, hidden);
  }
}

function fromGit(env) {
  const ref = baseRef();
  if (!ref) {
    console.error("upgrade-on-data: no base ref. Set MIGRATION_BASE_REF or fetch origin/master.");
    process.exit(1);
  }
  const top = git(["rev-parse", "--show-toplevel"]);
  const rel = migrationsDir.slice(top.trim().length + 1).split("\\").join("/");
  const listed = git(["ls-tree", "-d", "--name-only", ref, rel]);
  if (listed === null) {
    console.error(`upgrade-on-data: cannot list ${rel} at ${ref}`);
    process.exit(1);
  }
  const onBase = new Set(
    listed.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => line.split("/").pop()),
  );
  const extra = migrationDirs().filter((name) => !onBase.has(name));
  const park = hide(extra);
  try {
    deploy(env);
    seedSameDatabase(env);
  } finally {
    restore(park, extra);
  }
  deploy(env);
  console.log(`upgrade-on-data: deployed ${extra.length} new migration(s) onto ${ref}`);
}

const args = process.argv.slice(2);
const env = process.env;
if (!env.DATABASE_URL || env.DATABASE_URL.trim() === "") {
  console.error("upgrade-on-data: DATABASE_URL is required");
  process.exit(1);
}
if (args.includes("--prove-reject")) proveReject(env);
else if (args.includes("--split-last")) splitLast(env);
else fromGit(env);
