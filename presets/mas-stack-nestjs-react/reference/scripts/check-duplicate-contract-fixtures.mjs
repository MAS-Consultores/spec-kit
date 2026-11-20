import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const script = join(root, "scripts/check-duplicate-contract-types.mjs");

function run(contracts, apps) {
  return execFileSync(process.execPath, [script, join(root, contracts), join(root, apps)], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
}

try {
  run("scripts/fixtures/duplicate-types/contracts", "scripts/fixtures/duplicate-types/apps");
  console.error("duplicate contract type was accepted");
  process.exit(1);
} catch (error) {
  const text = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  if (!text.includes("redeclares SessionStamp")) {
    console.error(text);
    process.exit(1);
  }
  console.log("fixture ok redeclared contract type");
}

const clean = run("scripts/fixtures/duplicate-types-ok/contracts", "scripts/fixtures/duplicate-types-ok/apps");
if (!clean.includes("contract types ok")) {
  console.error(clean);
  process.exit(1);
}
console.log("fixture ok distinct contract type");
