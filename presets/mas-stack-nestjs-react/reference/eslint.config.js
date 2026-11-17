import eslint from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";
import mas, { boundaryElements, boundaryRule, envAllowFiles } from "./eslint/mas-plugin.js";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: {
      boundaries,
      "@eslint-community/eslint-comments": comments,
      mas,
    },
    settings: {
      "boundaries/elements": boundaryElements,
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
      "mas/no-process-env": "error",
      "mas/require-disable-justification": "error",
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
    ignores: ["apps/web/src/shared/hooks/**"],
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
      "eslint.config.js",
      "eslint/**",
      ".specify/**",
      "**/.snippet-check/**",
      "**/lint-fixtures/**",
    ],
  },
);
