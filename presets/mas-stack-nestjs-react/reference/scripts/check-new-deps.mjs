/**
 * New lockfile packages must exist, be 30 days old, and use an allowed license.
 *   node scripts/check-new-deps.mjs --self-test
 *   node scripts/check-new-deps.mjs --base origin/main
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

const DAY = 24 * 60 * 60 * 1000;
const NAME = /(?:^|\n) {2}['"]?((?:@[a-z0-9-]+\/)?[a-z0-9._-]+)@/gi;

export function packageNames(lock) {
  return new Set([...lock.matchAll(NAME)].map((match) => match[1]));
}

function allowedLicenses(root) {
  const gates = JSON.parse(readFileSync(join(root, "quality-gates.json"), "utf8"));
  return new Set(gates.deps.allowedLicenses);
}

function waived(body, name) {
  const section = body.split("## Excepciones de gates")[1] ?? "";
  return section.includes(name);
}

export function review(names, registry, licenses, now, body) {
  const problems = [];
  for (const name of names) {
    if (waived(body, name)) continue;
    const record = registry[name];
    if (!record) {
      problems.push(`${name}: el registro npm no tiene el paquete`);
      continue;
    }
    if (!record.responded) {
      problems.push(`${name}: el registro npm no respondió`);
      continue;
    }
    const age = now - Date.parse(record.first);
    if (Number.isNaN(age) || age < 30 * DAY) problems.push(`${name}: la primera versión tiene menos de 30 días`);
    if (!licenses.has(record.license)) problems.push(`${name}: licencia ${record.license} fuera de la allowlist`);
  }
  return problems;
}

async function lookup(name, root) {
  const cache = join(root, "node_modules/.cache/npm-registry", `${name.replace("/", "__")}.json`);
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8"));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://registry.npmjs.org/${name}`, { signal: controller.signal });
    if (response.status === 404) return { responded: true, missing: true };
    if (!response.ok) return { responded: false };
    const payload = await response.json();
    const stamps = Object.entries(payload.time ?? {}).filter(([key]) => key !== "created" && key !== "modified");
    const first = stamps.map(([, value]) => value).sort()[0];
    const version = payload["dist-tags"]?.latest;
    const license = payload.versions?.[version]?.license ?? payload.license ?? "";
    const record = { responded: true, first, license: String(license) };
    mkdirSync(dirname(cache), { recursive: true });
    writeFileSync(cache, JSON.stringify(record));
    return record;
  } catch {
    return { responded: false };
  } finally {
    clearTimeout(timer);
  }
}

function selfTest() {
  const root = new URL(".", import.meta.url).pathname.replace(/scripts\/$/, "");
  const licenses = allowedLicenses(root);
  const now = Date.parse("2026-11-27T00:00:00.000Z");
  const registry = {
    young: { responded: true, first: "2026-11-10T00:00:00.000Z", license: "MIT" },
    gone: undefined,
    quiet: { responded: false },
    copyleft: { responded: true, first: "2020-01-01T00:00:00.000Z", license: "GPL-3.0" },
    ready: { responded: true, first: "2020-01-01T00:00:00.000Z", license: "MIT" },
  };
  const added = packageNames("packages:\n  ready@1.0.0:\n  young@1.0.0:\n").difference?.(
    packageNames("packages:\n  ready@1.0.0:\n"),
  );
  const fresh = [...(added ?? ["young"])];
  const young = review(fresh.length ? fresh : ["young"], registry, licenses, now, "");
  const missing = review(["gone"], registry, licenses, now, "");
  const silent = review(["quiet"], registry, licenses, now, "");
  const license = review(["copyleft"], registry, licenses, now, "");
  const excused = review(["copyleft"], registry, licenses, now, "## Excepciones de gates\ncopyleft\n");
  const fine = review(["ready"], registry, licenses, now, "");
  if (young.length !== 1 || missing.length !== 1 || silent.length !== 1 || license.length !== 1 || excused.length !== 0 || fine.length !== 0) {
    console.error({ young, missing, silent, license, excused, fine });
    process.exit(1);
  }
  console.log("check-new-deps self-test ok");
}

async function live() {
  const baseArg = process.argv.indexOf("--base");
  const base = baseArg === -1 ? `origin/${process.env.GITHUB_BASE_REF ?? "main"}` : process.argv[baseArg + 1];
  let previous = "";
  try {
    const merge = execFileSync("git", ["merge-base", "HEAD", base], { encoding: "utf8" }).trim();
    previous = execFileSync("git", ["show", `${merge}:pnpm-lock.yaml`], { encoding: "utf8" });
  } catch {
    console.error("check-new-deps: no pude leer pnpm-lock.yaml en el merge-base");
    process.exit(1);
  }
  const head = readFileSync("pnpm-lock.yaml", "utf8");
  const novel = [...packageNames(head)].filter((name) => !packageNames(previous).has(name));
  const registry = {};
  for (const name of novel) {
    const record = await lookup(name, process.cwd());
    registry[name] = record.missing ? undefined : record;
  }
  const problems = review(novel, registry, allowedLicenses(process.cwd()), Date.now(), process.env.PR_BODY ?? "");
  if (problems.length) {
    for (const line of problems) console.error(`check-new-deps: ${line}`);
    process.exit(1);
  }
  console.log(`check-new-deps ok (${novel.length} nuevos)`);
}

if (process.argv.includes("--self-test")) selfTest();
else if (process.argv[1]?.endsWith("check-new-deps.mjs")) live();
