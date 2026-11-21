/**
 * Fixture for secret detection. The CI job runs gitleaks itself.
 * This script proves the fixture: with the rule off the secret is ignored;
 * with the rule on it fails and names generic-api-key.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SECRET = "api_key = 'AKIAIOSFODNN7EXAMPLE'";
const RULE = /AKIA[0-9A-Z]{16}/;

function scan(text, enabled) {
  if (!enabled) return [];
  return RULE.test(text) ? ["generic-api-key"] : [];
}

function selfTest() {
  if (scan(SECRET, false).length !== 0) {
    console.error("self-test: con la regla apagada el secreto no se reporta");
    process.exit(1);
  }
  const hits = scan(SECRET, true);
  if (!hits.includes("generic-api-key")) {
    console.error("self-test: con la regla activa el fixture debe nombrar generic-api-key");
    process.exit(1);
  }
  if (scan("export const label = 'health';", true).length !== 0) {
    console.error("self-test: un archivo limpio no dispara la regla");
    process.exit(1);
  }
  const configPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".gitleaks.toml");
  const config = readFileSync(configPath, "utf8");
  if (!config.includes("useDefault = true")) {
    console.error("self-test: .gitleaks.toml sin useDefault reemplaza las reglas y el job queda en verde");
    process.exit(1);
  }
  const binFlag = process.argv.indexOf("--gitleaks");
  const bin = binFlag === -1 ? "" : process.argv[binFlag + 1];
  if (bin) {
    const dir = mkdtempSync(join(tmpdir(), "gitleaks-fixture-"));
    const accessKey = ["AKIA", "A1B2C3D4E5F6G7H8"].join("");
    const secretKey = ["abcdefghijklmnopqrstuvwxyz0123456789", "ABCD"].join("");
    writeFileSync(
      join(dir, "leak.ts"),
      `export const key = "${accessKey}";\nexport const aws_secret_access_key = "${secretKey}";\n`,
      "utf8",
    );
    let failed = false;
    try {
      execFileSync(bin, ["detect", "--no-git", "--source", dir, "--redact", "--exit-code", "1", "--config", configPath], { stdio: "pipe" });
    } catch {
      failed = true;
    }
    rmSync(dir, { recursive: true, force: true });
    if (!failed) {
      console.error("self-test: gitleaks aceptó el fixture con un access key");
      process.exit(1);
    }
    console.log("gitleaks binary rejected the fixture");
  }
  console.log("check-gitleaks-fixture self-test ok");
}

selfTest();
