/**
 * Same modularity rules as the product config, pointed at throwaway fixtures
 * under apps/api/lint-fixtures/depcruise/.
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
      from: { path: "modules/([^/]+)/" },
      to: {
        path: "modules/",
        pathNot: ["modules/$1/", "modules/[^/]+/index\\.ts$"],
      },
    },
    {
      name: "no-controller-prisma",
      severity: "error",
      comment: "A controller may not import Prisma.",
      from: { path: "\\.controller\\.ts$" },
      to: {
        path: "(@prisma/client|\\.prisma/client|generated/prisma|prisma\\.service|modules/prisma/)",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
