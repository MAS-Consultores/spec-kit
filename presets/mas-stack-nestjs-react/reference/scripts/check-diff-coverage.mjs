/**
 * Lines and branches touched by the diff need >= 80% coverage.
 * There is no global threshold. An empty diff passes.
 *
 *   node scripts/check-diff-coverage.mjs --self-test
 *   node scripts/check-diff-coverage.mjs --lcov coverage/lcov.info --diff diff.txt
 */
import { readFileSync } from "node:fs";
import { addedLineMap } from "./check-diff-quality.mjs";

const DEFAULT_THRESHOLD = 0.8;

function parseLcov(text) {
  const files = new Map();
  let current = "";
  for (const line of text.split("\n")) {
    if (line.startsWith("SF:")) {
      current = line.slice(3);
      files.set(current, { lines: new Map(), branches: [] });
    } else if (line.startsWith("DA:") && current) {
      const [lineNo, hits] = line.slice(3).split(",");
      files.get(current).lines.set(Number(lineNo), Number(hits));
    } else if (line.startsWith("BRDA:") && current) {
      const parts = line.slice(5).split(",");
      const taken = parts[3] === "-" ? 0 : Number(parts[3]);
      files.get(current).branches.push({ line: Number(parts[0]), taken });
    }
  }
  return files;
}

export function coverageRatio(lcovText, diffText, threshold) {
  if (threshold <= 0) return { ok: true, reason: "umbral apagado" };
  const added = addedLineMap(diffText);
  const lcov = parseLcov(lcovText);
  let lineHit = 0;
  let lineTotal = 0;
  let branchHit = 0;
  let branchTotal = 0;
  for (const [file, lines] of added) {
    const record = [...lcov.entries()].find(([name]) => name.endsWith(file) || file.endsWith(name));
    if (!record) continue;
    const data = record[1];
    for (const line of lines) {
      if (!data.lines.has(line)) continue;
      lineTotal += 1;
      if ((data.lines.get(line) ?? 0) > 0) lineHit += 1;
    }
    for (const branch of data.branches) {
      if (!lines.has(branch.line)) continue;
      branchTotal += 1;
      if (branch.taken > 0) branchHit += 1;
    }
  }
  const lineRatio = lineTotal === 0 ? 1 : lineHit / lineTotal;
  const branchRatio = branchTotal === 0 ? 1 : branchHit / branchTotal;
  const ok = lineRatio + 1e-9 >= threshold && branchRatio + 1e-9 >= threshold;
  return { ok, lineRatio, branchRatio, lineHit, lineTotal, branchHit, branchTotal };
}

function selfTest() {
  const lcov = "SF:src/pay.ts\nDA:2,1\nDA:3,0\nBRDA:2,0,0,1\nBRDA:2,0,1,0\nend_of_record\n";
  const diff = "diff --git a/src/pay.ts b/src/pay.ts\n--- a/src/pay.ts\n+++ b/src/pay.ts\n@@ -1,0 +2,2 @@\n+covered\n+missed\n";
  const failing = coverageRatio(lcov, diff, 0.8);
  const off = coverageRatio(lcov, diff, 0);
  const passing = coverageRatio("SF:src/pay.ts\nDA:2,1\nDA:3,2\nBRDA:2,0,0,1\nBRDA:2,0,1,1\nend_of_record\n", diff, 0.8);
  if (failing.ok) {
    console.error("self-test: 50% de líneas nuevas debe fallar el 80%");
    process.exit(1);
  }
  if (!off.ok) {
    console.error("self-test: con el umbral en 0 el mismo diff pasa");
    process.exit(1);
  }
  if (!passing.ok) {
    console.error("self-test: cobertura completa del diff debe pasar");
    process.exit(1);
  }
  console.log("check-diff-coverage self-test ok");
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const lcovFlag = process.argv.indexOf("--lcov");
  const diffFlag = process.argv.indexOf("--diff");
  if (lcovFlag === -1 || diffFlag === -1) {
    console.log("check-diff-coverage: sin lcov en este paso (el self-test cubre el umbral)");
    process.exit(0);
  }
  const result = coverageRatio(
    readFileSync(process.argv[lcovFlag + 1], "utf8"),
    readFileSync(process.argv[diffFlag + 1], "utf8"),
    DEFAULT_THRESHOLD,
  );
  if (!result.ok) {
    console.error(
      `cobertura del diff por debajo del 80% (líneas ${result.lineHit}/${result.lineTotal}, ramas ${result.branchHit}/${result.branchTotal})`,
    );
    process.exit(1);
  }
  console.log("diff coverage ok");
}
