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
        "mas/no-url-includes-in-guards": "error",
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
    name: "module index reexports the public class",
    filePath: join(referenceRoot, "apps/api/src/modules/health/index.ts"),
    code: 'export { HealthModule } from "./health.module.js";\n',
    forbid: ["mas/barrel-exports-only-public"],
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
try {
  execFileSync(cruiseBin, ["apps/api/lint-fixtures/spec-cycle", "--config", ".dependency-cruiser.fixtures.cjs"], {
    cwd: cruiseRoot,
    stdio: "pipe",
  });
  console.error("dependency-cruiser accepted a spec cycle");
  process.exit(1);
} catch (error) {
  const stderr = error instanceof Error && "stderr" in error ? String(error.stderr) : "";
  const stdout = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
  const text = `${stdout}\n${stderr}`;
  if (!text.includes("no-circular") && !text.includes("circular")) {
    console.error(text);
    console.error("dependency-cruiser did not report the spec cycle");
    process.exit(1);
  }
  console.log("fixture ok dependency-cruiser spec cycle");
}
console.log("lint-fixtures ok");
