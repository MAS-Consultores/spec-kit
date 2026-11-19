import { modularityRules } from "./modularity.js";

/** Teaching rules. The message is the fix, not only the ban. */

const ENV_MESSAGE =
  "Read process.env and requiredEnv only in apps/api/src/config (the Nest ConfigModule validated with Zod). Add the variable to that module and to .env.example, then inject ConfigService. prisma.config.ts, the prisma database-url helper, scripts, and e2e configs are the other allowed readers.";

const PRISMA_MESSAGE =
  "Controllers and MCP tools must not touch Prisma (PrismaClient, @prisma/client, the generated client, or PrismaService). Move the query to the domain service and call that service.";

const EFFECT_MESSAGE =
  "Do not use useEffect in product code. Server state goes through TanStack Query. useEffect is allowed only in apps/web/src/shared/hooks.";

const DISABLE_MESSAGE =
  "An eslint-disable comment needs a justification or ticket after --, for example: eslint-disable-next-line some-rule -- TICKET-123 why this exception is safe.";

const GUARD_URL_MESSAGE =
  "Guards must compare the parsed path only. Do not call originalUrl.includes or url.includes: a query string can contain the bypass path. Split off the query and match path segments.";

const ANY_DISABLE_MESSAGE =
  "Disabling @typescript-eslint/no-explicit-any is forbidden outright, even with a justification. Give the value a real type. The constitution forbids any.";

function isProcessEnv(node) {
  if (node.type !== "MemberExpression") return false;
  if (node.object.type !== "Identifier" || node.object.name !== "process") return false;
  if (!node.computed && node.property.type === "Identifier" && node.property.name === "env") {
    return true;
  }
  return node.computed && node.property.type === "Literal" && node.property.value === "env";
}

function prismaImport(source) {
  return (
    source.includes("@prisma/client") ||
    source.includes("generated/prisma") ||
    source.includes("prisma.service")
  );
}

const masPlugin = {
  rules: {
    "no-process-env": {
      meta: { type: "problem", docs: { description: ENV_MESSAGE }, schema: [], messages: { banned: ENV_MESSAGE } },
      create(context) {
        return {
          MemberExpression(node) {
            if (!isProcessEnv(node)) return;
            context.report({ node, messageId: "banned" });
          },
          CallExpression(node) {
            if (node.callee.type === "Identifier" && node.callee.name === "requiredEnv") {
              context.report({ node, messageId: "banned" });
            }
          },
        };
      },
    },
    "no-prisma-at-edge": {
      meta: { type: "problem", docs: { description: PRISMA_MESSAGE }, schema: [], messages: { banned: PRISMA_MESSAGE } },
      create(context) {
        return {
          ImportDeclaration(node) {
            const source = node.source.value;
            if (typeof source === "string" && prismaImport(source)) {
              context.report({ node, messageId: "banned" });
            }
          },
          NewExpression(node) {
            if (node.callee.type === "Identifier" && node.callee.name === "PrismaClient") {
              context.report({ node, messageId: "banned" });
            }
          },
          Identifier(node) {
            if (node.name !== "PrismaService" && node.name !== "PrismaClient") return;
            if (node.parent.type === "ImportSpecifier" || node.parent.type === "ImportDefaultSpecifier") return;
            context.report({ node, messageId: "banned" });
          },
        };
      },
    },
    "no-use-effect": {
      meta: { type: "problem", docs: { description: EFFECT_MESSAGE }, schema: [], messages: { banned: EFFECT_MESSAGE } },
      create(context) {
        return {
          CallExpression(node) {
            const callee = node.callee;
            const name =
              callee.type === "Identifier"
                ? callee.name
                : callee.type === "MemberExpression" &&
                    !callee.computed &&
                    callee.property.type === "Identifier"
                  ? callee.property.name
                  : "";
            if (name === "useEffect") context.report({ node, messageId: "banned" });
          },
        };
      },
    },
    "no-url-includes-in-guards": {
      meta: {
        type: "problem",
        docs: { description: GUARD_URL_MESSAGE },
        schema: [],
        messages: { banned: GUARD_URL_MESSAGE },
      },
      create(context) {
        const filename = context.filename ?? "";
        if (!filename.endsWith(".guard.ts")) return {};
        return {
          CallExpression(node) {
            const callee = node.callee;
            if (callee.type !== "MemberExpression" || callee.computed) return;
            if (callee.property.type !== "Identifier" || callee.property.name !== "includes") return;
            const object = callee.object;
            const name =
              object.type === "Identifier"
                ? object.name
                : object.type === "MemberExpression" &&
                    !object.computed &&
                    object.property.type === "Identifier"
                  ? object.property.name
                  : "";
            if (name === "originalUrl" || name === "url") {
              context.report({ node, messageId: "banned" });
            }
          },
        };
      },
    },
    ...modularityRules,
    "require-disable-justification": {
      meta: {
        type: "problem",
        docs: { description: DISABLE_MESSAGE },
        schema: [],
        messages: { reason: DISABLE_MESSAGE, any: ANY_DISABLE_MESSAGE },
      },
      create(context) {
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              const text = comment.value;
              if (!/\beslint-disable\b/.test(text)) continue;
              if (/no-explicit-any/.test(text)) {
                context.report({ loc: comment.loc, messageId: "any" });
                continue;
              }
              if (!/--\s*\S+/.test(text)) {
                context.report({ loc: comment.loc, messageId: "reason" });
              }
            }
          },
        };
      },
    },
  },
};

export default masPlugin;

export const boundaryElements = [
  { type: "api", pattern: "apps/api" },
  { type: "web", pattern: "apps/web" },
  { type: "contracts", pattern: "packages/contracts" },
  { type: "ui", pattern: "packages/ui" },
];

export const boundaryRule = [
  "error",
  {
    default: "allow",
    policies: [
      {
        from: { element: { type: "api" } },
        disallow: { to: { element: { types: ["web", "ui"] } } },
        message:
          "apps/api must not import apps/web or @demo/ui. Shared types and schemas go in packages/contracts.",
      },
      {
        from: { element: { type: "web" } },
        disallow: { to: { element: { type: "api" } } },
        message:
          "apps/web must not import apps/api. Shared types and schemas go in packages/contracts.",
      },
      {
        from: { element: { type: "contracts" } },
        disallow: { to: { element: { types: ["api", "web", "ui"] } } },
        message:
          "packages/contracts must not import an app or @demo/ui. Shared types and schemas stay in packages/contracts.",
      },
      {
        from: { element: { type: "ui" } },
        disallow: { to: { element: { types: ["api", "web", "contracts"] } } },
        message:
          "packages/ui stays generic primitives. It must not import contracts, app routes, or application code. Product shell lives in apps/web.",
      },
    ],
  },
];

export const envAllowFiles = [
  "apps/api/src/config/**",
  "**/prisma.config.ts",
  "**/prisma/database-url.ts",
  "**/prisma/seed.ts",
  "scripts/**",
  "**/*.e2e.ts",
  "**/e2e/**",
  "**/playwright.config.ts",
  "**/vitest.e2e.ts",
  "**/vite.config.ts",
];
