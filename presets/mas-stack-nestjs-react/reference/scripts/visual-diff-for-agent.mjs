/**
 * Prints the cropped visual diff for the agent. Stops after two rounds.
 * Does not take a screenshot; it only copies a diff image Playwright already wrote.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MAX_ROUNDS = 2;

const roundPath = join(process.cwd(), ".specify", "telemetry", "visual-rounds");
const current = existsSync(roundPath) ? Number(readFileSync(roundPath, "utf8")) : 0;
if (current >= MAX_ROUNDS) {
  console.error("visual-diff: tope de 2 vueltas");
  process.exit(2);
}
mkdirSync(join(process.cwd(), ".specify", "telemetry"), { recursive: true });
writeFileSync(roundPath, String(current + 1), "utf8");
const diff = process.argv[2];
if (!diff || !existsSync(diff)) {
  console.log("visual-diff: sin imagen de diff");
  process.exit(0);
}
console.log(diff);
