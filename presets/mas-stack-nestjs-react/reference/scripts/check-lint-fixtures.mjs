/**
 * Negative fixtures are ignored by `eslint .` so the skeleton stays green.
 * This script lints them with the same teaching rules and requires each one to fail.
 */
import { ESLint } from "eslint";
import comments from "@eslint-community/eslint-plugin-eslint-comments";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";
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
];

const eslint = new ESLint({
  cwd: new URL("..", import.meta.url).pathname,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.{ts,tsx}"],
      plugins: {
        boundaries,
        "@eslint-community/eslint-comments": comments,
        "@typescript-eslint": tseslint.plugin,
        mas,
      },
      settings: { "boundaries/elements": boundaryElements },
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
console.log("lint-fixtures ok");
