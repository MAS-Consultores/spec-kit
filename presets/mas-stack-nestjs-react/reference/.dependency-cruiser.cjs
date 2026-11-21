/**
 * Allowed direction: apps -> packages/contracts, apps/web -> packages/ui,
 * Nest modules -> another module's index.ts, web features -> shell.
 * Modules and features do not reach into each other's internals.
 * Contracts and ui do not depend on apps.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Module-level cycles are forbidden.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-foreign-module-internals",
      severity: "error",
      comment: "A Nest module may depend on another module only through index.ts.",
      from: { path: "^apps/api/src/modules/([^/]+)/" },
      to: {
        path: "^apps/api/src/modules/",
        pathNot: ["^apps/api/src/modules/$1/", "^apps/api/src/modules/[^/]+/index\\.ts$"],
      },
    },
    {
      name: "no-foreign-feature-internals",
      severity: "error",
      comment: "A web feature may depend on another feature only through index.ts.",
      from: { path: "^apps/web/src/features/([^/]+)/" },
      to: {
        path: "^apps/web/src/features/",
        pathNot: ["^apps/web/src/features/$1/", "^apps/web/src/features/[^/]+/index\\.ts$"],
      },
    },
    {
      name: "ui-primitives-only",
      severity: "error",
      comment: "packages/ui does not import contracts or application code.",
      from: { path: "^packages/ui/" },
      to: { path: "^apps/|^packages/contracts/" },
    },
    {
      name: "contracts-are-leaf",
      severity: "error",
      comment: "packages/contracts does not import apps or ui.",
      from: { path: "^packages/contracts/" },
      to: { path: "^apps/|^packages/ui/" },
    },
    {
      name: "no-controller-prisma",
      severity: "error",
      comment: "A controller may not import Prisma. Call a service; the repository owns Prisma.",
      from: { path: "\\.controller\\.ts$" },
      to: {
        path: "(@prisma/client|\\.prisma/client|generated/prisma|prisma\\.service|modules/prisma/)",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(node_modules|dist|generated|lint-fixtures|routeTree\\.gen\\.ts)" },
    // *.spec.ts and e2e stay in the graph. Do not add them to exclude.
    tsPreCompilationDeps: true,
    // packages/contracts exposes subpaths through "exports". Without this,
    // dependency-cruiser misses those conditions and reports false unresolved.
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
