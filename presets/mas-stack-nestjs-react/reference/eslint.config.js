import eslint from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import oxlint from "eslint-plugin-oxlint";
import reactHooks from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";
import { restrictedImports } from "./eslint/package2-rules.js";
import mas, { boundaryElements, boundaryRule, envAllowFiles } from "./eslint/mas-plugin.js";

const oxlintOwnedOff =
  process.env[["HARNESS", "ESLINT", "FULL"].join("_")] === "1"
    ? []
    : oxlint.buildFromOxlintConfigFile(new URL("./.oxlintrc.json", import.meta.url).pathname);

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: {
      boundaries,
      "import-x": importX,
      "@eslint-community/eslint-comments": comments,
      mas,
      sonarjs,
    },
    settings: {
      "boundaries/elements": boundaryElements,
      "import-x/resolver": {
        typescript: true,
      },
      "import-x/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import-x/extensions": [".js", ".ts", ".tsx"],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description",
          "ts-expect-error": "allow-with-description",
          "ts-nocheck": true,
          "ts-check": false,
          minimumDescriptionLength: 10,
        },
      ],
      "@eslint-community/eslint-comments/require-description": "error",
      "@eslint-community/eslint-comments/no-restricted-disable": [
        "error",
        "@typescript-eslint/no-explicit-any",
      ],
      "boundaries/dependencies": boundaryRule,
      "import-x/no-cycle": "error",
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
      "max-params": "off",
      "mas/max-callable-params": ["error", { max: 3 }],
      "mas/no-commented-code": "warn",
      "mas/no-hidden-service-deps": "warn",
      "no-magic-numbers": [
        "warn",
        {
          ignore: [-1, 0, 1, 200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
      "mas/no-process-env": "error",
      "mas/require-disable-justification": "error",
      "mas/no-eslint-disable": "error",
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
      "complexity": ["error", { max: 10 }],
      "max-depth": ["error", 3],
      "sonarjs/cognitive-complexity": ["error", 15],
      "no-nested-ternary": "error",
      "no-else-return": "error",
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-duplicate-string": "error",
      "sonarjs/no-collapsible-if": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "typeLike", format: ["PascalCase"] },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        { selector: "function", format: ["camelCase", "PascalCase"] },
        { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" },
        {
          selector: ["variable", "parameter", "classProperty", "typeProperty"],
          types: ["boolean"],
          format: ["PascalCase", "camelCase", "UPPER_CASE"],
          prefix: ["is", "has", "can", "should"],
        },
      ],
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-param-reassign": ["error", { props: true }],
      "prefer-const": "error",
      eqeqeq: "error",
      "no-console": "error",
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["**/*.controller.ts", "apps/api/src/mcp/**/*.ts"],
    ignores: ["**/*.spec.ts", "**/*.e2e.ts"],
    rules: {
      "mas/no-prisma-at-edge": "error",
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    ignores: ["apps/web/src/shared/hooks/**", "apps/web/src/i18n/**"],
    rules: {
      "mas/no-use-effect": "error",
    },
  },
  {
    files: envAllowFiles,
    rules: {
      "mas/no-process-env": "off",
      "mas/no-raw-process-env": "off",
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts", "**/*.test.tsx", "**/*.e2e.ts", "**/e2e/**"],
    rules: {
      "max-lines-per-function": "off",
      "mas/max-callable-params": "off",
      "no-console": "off",
      "no-magic-numbers": "off",
      "sonarjs/cognitive-complexity": "off",
    },
  },
  {
    ignores: [
      "**/routeTree.gen.ts",
      "**/generated/prisma/**",
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "scripts/**",
      "templates/**",
      "eslint.config.js",
      "eslint/**",
      "**/*.cjs",
      ".specify/**",
      "**/.snippet-check/**",
      "**/lint-fixtures/**",
    ],
  },
  ...oxlintOwnedOff,
);
