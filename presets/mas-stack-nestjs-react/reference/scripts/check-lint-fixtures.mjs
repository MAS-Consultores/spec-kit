/**
 * Negative fixtures are ignored by `eslint .` so the skeleton stays green.
 * This script lints them with the same teaching rules and requires each one to fail.
 */
import { ESLint } from "eslint";
import comments from "@eslint-community/eslint-plugin-eslint-comments";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";
import importX from "eslint-plugin-import-x";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import mas, { boundaryElements, boundaryRule } from "../eslint/mas-plugin.js";

const cases = [
  {
    file: "apps/api/lint-fixtures/imports-web.ts",
    expects: [{ ruleId: "boundaries/dependencies", includes: "packages/contracts" }],
  },
  {
    file: "apps/api/lint-fixtures/uses-prisma.controller.ts",
    expects: [{ ruleId: "mas/no-prisma-at-edge", includes: "domain service" }],
  },
  {
    file: "apps/api/lint-fixtures/reads-env.service.ts",
    expects: [{ ruleId: "mas/no-process-env", includes: ".env.example" }],
  },
  {
    file: "apps/web/lint-fixtures/route-effect.tsx",
    expects: [{ ruleId: "mas/no-use-effect", includes: "TanStack Query" }],
  },
  {
    file: "apps/api/lint-fixtures/bare-ts-ignore.ts",
    expects: [{ ruleId: "@typescript-eslint/ban-ts-comment", includes: "@ts-ignore" }],
  },
  {
    file: "apps/api/lint-fixtures/disable-without-reason.ts",
    expects: [
      { ruleId: "@eslint-community/eslint-comments/require-description" },
      { ruleId: "mas/require-disable-justification", includes: "justification or ticket" },
    ],
  },
  {
    file: "apps/api/lint-fixtures/disable-explicit-any.ts",
    expects: [
      { ruleId: "@eslint-community/eslint-comments/no-restricted-disable", includes: "no-explicit-any" },
      { ruleId: "mas/require-disable-justification", includes: "forbidden outright" },
    ],
  },
  {
    file: "apps/api/lint-fixtures/service-imports-prisma.ts",
    expects: [{ ruleId: "mas/prisma-only-in-repositories", includes: "repository" }],
  },
  {
    file: "apps/api/lint-fixtures/global-module.ts",
    expects: [{ ruleId: "mas/no-global-module", includes: "apps/api/src/config" }],
  },
  {
    file: "apps/api/lint-fixtures/module-state.ts",
    expects: [{ ruleId: "mas/no-module-state", includes: "mutable module state" }],
  },
  {
    file: "apps/api/lint-fixtures/long-function.ts",
    expects: [{ ruleId: "max-lines-per-function" }],
  },
  {
    file: "apps/api/lint-fixtures/long-file.ts",
    expects: [{ ruleId: "max-lines" }],
  },
  {
    file: "apps/api/lint-fixtures/modules/billing/billing.repository.ts",
    expects: [{ ruleId: "mas/own-models-only", includes: "Prisma delegates" }],
  },
  {
    file: "apps/api/lint-fixtures/imports-contract-internal.ts",
    expects: [{ ruleId: "mas/contracts-public-index", includes: "@demo/contracts" }],
  },
  {
    file: "apps/web/lint-fixtures/app-router.tsx",
    expects: [{ ruleId: "mas/lazy-feature-routes", includes: "import()" }],
  },
  {
    file: "apps/web/lint-fixtures/shell/logout.tsx",
    expects: [{ ruleId: "mas/fetch-in-feature-data", includes: "props" }],
  },
  {
    file: "apps/api/lint-fixtures/modules/orphan/orphan.module.ts",
    expects: [{ ruleId: "mas/module-layout", includes: "index.ts" }],
  },
  {
    file: "apps/api/lint-fixtures/modules/billing/billing.service.ts",
    expects: [{ ruleId: "mas/public-module-api", includes: "public index" }],
  },
  {
    file: "apps/api/lint-fixtures/cycle/a.ts",
    expects: [{ ruleId: "import-x/no-cycle" }],
  },
];

const eslint = new ESLint({
  cwd: new URL("..", import.meta.url).pathname,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.{ts,tsx}"],
      plugins: {
        boundaries,
        "import-x": importX,
        "@eslint-community/eslint-comments": comments,
        "@typescript-eslint": tseslint.plugin,
        mas,
      },
      settings: {
        "boundaries/elements": boundaryElements,
        "import-x/resolver": { typescript: true },
        "import-x/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] },
        "import-x/extensions": [".js", ".ts", ".tsx"],
      },
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: {
        "boundaries/dependencies": boundaryRule,
        "mas/no-process-env": "error",
        "mas/no-prisma-at-edge": "error",
        "mas/no-use-effect": "error",
        "mas/require-disable-justification": "error",
        "mas/prisma-only-in-repositories": "error",
        "mas/no-global-module": "error",
        "mas/no-module-state": "error",
        "mas/public-module-api": "error",
        "mas/own-models-only": "error",
        "mas/contracts-public-index": "error",
        "mas/lazy-feature-routes": "error",
        "mas/fetch-in-feature-data": "error",
        "mas/module-layout": "error",
        "import-x/no-cycle": "error",
        "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
        "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
        "@typescript-eslint/ban-ts-comment": [
          "error",
          {
            "ts-ignore": "allow-with-description",
            "ts-expect-error": "allow-with-description",
            minimumDescriptionLength: 10,
          },
        ],
        "@eslint-community/eslint-comments/require-description": "error",
        "@eslint-community/eslint-comments/no-restricted-disable": [
          "error",
          "@typescript-eslint/no-explicit-any",
        ],
      },
    },
  ],
});

let failed = false;
for (const item of cases) {
  const results = await eslint.lintFiles([item.file]);
  const messages = results.flatMap((result) => result.messages);
  const misses = item.expects.filter(
    (expected) =>
      !messages.some(
        (message) =>
          message.ruleId === expected.ruleId &&
          (expected.includes === undefined ||
            (typeof message.message === "string" && message.message.includes(expected.includes))),
      ),
  );
  if (misses.length > 0) {
    failed = true;
    console.error(`fixture ${item.file} missed ${JSON.stringify(misses)}`);
    for (const message of messages) {
      console.error(`  ${message.ruleId ?? "parse"}: ${message.message}`);
    }
  } else {
    console.log(`fixture ok ${item.file}`);
  }
}
if (failed) process.exit(1);

const cruiseRoot = new URL("..", import.meta.url).pathname;
const cruiseBin = join(cruiseRoot, "node_modules/.bin/depcruise");
try {
  execFileSync(cruiseBin, ["apps/api/lint-fixtures/cycle", "--config", ".dependency-cruiser.fixtures.cjs"], {
    cwd: cruiseRoot,
    stdio: "pipe",
  });
  console.error("dependency-cruiser accepted a module cycle");
  process.exit(1);
} catch (error) {
  const stderr = error instanceof Error && "stderr" in error ? String(error.stderr) : "";
  const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
  const text = `${stdout}\n${stderr}`;
  if (!text.includes("no-circular") && !text.includes("circular")) {
    console.error(text);
    console.error("dependency-cruiser did not report the cycle fixture");
    process.exit(1);
  }
  console.log("fixture ok dependency-cruiser cycle");
}
console.log("lint-fixtures ok");
