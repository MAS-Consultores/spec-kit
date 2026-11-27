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
import sonarjs from "eslint-plugin-sonarjs";
import mas, { boundaryElements, boundaryRule } from "../eslint/mas-plugin.js";
import { restrictedImports } from "../eslint/package2-rules.js";

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
    expects: [
      { ruleId: "mas/no-process-env", includes: ".env.example", severity: "error" },
      { ruleId: "mas/no-raw-process-env", includes: ".env.example", severity: "error" },
    ],
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
  {
    file: "apps/api/lint-fixtures/mcp-bypass.guard.ts",
    expects: [{ ruleId: "mas/no-url-includes-in-guards", includes: "parsed path" }],
  },
  {
    file: "apps/web/lint-fixtures/icons/wrong-library.tsx",
    expects: [{ ruleId: "mas/icon-library", includes: "ui.icons.json" }],
  },
  {
    file: "apps/web/lint-fixtures/icons/direct-library.tsx",
    expects: [{ ruleId: "mas/icon-library", includes: "central module" }],
  },
  {
    file: "apps/web/lint-fixtures/icons/literal-color.tsx",
    expects: [{ ruleId: "mas/no-literal-color", includes: "text-[#fff]" }],
  },
  {
    file: "apps/web/lint-fixtures/i18n/change-in-render.tsx",
    expects: [{ ruleId: "mas/no-i18n-mutation-in-render", includes: "during render" }],
  },
  {
    file: "apps/web/lint-fixtures/i18n/effect-without-guard.tsx",
    expects: [{ ruleId: "mas/no-i18n-mutation-in-render", includes: "needs a guard" }],
  },
  {
    file: "apps/web/lint-fixtures/i18n/module-t.ts",
    expects: [{ ruleId: "mas/no-module-translation", includes: "module scope" }],
  },
  {
    file: "apps/web/lint-fixtures/i18n/nav-literal.ts",
    expects: [{ ruleId: "mas/no-module-translation", includes: "labelKey" }],
  },
  {
    file: "apps/web/lint-fixtures/i18n/jsx-literal.tsx",
    expects: [{ ruleId: "mas/no-literal-copy", includes: "locales/*.json" }],
  },
  {
    file: "apps/api/lint-fixtures/missing-audit.controller.ts",
    expects: [{ ruleId: "mas/require-audit-on-mutations", includes: "@Audit" }],
  },
  {
    file: "apps/api/lint-fixtures/unknown-audit.controller.ts",
    expects: [{ ruleId: "mas/require-audit-on-mutations", includes: "catalog" }],
  },
  {
    file: "apps/api/lint-fixtures/base64-upload.dto.ts",
    expects: [
      { ruleId: "mas/no-base64-file-upload", includes: "multipart/form-data" },
      { ruleId: "mas/base64-upload-max-length", includes: "1_048_576" },
    ],
  },
  {
    file: "apps/api/lint-fixtures/base64-upload-too-big.dto.ts",
    expects: [{ ruleId: "mas/base64-upload-max-length", includes: "1_048_576" }],
  },
  {
    file: "apps/api/lint-fixtures/base64-buffer.service.ts",
    expects: [{ ruleId: "mas/no-base64-file-upload", includes: "Buffer.from" }],
  },
  {
    file: "apps/api/lint-fixtures/upload-no-limit.controller.ts",
    expects: [{ ruleId: "mas/multipart-upload-limits", includes: "limits.fileSize" }],
  },
  {
    file: "apps/api/lint-fixtures/upload-no-type.controller.ts",
    expects: [{ ruleId: "mas/multipart-upload-limits", includes: "FileTypeValidator" }],
  },
  {
    file: "apps/api/lint-fixtures/import-xlsx.service.ts",
    expects: [{ ruleId: "mas/no-handrolled-format-parsers", includes: "exceljs" }],
  },
  {
    file: "apps/api/lint-fixtures/zlib-inflate.service.ts",
    expects: [{ ruleId: "mas/no-handrolled-format-parsers", includes: "inflateRaw" }],
  },
  {
    file: "apps/api/lint-fixtures/sheet-xml.service.ts",
    expects: [{ ruleId: "mas/no-handrolled-format-parsers", includes: "sheetData" }],
  },
  {
    file: "apps/api/lint-fixtures/csv-split.service.ts",
    expects: [{ ruleId: "mas/no-handrolled-format-parsers", includes: "csv-parse" }],
  },
  {
    file: "apps/api/lint-fixtures/pdf-handrolled.service.ts",
    expects: [{ ruleId: "mas/no-handrolled-format-parsers", includes: "pdf-lib" }],
  },
  {
    file: "apps/api/lint-fixtures/regex-sanitize.service.ts",
    expects: [{ ruleId: "mas/no-regex-html-sanitize", includes: "DOMPurify", severity: "error" }],
  },
  {
    file: "apps/web/lint-fixtures/dangerous-html.tsx",
    expects: [{ ruleId: "mas/no-dangerous-html-unsanitized", includes: "DOMPurify.sanitize", severity: "error" }],
  },
  {
    file: "apps/api/lint-fixtures/email/handmade-mail.ts",
    expects: [{ ruleId: "mas/no-handmade-email-html", includes: "mjml2html", severity: "error" }],
  },
  {
    file: "apps/api/lint-fixtures/email/triple-stash.ts",
    expects: [{ ruleId: "mas/no-handmade-email-html", includes: "{{{", severity: "error" }],
  },
  {
    file: "apps/api/lint-fixtures/timer-schedule.service.ts",
    expects: [{ ruleId: "mas/no-timer-scheduling", includes: "approved-libraries.md", severity: "warn" }],
  },
  {
    file: "apps/web/lint-fixtures/charts/handmade-chart.tsx",
    expects: [{ ruleId: "mas/no-handmade-charts", includes: "Recharts", severity: "warn" }],
  },
  {
    file: "apps/api/lint-fixtures/date-math.service.ts",
    expects: [{ ruleId: "mas/no-manual-date-math", includes: "date-fns", severity: "warn" }],
  },
  {
    file: "apps/api/lint-fixtures/trust-mimetype.controller.ts",
    expects: [{ ruleId: "mas/no-client-file-type-trust", includes: "file-type", severity: "error" }],
  },
  {
    file: "apps/api/lint-fixtures/llm-fetch.service.ts",
    expects: [{ ruleId: "mas/no-direct-llm-fetch", includes: "/chat/completions", severity: "error" }],
  },
  {
    file: "apps/web/lint-fixtures/vite-secret.ts",
    expects: [{ ruleId: "mas/no-secret-in-client", includes: "VITE_", severity: "error" }],
  },
  {
    file: "apps/api/lint-fixtures/api-main.ts",
    expects: [{ ruleId: "mas/require-helmet", includes: "helmet", severity: "error" }],
  },
  {
    file: "apps/api/lint-fixtures/login-no-throttle.controller.ts",
    expects: [{ ruleId: "mas/require-throttle-sensitive", includes: "SensitiveThrottle", severity: "error" }],
  },
  {
    file: "apps/web/lint-fixtures/form-errors.tsx",
    expects: [{ ruleId: "mas/no-manual-form-errors", includes: "react-hook-form", severity: "error" }],
  },
  {
    file: "apps/web/lint-fixtures/confetti.tsx",
    expects: [{ ruleId: "mas/reduced-motion-animations", includes: "prefers-reduced-motion", severity: "error" }],
  },
  {
    file: "apps/api/lint-fixtures/console-log.service.ts",
    expects: [{ ruleId: "no-console", includes: "console", severity: "error" }],
  },
  {
    file: "apps/api/lint-fixtures/banned-imports.ts",
    min: 13,
    minRule: "no-restricted-imports",
    expects: [
      { ruleId: "no-restricted-imports", includes: "moment", severity: "error" },
      { ruleId: "no-restricted-imports", includes: "dayjs", severity: "error" },
      { ruleId: "no-restricted-imports", includes: "chart.js", severity: "error" },
      { ruleId: "no-restricted-imports", includes: "react-chartjs-2", severity: "error" },
      { ruleId: "no-restricted-imports", includes: "echarts", severity: "error" },
      { ruleId: "no-restricted-imports", includes: "socket.io", severity: "error" },
      { ruleId: "no-restricted-imports", includes: "ws", severity: "error" },
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
        "import-x": importX,
        "@eslint-community/eslint-comments": comments,
        "@typescript-eslint": tseslint.plugin,
        mas,
        sonarjs,
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
        "mas/thin-controllers": "error",
        "mas/no-url-includes-in-guards": "error",
        "mas/no-base64-file-upload": "error",
        "mas/base64-upload-max-length": "error",
        "mas/multipart-upload-limits": "error",
        "mas/no-handrolled-format-parsers": "error",
        "mas/no-regex-html-sanitize": "error",
        "mas/no-dangerous-html-unsanitized": "error",
        "mas/no-handmade-email-html": "error",
        "mas/no-timer-scheduling": "warn",
        "mas/no-handmade-charts": "warn",
        "mas/no-manual-date-math": "warn",
        "mas/no-client-file-type-trust": "error",
        "mas/no-direct-llm-fetch": "error",
        "mas/no-secret-in-client": "error",
        "mas/no-raw-process-env": "error",
        "mas/require-throttle-sensitive": "error",
        "mas/require-helmet": "error",
        "mas/no-manual-form-errors": "error",
        "mas/reduced-motion-animations": "error",
        "no-restricted-imports": ["error", restrictedImports],
        "no-console": "error",
        "mas/icon-library": "error",
        "mas/no-literal-color": "error",
        "mas/no-i18n-mutation-in-render": "error",
        "mas/no-module-translation": "error",
        "mas/no-literal-copy": "error",
        "mas/require-audit-on-mutations": "error",
        "mas/no-hardcoded-user-message": "error",
        "mas/no-fixed-locale": "error",
        "mas/no-cast-fetch-response": "error",
        "mas/zod-strict-writes": "error",
        "mas/no-swallowed-catch": "error",
        "mas/barrel-exports-only-public": "error",
        "mas/max-callable-params": ["error", { max: 3 }],
        "mas/no-commented-code": "warn",
        "mas/no-hidden-service-deps": "error",
        "no-magic-numbers": ["error", { ignore: [-1, 0, 1] }],
        "sonarjs/no-identical-functions": "error",
        "no-useless-catch": "error",
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

cases.push(
  {
    file: "apps/api/lint-fixtures/hardcoded-message.controller.ts",
    expects: [{ ruleId: "mas/no-hardcoded-user-message", includes: "i18n" }],
  },
  {
    file: "apps/web/lint-fixtures/fixed-locale.ts",
    expects: [{ ruleId: "mas/no-fixed-locale", includes: "active locale" }],
  },
  {
    file: "apps/web/lint-fixtures/cast-fetch.ts",
    expects: [{ ruleId: "mas/no-cast-fetch-response", includes: "Zod" }],
  },
  {
    file: "apps/api/lint-fixtures/loose-write.ts",
    expects: [{ ruleId: "mas/zod-strict-writes", includes: ".strict()" }],
  },
  {
    file: "apps/api/lint-fixtures/swallowed-catch.ts",
    expects: [{ ruleId: "mas/no-swallowed-catch", includes: "rethrow" }],
  },
  {
    file: "apps/api/lint-fixtures/useless-catch.ts",
    expects: [{ ruleId: "no-useless-catch" }],
  },
  {
    file: "apps/api/lint-fixtures/modules/ledger/index.ts",
    expects: [{ ruleId: "mas/barrel-exports-only-public", includes: "public API" }],
  },
  {
    file: "apps/api/lint-fixtures/thin-prisma.controller.ts",
    expects: [{ ruleId: "mas/thin-controllers", includes: "PrismaService" }],
  },
  {
    file: "apps/api/lint-fixtures/thin-repository.controller.ts",
    expects: [{ ruleId: "mas/thin-controllers", includes: "repository" }],
  },
  {
    file: "apps/api/lint-fixtures/thin-loop.controller.ts",
    expects: [{ ruleId: "mas/thin-controllers", includes: "business loops" }],
  },
  {
    file: "apps/api/lint-fixtures/thin-branch.controller.ts",
    expects: [{ ruleId: "mas/thin-controllers", includes: "Business branches" }],
  },
  {
    file: "apps/api/lint-fixtures/thin-math.controller.ts",
    expects: [{ ruleId: "mas/thin-controllers", includes: "calculate" }],
  },
  {
    file: "apps/api/lint-fixtures/too-many-params.ts",
    expects: [{ ruleId: "mas/max-callable-params", includes: "F1" }],
  },
  {
    file: "apps/api/lint-fixtures/commented-code.ts",
    expects: [{ ruleId: "mas/no-commented-code", includes: "C5", severity: "warn" }],
  },
  {
    file: "apps/api/lint-fixtures/magic-number.ts",
    expects: [{ ruleId: "no-magic-numbers", severity: "error" }],
  },
  {
    file: "apps/api/lint-fixtures/hidden-deps.service.ts",
    expects: [{ ruleId: "mas/no-hidden-service-deps", includes: "Clock" }],
  },
  {
    file: "apps/api/lint-fixtures/identical-functions.ts",
    expects: [{ ruleId: "sonarjs/no-identical-functions" }],
  },
);

let failed = false;
for (const item of cases) {
  const results = await eslint.lintFiles([item.file]);
  const messages = results.flatMap((result) => result.messages);
  const misses = item.expects.filter(
    (expected) =>
      !messages.some(
        (message) =>
          message.ruleId === expected.ruleId &&
          (expected.severity === undefined ||
            (expected.severity === "warn" ? message.severity === 1 : message.severity === 2)) &&
          (expected.includes === undefined ||
            (typeof message.message === "string" && message.message.includes(expected.includes))),
      ),
  );
  const counted =
    item.min === undefined
      ? []
      : messages.filter((message) => message.ruleId === item.minRule);
  if (item.min !== undefined && counted.length < item.min) {
    failed = true;
    console.error(`fixture ${item.file} expected at least ${item.min} ${item.minRule}, got ${counted.length}`);
  }
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

const formatOff = new ESLint({
  cwd: new URL("..", import.meta.url).pathname,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.{ts,tsx}"],
      plugins: { mas },
      languageOptions: { parser: tseslint.parser },
      rules: { "mas/no-handrolled-format-parsers": "off" },
    },
  ],
});
const formatFixtures = [
  "apps/api/lint-fixtures/import-xlsx.service.ts",
  "apps/api/lint-fixtures/zlib-inflate.service.ts",
  "apps/api/lint-fixtures/sheet-xml.service.ts",
  "apps/api/lint-fixtures/csv-split.service.ts",
  "apps/api/lint-fixtures/pdf-handrolled.service.ts",
];
for (const file of formatFixtures) {
  const results = await formatOff.lintFiles([file]);
  const hit = results
    .flatMap((result) => result.messages)
    .find((message) => message.ruleId === "mas/no-handrolled-format-parsers");
  if (hit) {
    console.error(`rule off still emitted mas/no-handrolled-format-parsers for ${file}`);
    process.exit(1);
  }
  console.log(`fixture off ok ${file}`);
}

const package2OffRules = {
  "mas/no-regex-html-sanitize": "off",
  "mas/no-dangerous-html-unsanitized": "off",
  "mas/no-handmade-email-html": "off",
  "mas/no-timer-scheduling": "off",
  "mas/no-handmade-charts": "off",
  "mas/no-manual-date-math": "off",
  "mas/no-client-file-type-trust": "off",
  "mas/no-direct-llm-fetch": "off",
  "mas/no-secret-in-client": "off",
  "mas/no-raw-process-env": "off",
  "mas/require-throttle-sensitive": "off",
  "mas/require-helmet": "off",
  "mas/no-manual-form-errors": "off",
  "mas/reduced-motion-animations": "off",
  "no-restricted-imports": "off",
  "no-console": "off",
};
const package2Off = new ESLint({
  cwd: new URL("..", import.meta.url).pathname,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.{ts,tsx}"],
      plugins: { mas },
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: package2OffRules,
    },
  ],
});
const package2OffCases = [
  ["apps/api/lint-fixtures/regex-sanitize.service.ts", "mas/no-regex-html-sanitize"],
  ["apps/web/lint-fixtures/dangerous-html.tsx", "mas/no-dangerous-html-unsanitized"],
  ["apps/api/lint-fixtures/email/handmade-mail.ts", "mas/no-handmade-email-html"],
  ["apps/api/lint-fixtures/email/triple-stash.ts", "mas/no-handmade-email-html"],
  ["apps/api/lint-fixtures/timer-schedule.service.ts", "mas/no-timer-scheduling"],
  ["apps/web/lint-fixtures/charts/handmade-chart.tsx", "mas/no-handmade-charts"],
  ["apps/api/lint-fixtures/date-math.service.ts", "mas/no-manual-date-math"],
  ["apps/api/lint-fixtures/trust-mimetype.controller.ts", "mas/no-client-file-type-trust"],
  ["apps/api/lint-fixtures/llm-fetch.service.ts", "mas/no-direct-llm-fetch"],
  ["apps/web/lint-fixtures/vite-secret.ts", "mas/no-secret-in-client"],
  ["apps/api/lint-fixtures/reads-env.service.ts", "mas/no-raw-process-env"],
  ["apps/api/lint-fixtures/api-main.ts", "mas/require-helmet"],
  ["apps/api/lint-fixtures/login-no-throttle.controller.ts", "mas/require-throttle-sensitive"],
  ["apps/web/lint-fixtures/form-errors.tsx", "mas/no-manual-form-errors"],
  ["apps/web/lint-fixtures/confetti.tsx", "mas/reduced-motion-animations"],
  ["apps/api/lint-fixtures/console-log.service.ts", "no-console"],
  ["apps/api/lint-fixtures/banned-imports.ts", "no-restricted-imports"],
];
for (const [file, ruleId] of package2OffCases) {
  const results = await package2Off.lintFiles([file]);
  const hit = results.flatMap((result) => result.messages).find((message) => message.ruleId === ruleId);
  if (hit) {
    console.error(`rule off still emitted ${ruleId} for ${file}`);
    process.exit(1);
  }
  console.log(`fixture off ok ${file} ${ruleId}`);
}

const referenceRoot = new URL("..", import.meta.url).pathname;
const central = join(referenceRoot, "apps/web/src/icons/index.ts");
const feature = join(referenceRoot, "apps/web/src/features/home/components/home-page.tsx");
const textCases = [
  {
    name: "central module may import the declared library",
    filePath: central,
    code: 'import { Gauge } from "lucide-react";\nexport const icon = Gauge;\n',
    forbid: ["mas/icon-library", "mas/no-literal-color"],
  },
  {
    name: "feature imports the central module and token classes",
    filePath: feature,
    code: 'import type { IconName } from "../../icons/index.ts";\nexport function Mark(name: IconName): React.ReactElement {\n  return <span className="text-primary" data-icon={name} />;\n}\n',
    forbid: ["mas/icon-library", "mas/no-literal-color"],
  },
  {
    name: "changeLanguage in a click handler",
    filePath: join(referenceRoot, "apps/web/src/shell/app-shell.tsx"),
    code: 'const i18n = { changeLanguage(_locale: string) { return Promise.resolve(); } };\nexport function Switch(): React.ReactElement {\n  return <button type="button" onClick={() => { void i18n.changeLanguage("en"); }} />;\n}\n',
    forbid: ["mas/no-i18n-mutation-in-render", "mas/no-literal-copy"],
  },
  {
    name: "changeLanguage inside a guarded effect",
    filePath: join(referenceRoot, "apps/web/src/i18n/locale.tsx"),
    code: 'import { useEffect } from "react";\nconst i18n = { language: "es-CL", changeLanguage(_l: string) { return Promise.resolve(); } };\nexport function useApplyLocale(next: string): void {\n  useEffect(() => {\n    if (i18n.language !== next) void i18n.changeLanguage(next);\n  }, [next]);\n}\n',
    forbid: ["mas/no-i18n-mutation-in-render"],
  },
  {
    name: "mutation handler with a catalog audit key",
    filePath: join(referenceRoot, "apps/api/src/modules/auth/auth.controller.ts"),
    code: 'import { Controller, Post } from "@nestjs/common";\nfunction Audit(_key: string): MethodDecorator { return () => undefined; }\n@Controller("auth")\nexport class AuthController {\n  @Post("login")\n  @Audit("auth.login")\n  login(): { ok: true } {\n    return { ok: true };\n  }\n}\n',
    forbid: ["mas/require-audit-on-mutations"],
  },
  {
    name: "mutation handler with an explicit audit opt-out",
    filePath: join(referenceRoot, "apps/api/src/modules/auth/auth.controller.ts"),
    code: 'import { Controller, Post } from "@nestjs/common";\nfunction NoAudit(_reason: string): MethodDecorator { return () => undefined; }\n@Controller("auth")\nexport class AuthController {\n  @Post("probe")\n  @NoAudit("health probe writes no business state")\n  probe(): { ok: true } {\n    return { ok: true };\n  }\n}\n',
    forbid: ["mas/require-audit-on-mutations"],
  },
  {
    name: "t() during render and labelKey navigation",
    filePath: join(referenceRoot, "apps/web/src/shell/app-shell.tsx"),
    code: 'import { useTranslation } from "react-i18next";\nconst adminNav = [{ to: "/admin", labelKey: "nav.admin" }];\nexport function Menu(): React.ReactElement {\n  const { t } = useTranslation();\n  return <nav>{adminNav.map((item) => <span key={item.to}>{t(item.labelKey)}</span>)}</nav>;\n}\n',
    forbid: ["mas/no-module-translation", "mas/no-literal-copy"],
  },
  {
    name: "http error uses an i18n key",
    filePath: join(referenceRoot, "apps/api/src/modules/auth/auth.controller.ts"),
    code: 'import { BadRequestException } from "@nestjs/common";\nexport function fail(): void {\n  throw new BadRequestException({ i18nKey: "errors.note" });\n}\n',
    forbid: ["mas/no-hardcoded-user-message"],
  },
  {
    name: "formatter receives the active locale",
    filePath: join(referenceRoot, "apps/web/src/format.ts"),
    code: "export function label(value: Date, locale: string): string {\n  return new Intl.DateTimeFormat(locale).format(value);\n}\n",
    forbid: ["mas/no-fixed-locale"],
  },
  {
    name: "fetch body is parsed with zod",
    filePath: join(referenceRoot, "apps/web/src/features/home/api/home-api.ts"),
    code: 'import { z } from "zod";\nconst userSchema = z.object({ id: z.string() }).strict();\nexport async function load(input: RequestInfo): Promise<unknown> {\n  const response = await fetch(input);\n  const body: unknown = await response.json();\n  return userSchema.parse(body);\n}\n',
    forbid: ["mas/no-cast-fetch-response", "mas/zod-strict-writes"],
  },
  {
    name: "catch records and rethrows",
    filePath: join(referenceRoot, "apps/api/src/modules/auth/auth.service.ts"),
    code: 'const logger = { error(_message: string) { return undefined; } };\nexport function read(parse: () => string): string {\n  try {\n    return parse();\n  } catch (error: unknown) {\n    logger.error("read failed");\n    throw error;\n  }\n}\n',
    forbid: ["mas/no-swallowed-catch", "no-useless-catch"],
  },
  {
    name: "multipart upload declares fileSize and a type validator",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.controller.ts"),
    code: 'function FileInterceptor(..._args: unknown[]): MethodDecorator { return () => undefined; }\nfunction ParseFilePipe(_options: unknown): ParameterDecorator { return () => undefined; }\nfunction FileTypeValidator(_options: unknown): object { return {}; }\nfunction MaxFileSizeValidator(_options: unknown): object { return {}; }\nexport class FilesController {\n  upload(\n    @UploadedFile(\n      new ParseFilePipe({\n        validators: [\n          new FileTypeValidator({ fileType: "image/png" }),\n          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),\n        ],\n      }),\n    )\n    _file: unknown,\n  ): { ok: true } {\n    return {\n      ok: true,\n      saved: FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }),\n    };\n  }\n}\nfunction UploadedFile(_pipe: unknown): ParameterDecorator { return () => undefined; }\n',
    forbid: ["mas/multipart-upload-limits", "mas/no-base64-file-upload", "mas/base64-upload-max-length"],
  },
  {
    name: "multipart upload uses a fileFilter",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.controller.ts"),
    code: 'function FileInterceptor(..._args: unknown[]): MethodDecorator { return () => undefined; }\nexport function configured(): unknown {\n  return FileInterceptor("file", {\n    limits: { fileSize: 1024 * 1024 },\n    fileFilter(_req: unknown, _file: unknown, cb: (error: null, accept: boolean) => void) {\n      cb(null, true);\n    },\n  });\n}\n',
    forbid: ["mas/multipart-upload-limits"],
  },
  {
    name: "base64 JSON under 1 MiB with a justified suppression",
    filePath: join(referenceRoot, "apps/api/src/modules/health/avatar.dto.ts"),
    code: 'function MaxLength(_max: number): PropertyDecorator { return () => undefined; }\nfunction IsBase64(): PropertyDecorator { return () => undefined; }\nexport class AvatarDto {\n  @MaxLength(1024)\n  @IsBase64()\n  // eslint-disable-next-line mas/no-base64-file-upload -- legado de 1 KB que el cliente aún manda en JSON\n  iconBase64!: string;\n}\n',
    forbid: ["mas/no-base64-file-upload", "mas/base64-upload-max-length", "mas/require-disable-justification"],
  },
  {
    name: "token base64url and a secret decode are not file uploads",
    filePath: join(referenceRoot, "apps/api/src/modules/auth/auth.service.ts"),
    code: 'export class AuthService {\n  decode(secret: string): Buffer {\n    return Buffer.from(secret, "base64");\n  }\n}\nexport class SessionDto {\n  refreshBase64Url!: string;\n}\n',
    forbid: ["mas/no-base64-file-upload", "mas/base64-upload-max-length"],
  },
  {
    name: "exceljs streaming reader",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'import { stream } from "exceljs";\nexport async function readSheet(input: AsyncIterable<unknown>): Promise<void> {\n  const reader = new stream.xlsx.WorkbookReader(input, {});\n  for await (const worksheet of reader) {\n    for await (const row of worksheet) {\n      void row;\n    }\n  }\n}\n',
    forbid: ["mas/no-handrolled-format-parsers"],
  },
  {
    name: "csv-parse reads a csv",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'import { parse } from "csv-parse";\nexport function readCsv(csvText: string): void {\n  parse(csvText, { columns: true }, () => undefined);\n}\n',
    forbid: ["mas/no-handrolled-format-parsers"],
  },
  {
    name: "justified suppression for a legacy csv line",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'export function legacy(fileText: string): string[] {\n  const line = fileText;\n  // eslint-disable-next-line mas/no-handrolled-format-parsers -- el plan documenta este CSV de una sola columna heredada\n  return line.split(",");\n}\n',
    forbid: ["mas/no-handrolled-format-parsers", "mas/require-disable-justification"],
  },
  {
    name: "gzip and a header split are not format parsers",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'import { gzipSync } from "node:zlib";\nexport function pack(body: Buffer, header: string): { packed: Buffer; parts: string[] } {\n  return { packed: gzipSync(body), parts: header.split(",") };\n}\n',
    forbid: ["mas/no-handrolled-format-parsers"],
  },
  {
    name: "pdf-lib loads a pdf",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'import { PDFDocument } from "pdf-lib";\nexport async function merge(bytes: Uint8Array): Promise<Uint8Array> {\n  const doc = await PDFDocument.load(bytes);\n  return doc.save();\n}\n',
    forbid: ["mas/no-handrolled-format-parsers"],
  },
  {
    name: "unpdf extracts text",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'import { extractText } from "unpdf";\nexport async function textOf(data: Uint8Array): Promise<unknown> {\n  return extractText(data);\n}\n',
    forbid: ["mas/no-handrolled-format-parsers"],
  },
  {
    name: "playwright page.pdf renders html",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'type Page = { pdf: (options: { format: "A4" }) => Promise<Uint8Array> };\nexport function certificate(page: Page): Promise<Uint8Array> {\n  return page.pdf({ format: "A4" });\n}\n',
    forbid: ["mas/no-handrolled-format-parsers"],
  },
  {
    name: "module index reexports the public class",
    filePath: join(referenceRoot, "apps/api/src/modules/health/index.ts"),
    code: 'export { HealthModule } from "./health.module.js";\n',
    forbid: ["mas/barrel-exports-only-public"],
  },
  {
    name: "regex replace that is not html",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'export function slug(value: string): string {\n  return value.replace(/-/g, "");\n}\n',
    forbid: ["mas/no-regex-html-sanitize"],
  },
  {
    name: "dangerouslySetInnerHTML uses DOMPurify.sanitize",
    filePath: join(referenceRoot, "apps/web/src/features/home/components/home-page.tsx"),
    code: 'const DOMPurify = { sanitize(value: string): string { return value; } };\nexport function View(html: string): React.ReactElement {\n  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;\n}\n',
    forbid: ["mas/no-dangerous-html-unsanitized"],
  },
  {
    name: "email renders a compiled mjml template",
    filePath: join(referenceRoot, "apps/api/src/modules/email/welcome.ts"),
    code: 'import mjml2html from "mjml";\nimport { readFileSync } from "node:fs";\nexport function render(): string {\n  const source = readFileSync(new URL("./welcome.mjml", import.meta.url), "utf8");\n  return mjml2html(source, { validationLevel: "strict" }).html;\n}\n',
    forbid: ["mas/no-handmade-email-html"],
  },
  {
    name: "triple stash with a justified suppression",
    filePath: join(referenceRoot, "apps/api/src/modules/email/trusted.ts"),
    code: 'export function raw(): string {\n  // eslint-disable-next-line mas/no-handmade-email-html -- el nombre ya viene escapado por Handlebars aguas arriba\n  return "Hola {{{trustedName}}}";\n}\n',
    forbid: ["mas/no-handmade-email-html", "mas/require-disable-justification"],
  },
  {
    name: "short setTimeout is protocol timing",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: "export function defer(): void {\n  setTimeout(() => undefined, 50);\n}\n",
    forbid: ["mas/no-timer-scheduling"],
  },
  {
    name: "static icon path is not a chart",
    filePath: join(referenceRoot, "apps/web/src/icons/mark.tsx"),
    code: 'export function Mark(): React.ReactElement {\n  return <svg><path d="M2 2h4v4H2z" /></svg>;\n}\n',
    forbid: ["mas/no-handmade-charts"],
  },
  {
    name: "date-fns addDays is not manual date math",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'import { addDays } from "date-fns";\nexport function tomorrow(value: Date): Date {\n  return addDays(value, 1);\n}\n',
    forbid: ["mas/no-manual-date-math"],
  },
  {
    name: "magic bytes plus a mime hint",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'import { fileTypeFromBuffer } from "file-type";\nexport async function kind(bytes: Uint8Array, file: { mimetype: string }): Promise<string> {\n  const found = await fileTypeFromBuffer(bytes);\n  return found?.mime ?? file.mimetype;\n}\n',
    forbid: ["mas/no-client-file-type-trust", "mas/multipart-upload-limits"],
  },
  {
    name: "llm call goes through the sdk",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'import { generateText } from "ai";\nexport function model(): string {\n  return generateText.name;\n}\n',
    forbid: ["mas/no-direct-llm-fetch"],
  },
  {
    name: "public vite flag is not a secret",
    filePath: join(referenceRoot, "apps/web/src/features/home/api/home-api.ts"),
    code: "export const origin = import.meta.env.VITE_API_ORIGIN;\n",
    forbid: ["mas/no-secret-in-client"],
  },
  {
    name: "main registers helmet",
    filePath: join(referenceRoot, "apps/api/src/main.ts"),
    code: 'import helmet from "helmet";\nexport function boot(app: { use(fn: unknown): void }): void {\n  app.use(helmet());\n}\n',
    forbid: ["mas/require-helmet"],
  },
  {
    name: "login uses SensitiveThrottle",
    filePath: join(referenceRoot, "apps/api/src/modules/auth/auth.controller.ts"),
    code: 'function Controller(_path: string): ClassDecorator { return () => undefined; }\nfunction Post(_path: string): MethodDecorator { return () => undefined; }\nfunction SensitiveThrottle(): MethodDecorator { return () => undefined; }\n@Controller("auth")\nexport class AuthController {\n  @Post("login")\n  @SensitiveThrottle()\n  login(): { ok: true } {\n    return { ok: true };\n  }\n}\n',
    forbid: ["mas/require-throttle-sensitive"],
  },
  {
    name: "form uses react-hook-form",
    filePath: join(referenceRoot, "apps/web/src/features/home/components/home-page.tsx"),
    code: 'import { useForm } from "react-hook-form";\nexport function Form(): React.ReactElement {\n  const form = useForm();\n  return <form onSubmit={form.handleSubmit(() => undefined)} />;\n}\n',
    forbid: ["mas/no-manual-form-errors"],
  },
  {
    name: "confetti honors reduced motion",
    filePath: join(referenceRoot, "apps/web/src/features/home/components/home-page.tsx"),
    code: 'import confetti from "canvas-confetti";\nexport function celebrate(): void {\n  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;\n  void confetti({ particleCount: 20 });\n}\n',
    forbid: ["mas/reduced-motion-animations"],
  },
  {
    name: "api logs with nestjs-pino style logger",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: 'const logger = { info(_message: string): void { return undefined; } };\nexport function start(): void {\n  logger.info("api up");\n}\n',
    forbid: ["no-console"],
  },
  {
    name: "thin controller delegates and may reject a missing input",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.controller.ts"),
    code: 'function Controller(_path: string): ClassDecorator { return () => undefined; }\nfunction Post(_path: string): MethodDecorator { return () => undefined; }\nfunction Body(): ParameterDecorator { return () => undefined; }\nclass BadRequestException extends Error {}\nclass HealthService { create(_body: unknown): { id: string } { return { id: "1" }; } }\n@Controller("health")\nexport class HealthController {\n  constructor(private readonly health: HealthService) {}\n  @Post()\n  create(@Body() body: unknown): { id: string } {\n    if (!body) throw new BadRequestException("missing");\n    if (body == null) throw new BadRequestException("missing");\n    return this.health.create(body);\n  }\n}\n',
    forbid: ["mas/thin-controllers", "mas/prisma-only-in-repositories"],
  },
  {
    name: "echarts only with a justified suppression",
    filePath: join(referenceRoot, "apps/web/src/features/home/components/home-page.tsx"),
    code: '// eslint-disable-next-line no-restricted-imports -- el mapa WebGL no cabe en Recharts\nimport "echarts";\nexport const chartLib = "echarts";\n',
    forbid: ["no-restricted-imports", "mas/require-disable-justification"],
  },
  {
    name: "nestjs constructor may take the injected collaborators",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: "class AuthRepository {}\nclass JwtService {}\nclass ConfigService {}\nclass SystemClock { now(): number { return 0; } }\nclass SystemIdGenerator { uuid(): string { return \"id\"; } }\nexport class AuthService {\n  constructor(\n    private readonly users: AuthRepository,\n    private readonly jwt: JwtService,\n    private readonly config: ConfigService,\n    private readonly clock: SystemClock,\n    private readonly ids: SystemIdGenerator,\n  ) {}\n}\n",
    forbid: ["mas/max-callable-params"],
  },
  {
    name: "allowed numeric literals are not magic",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: "export function shift(values: number[]): number {\n  return (values[0] ?? 0) + 1 - 1;\n}\n",
    forbid: ["no-magic-numbers"],
  },
  {
    name: "service uses the injected clock",
    filePath: join(referenceRoot, "apps/api/src/modules/health/health.service.ts"),
    code: "class Clock { now(): number { return 0; } }\nexport class HealthService {\n  constructor(private readonly clock: Clock) {}\n  stamp(): number {\n    return this.clock.now();\n  }\n}\n",
    forbid: ["mas/no-hidden-service-deps"],
  },
];
for (const item of textCases) {
  const results = await eslint.lintText(item.code, { filePath: item.filePath });
  const messages = results.flatMap((result) => result.messages);
  const fatal = messages.find((message) => message.fatal === true);
  if (fatal) {
    console.error(`valid case failed to parse: ${item.name}: ${fatal.message}`);
    process.exit(1);
  }
  const hit = messages.find((message) => item.forbid.includes(message.ruleId ?? ""));
  if (hit) {
    console.error(`valid case failed: ${item.name}: ${hit.ruleId}: ${hit.message}`);
    process.exit(1);
  }
  console.log(`fixture ok ${item.name}`);
}


const cruiseRoot = new URL("..", import.meta.url).pathname;
const cruiseBin = join(cruiseRoot, "node_modules/.bin/depcruise");

function cruiseText(error) {
  const stderr = error instanceof Error && "stderr" in error ? String(error.stderr) : "";
  const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
  return `${stdout}\n${stderr}`;
}

function expectCruiseFailure(target, ruleName) {
  try {
    execFileSync(cruiseBin, [target, "--config", ".dependency-cruiser.fixtures.cjs"], {
      cwd: cruiseRoot,
      stdio: "pipe",
    });
    console.error(`dependency-cruiser accepted ${target}`);
    process.exit(1);
  } catch (error) {
    const text = cruiseText(error);
    if (!text.includes(ruleName)) {
      console.error(text);
      console.error(`dependency-cruiser did not report ${ruleName} for ${target}`);
      process.exit(1);
    }
    console.log(`fixture ok dependency-cruiser ${ruleName} ${target}`);
  }
}

expectCruiseFailure("apps/api/lint-fixtures/cycle", "no-circular");
expectCruiseFailure("apps/api/lint-fixtures/spec-cycle", "no-circular");
expectCruiseFailure("apps/api/lint-fixtures/depcruise/bad-internal", "no-foreign-module-internals");
expectCruiseFailure("apps/api/lint-fixtures/depcruise/bad-cycle", "no-circular");
expectCruiseFailure("apps/api/lint-fixtures/depcruise/bad-controller", "no-controller-prisma");

try {
  execFileSync(cruiseBin, ["apps/api/lint-fixtures/depcruise/valid", "--config", ".dependency-cruiser.fixtures.cjs"], {
    cwd: cruiseRoot,
    stdio: "pipe",
  });
  console.log("fixture ok dependency-cruiser valid");
} catch (error) {
  console.error(cruiseText(error));
  console.error("dependency-cruiser rejected the valid module graph");
  process.exit(1);
}

const cleanOff = new ESLint({
  cwd: cruiseRoot,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.ts"],
      plugins: { mas, sonarjs },
      languageOptions: { parser: tseslint.parser },
      rules: {
        "mas/max-callable-params": "off",
        "mas/no-commented-code": "off",
        "mas/no-hidden-service-deps": "off",
        "no-magic-numbers": "off",
        "sonarjs/no-identical-functions": "off",
      },
    },
  ],
});
for (const [file, ruleId] of [
  ["apps/api/lint-fixtures/too-many-params.ts", "mas/max-callable-params"],
  ["apps/api/lint-fixtures/commented-code.ts", "mas/no-commented-code"],
  ["apps/api/lint-fixtures/magic-number.ts", "no-magic-numbers"],
  ["apps/api/lint-fixtures/hidden-deps.service.ts", "mas/no-hidden-service-deps"],
  ["apps/api/lint-fixtures/identical-functions.ts", "sonarjs/no-identical-functions"],
]) {
  const results = await cleanOff.lintFiles([file]);
  const hit = results.flatMap((result) => result.messages).find((message) => message.ruleId === ruleId);
  if (hit) {
    console.error(`rule off still emitted ${ruleId} for ${file}`);
    process.exit(1);
  }
  console.log(`fixture off ok ${ruleId}`);
}

const thinOff = new ESLint({
  cwd: cruiseRoot,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.controller.ts"],
      plugins: { mas },
      languageOptions: { parser: tseslint.parser },
      rules: { "mas/thin-controllers": "off" },
    },
  ],
});
for (const file of [
  "apps/api/lint-fixtures/thin-prisma.controller.ts",
  "apps/api/lint-fixtures/thin-repository.controller.ts",
  "apps/api/lint-fixtures/thin-loop.controller.ts",
  "apps/api/lint-fixtures/thin-branch.controller.ts",
  "apps/api/lint-fixtures/thin-math.controller.ts",
]) {
  const results = await thinOff.lintFiles([file]);
  const hit = results.flatMap((result) => result.messages).find((message) => message.ruleId === "mas/thin-controllers");
  if (hit) {
    console.error(`rule off still emitted mas/thin-controllers for ${file}`);
    process.exit(1);
  }
}
console.log("fixture ok mas/thin-controllers off");
console.log("lint-fixtures ok");
