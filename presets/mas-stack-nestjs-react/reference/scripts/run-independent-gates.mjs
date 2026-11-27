/**
 * Run every gate even when an earlier one fails. Exit 1 if any failed.
 *
 *   node scripts/run-independent-gates.mjs --self-test
 *   node scripts/run-independent-gates.mjs -- node -e 'process.exit(1)' -- node -e 'process.exit(0)'
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function runIndependent(commands, cwd = process.cwd()) {
  const results = [];
  for (const command of commands) {
    const result = spawnSync(command[0], command.slice(1), { cwd, encoding: "utf8" });
    results.push({ status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" });
  }
  return { ok: results.every((result) => result.status === 0), results };
}

function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "gates-"));
  const marker = join(root, "semgrep-ran");
  try {
    const ran = runIndependent([
      [process.execPath, "-e", "process.exit(1)"],
      [process.execPath, "-e", `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ok')`],
    ], root);
    if (ran.ok || ran.results.length !== 2 || readFileSync(marker, "utf8") !== "ok") {
      console.error("un gate posterior no corrió o el conjunto no falló");
      process.exit(1);
    }
    console.log("run-independent-gates self-test ok");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv.includes("--self-test")) selfTest();
