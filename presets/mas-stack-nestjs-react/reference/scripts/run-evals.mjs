/**
 * Minimal harness evals. No network and no model calls.
 *   node scripts/run-evals.mjs
 */
import { coverageRatio } from "./check-diff-coverage.mjs";
import { mutationPlan } from "./check-mutation.mjs";
import { renderHarness } from "./harness-report.mjs";
import { summarizeFindings, lintFindings } from "./harness-telemetry.mjs";

const cases = [
  {
    id: "mutation-exclude",
    run() {
      const plan = mutationPlan({
        mutation: {
          modules: ["employees"],
          threshold: 80,
          paths: { employees: "apps/api/src/modules/employees" },
          exclude: ["**/*.repository.ts"],
        },
      }, [
        "apps/api/src/modules/employees/employees.repository.ts",
        "apps/api/src/modules/employees/employees.service.ts",
      ]);
      if (plan.mutate.length !== 1) throw new Error(plan.mutate.join(","));
    },
  },
  {
    id: "coverage-skips-reference",
    run() {
      const result = coverageRatio(
        "",
        "diff --git a/.specify/reference/apps/api/src/miss.ts b/.specify/reference/apps/api/src/miss.ts\n--- a/.specify/reference/apps/api/src/miss.ts\n+++ b/.specify/reference/apps/api/src/miss.ts\n@@ -0,0 +1,1 @@\n+export const value = 1;\n",
        0.8,
      );
      if (!result.ok || result.lineTotal !== 0) throw new Error("reference counted");
    },
  },
  {
    id: "lint-counts-and-weekly-report",
    run() {
      const summary = summarizeFindings(lintFindings('{"diagnostics":[{"filename":"apps/api/src/pay.ts","code":"eslint(complexity)"}]}'));
      const markdown = renderHarness([{
        feature: "nomina",
        gate: "lint",
        ok: false,
        phase: "ci",
        round: 1,
        durationMs: 5,
        at: "2026-11-02T00:00:00Z",
        byRule: summary.byRule,
        byFile: summary.byFile,
      }]);
      if (!markdown.includes("| complexity | 1 |") || !markdown.includes("pay.ts") || !markdown.includes("2026-W")) {
        throw new Error("report");
      }
    },
  },
];

let failed = 0;
for (const item of cases) {
  try {
    item.run();
    console.log(`pass ${item.id}`);
  } catch (error) {
    failed += 1;
    console.error(`fail ${item.id}: ${error instanceof Error ? error.message : error}`);
  }
}
console.log(`evals ${cases.length - failed}/${cases.length}`);
if (failed > 0) process.exit(1);
