/**
 * Frozen public exports of each index.ts.
 * A drift on an unchanged file warns. A drift on a new or modified index is an
 * error until api-snapshots/JUSTIFICATION.md names that file.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const referenceRoot = fileURLToPath(new URL("..", import.meta.url));
const EXPORT_RE = /export\s+(?:type\s+)?(?:async\s+)?(?:function|const|class|interface|enum)\s+([A-Za-z0-9_]+)|export\s+\{([^}]+)\}|export\s+type\s+\{([^}]+)\}/g;

export function exportsOf(source) {
  const names = new Set();
  for (const match of source.matchAll(EXPORT_RE)) {
    if (match[1]) names.add(match[1]);
    const group = match[2] || match[3];
    if (!group) continue;
    for (const part of group.split(",")) {
      const piece = part.trim();
      if (!piece) continue;
      const alias = piece.includes(" as ") ? piece.split(" as ").pop() : piece;
      names.add(alias.trim());
    }
  }
  return [...names].sort();
}

function walkIndexes(root, dir, out) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (entry === "node_modules" || entry === "lint-fixtures" || entry === "dist" || entry === "generated") continue;
    const info = statSync(path);
    if (info.isDirectory()) walkIndexes(root, path, out);
    else if (entry === "index.ts") out.push(relative(root, path).split("\\").join("/"));
  }
}

function snapshotPath(root, indexFile) {
  return join(root, "api-snapshots", `${indexFile.replaceAll("/", "__")}.json`);
}

function gitChanged(root) {
  try {
    const stdout = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return new Set(stdout.split("\n").map((line) => line.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function reviewIndexes(root, { write }) {
  const indexes = [];
  for (const folder of ["apps", "packages"]) {
    const dir = join(root, folder);
    if (existsSync(dir)) walkIndexes(root, dir, indexes);
  }
  const changed = gitChanged(root);
  const justification = existsSync(join(root, "api-snapshots", "JUSTIFICATION.md"))
    ? readFileSync(join(root, "api-snapshots", "JUSTIFICATION.md"), "utf8")
    : "";
  const errors = [];
  const warnings = [];
  for (const indexFile of indexes) {
    const names = exportsOf(readFileSync(join(root, indexFile), "utf8"));
    const path = snapshotPath(root, indexFile);
    if (write) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify(names, null, 2)}\n`, "utf8");
      continue;
    }
    if (!existsSync(path)) {
      errors.push(`sin snapshot ${indexFile}`);
      continue;
    }
    const previous = JSON.parse(readFileSync(path, "utf8"));
    if (JSON.stringify(previous) === JSON.stringify(names)) continue;
    const touched = changed.has(indexFile);
    if (touched && !justification.includes(indexFile)) {
      errors.push(`API pública ${indexFile} cambió sin justificación`);
    } else if (!touched) {
      warnings.push(`API pública ${indexFile} no coincide con el snapshot`);
    }
  }
  return { errors, warnings, indexes };
}

function selfTest() {
  const names = exportsOf("export const healthResponse = 1;\nexport type { Login };\nexport { HealthModule };\n");
  if (JSON.stringify(names) !== JSON.stringify(["HealthModule", "Login", "healthResponse"])) {
    console.error(names);
    process.exit(1);
  }
  const root = mkdtempSync(join(tmpdir(), "api-"));
  try {
    mkdirSync(join(root, "packages", "contracts", "src"), { recursive: true });
    writeFileSync(join(root, "packages", "contracts", "src", "index.ts"), "export const healthResponse = true;\n", "utf8");
    const missing = reviewIndexes(root, { write: false });
    if (!missing.errors.some((line) => line.includes("sin snapshot"))) {
      console.error("un index nuevo sin snapshot tiene que ser error");
      process.exit(1);
    }
    reviewIndexes(root, { write: true });
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["-c", "user.email=a@b.c", "-c", "user.name=t", "commit", "-qm", "base"], { cwd: root });
    writeFileSync(join(root, "packages", "contracts", "src", "index.ts"), "export const healthResponse = true;\nexport const extra = 1;\n", "utf8");
    const drifted = reviewIndexes(root, { write: false });
    if (!drifted.errors.some((line) => line.includes("sin justificación"))) {
      console.error("el diff de un index tiene que exigir justificación");
      process.exit(1);
    }
    mkdirSync(join(root, "api-snapshots"), { recursive: true });
    writeFileSync(join(root, "api-snapshots", "JUSTIFICATION.md"), "packages/contracts/src/index.ts respuesta de health\n", "utf8");
    const justified = reviewIndexes(root, { write: false });
    if (justified.errors.length) {
      console.error(justified.errors);
      process.exit(1);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  console.log("check-public-api self-test ok");
}

if (process.argv.includes("--self-test")) selfTest();
else if (process.argv.includes("--write")) {
  reviewIndexes(referenceRoot, { write: true });
  console.log("snapshots escritos");
} else {
  const live = reviewIndexes(process.cwd(), { write: false });
  for (const warning of live.warnings) console.log(`warn ${warning}`);
  if (live.errors.length) {
    console.error(live.errors.join("\n"));
    process.exit(1);
  }
  console.log(`check-public-api ok ${live.indexes.length}`);
}
