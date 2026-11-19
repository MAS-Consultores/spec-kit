import eslint from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import mas, { boundaryElements, boundaryRule, envAllowFiles } from "./eslint/mas-plugin.js";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: {
      boundaries,
      "import-x": importX,
      "@eslint-community/eslint-comments": comments,
      mas,
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
      "mas/no-process-env": "error",
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
    },
  },
  {
    ignores: [
      "**/routeTree.gen.ts",
      "**/generated/prisma/**",
      "**/dist/**",
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
);
