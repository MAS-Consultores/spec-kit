import { existsSync } from "node:fs";
import path from "node:path";
import { modelOwnership } from "./model-ownership.js";

const PRISMA_ONLY =
  "Only *.repository.ts and the Prisma module (apps/api/src/modules/prisma) may import PrismaClient, @prisma/client, the generated client, or PrismaService. Call a use-case service, which calls the repository. The seed script and *.e2e.ts harness may construct a client because they are not request handlers.";

const GLOBAL_ONLY =
  "@Global() and Nest `global: true` are allowed only in apps/api/src/config. Import the module that provides the dependency instead of making it global.";

const MODULE_STATE =
  "Do not keep mutable module state. `let`, `var`, `new Map`, `new Set`, and mutable arrays at file scope are forbidden. Put the value on an injectable class, or declare a real constant with `as const` or a readonly annotation. Counters and rate limits belong in the database.";

const PUBLIC_API =
  "Import another Nest module or web feature only through its public index.ts. Do not reach into its controller, service, repository, or component files.";

const OWN_MODELS =
  "A repository may use only the Prisma delegates owned by its module (eslint/model-ownership.js). Read or write another domain through that module's exported service.";

const CONTRACTS =
  "Import a domain contract from its public entry `@demo/contracts/<domain>` (packages/contracts/src/<domain>/index.ts). Do not import another domain's contract internals.";

const LAZY_ROUTES =
  "Route files must lazy-load features with import(). A static import of apps/web/src/features loads the page up front.";

const FETCH_PLACE =
  "fetch belongs in a feature hooks/ or api/ file. Shell and layout components receive actions through props. Feature components and route components do not call fetch.";

const LAYOUT =
  "Each Nest domain lives in apps/api/src/modules/<kebab-domain>/ with index.ts and <domain>.module.ts. Each web feature lives in apps/web/src/features/<kebab-feature>/ with index.ts. File names use the allowed suffixes (module, controller, service, repository, guard, strategy, decorators, interceptor, token, ability, permissions, spec).";

const ROLE =
  "(?:module|controller|service|repository|guard|strategy|decorators|interceptor|token|ability|permissions|spec)";
const NEST_FILE = new RegExp(`^(?:index\\.ts|[a-z0-9]+(?:-[a-z0-9]+)*(?:\\.${ROLE})+\\.ts)$`);
const FEATURE_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:ts|tsx)$/;
const DOMAIN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FEATURE_DIRS = new Set(["components", "hooks", "api", "routes"]);

function rel(filename) {
  return filename.split(path.sep).join("/");
}

function contractDomain(filename) {
  const parts = rel(filename).split("/");
  const index = parts.lastIndexOf("contracts");
  if (index < 0 || parts[index + 1] !== "src") return null;
  return parts[index + 2] ?? null;
}

function domainOf(filename, marker) {
  const parts = rel(filename).split("/");
  const index = parts.lastIndexOf(marker);
  if (index < 0 || index + 1 >= parts.length) return null;
  return parts[index + 1] ?? null;
}

function prismaImport(source) {
  return (
    source.includes("@prisma/client") ||
    source.includes("generated/prisma") ||
    source.includes("prisma.service")
  );
}

function prismaAllowed(filename) {
  const file = rel(filename);
  return (
    file.endsWith(".repository.ts") ||
    file.includes("/modules/prisma/") ||
    file.endsWith("/prisma/seed.ts") ||
    file.endsWith(".e2e.ts")
  );
}

function isMutableArray(init, sourceCode) {
  const text = sourceCode.getText(init);
  if (text.includes("as const")) return false;
  if (init.type === "ArrayExpression") return true;
  if (init.type === "NewExpression" && init.callee.type === "Identifier") {
    return init.callee.name === "Map" || init.callee.name === "Set" || init.callee.name === "Array";
  }
  if (init.type === "CallExpression" && init.callee.type === "Identifier" && init.callee.name === "Array") {
    return true;
  }
  return false;
}

function hasReadonly(node, sourceCode) {
  const text = sourceCode.getText(node);
  return text.includes("readonly") || text.includes("as const");
}

function topLevelVariables(node) {
  if (node.type === "VariableDeclaration") return [node];
  if (
    (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") &&
    node.declaration &&
    node.declaration.type === "VariableDeclaration"
  ) {
    return [node.declaration];
  }
  return [];
}

function resolvedFile(filename, source) {
  if (!source.startsWith(".")) return null;
  const base = path.resolve(path.dirname(filename), source);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  return candidates.find((candidate) => existsSync(candidate)) ?? base;
}

function isPublicIndex(file) {
  const normalized = rel(file);
  return normalized.endsWith("/index.ts") || normalized.endsWith("/index.tsx") || normalized.endsWith("/index.js");
}

function report(context, node, messageId) {
  context.report({ node, messageId });
}

export const modularityRules = {
  "prisma-only-in-repositories": {
    meta: { type: "problem", docs: { description: PRISMA_ONLY }, schema: [], messages: { banned: PRISMA_ONLY } },
    create(context) {
      if (prismaAllowed(context.filename)) return {};
      return {
        ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source === "string" && prismaImport(source)) report(context, node, "banned");
        },
        NewExpression(node) {
          if (node.callee.type === "Identifier" && node.callee.name === "PrismaClient") {
            report(context, node, "banned");
          }
        },
        Identifier(node) {
          if (node.name !== "PrismaService" && node.name !== "PrismaClient") return;
          if (node.parent.type === "ImportSpecifier" || node.parent.type === "ImportDefaultSpecifier") return;
          report(context, node, "banned");
        },
      };
    },
  },
  "no-global-module": {
    meta: { type: "problem", docs: { description: GLOBAL_ONLY }, schema: [], messages: { banned: GLOBAL_ONLY } },
    create(context) {
      if (rel(context.filename).includes("/config/")) return {};
      return {
        Decorator(node) {
          const expr = node.expression;
          const name =
            expr.type === "Identifier"
              ? expr.name
              : expr.type === "CallExpression" && expr.callee.type === "Identifier"
                ? expr.callee.name
                : "";
          if (name === "Global") report(context, node, "banned");
        },
        Property(node) {
          const key = node.key;
          const name =
            key.type === "Identifier" ? key.name : key.type === "Literal" ? String(key.value) : "";
          if (name !== "global") return;
          if (node.value.type === "Literal" && node.value.value === true) report(context, node, "banned");
        },
      };
    },
  },
  "no-module-state": {
    meta: { type: "problem", docs: { description: MODULE_STATE }, schema: [], messages: { banned: MODULE_STATE } },
    create(context) {
      const file = rel(context.filename);
      if (!file.includes("/apps/")) return {};
      return {
        Program(program) {
          for (const statement of program.body) {
            for (const declaration of topLevelVariables(statement)) {
              if (declaration.kind === "let" || declaration.kind === "var") {
                report(context, declaration, "banned");
                continue;
              }
              for (const declarator of declaration.declarations) {
                if (!declarator.init) continue;
                if (!isMutableArray(declarator.init, context.sourceCode)) continue;
                if (hasReadonly(declarator, context.sourceCode)) continue;
                report(context, declarator, "banned");
              }
            }
          }
        },
      };
    },
  },
  "public-module-api": {
    meta: { type: "problem", docs: { description: PUBLIC_API }, schema: [], messages: { banned: PUBLIC_API } },
    create(context) {
      const filename = context.filename;
      const fromModule = domainOf(filename, "modules");
      const fromFeature = domainOf(filename, "features");
      return {
        ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== "string") return;
          const target = resolvedFile(filename, source);
          if (!target) return;
          const toModule = domainOf(target, "modules");
          const toFeature = domainOf(target, "features");
          const crosses =
            (fromModule && toModule && fromModule !== toModule) ||
            (fromFeature && toFeature && fromFeature !== toFeature);
          if (!crosses) return;
          if (isPublicIndex(target) || source.endsWith("/index.js") || source.endsWith("/index.ts")) return;
          report(context, node, "banned");
        },
      };
    },
  },
  "own-models-only": {
    meta: { type: "problem", docs: { description: OWN_MODELS }, schema: [], messages: { banned: OWN_MODELS } },
    create(context) {
      const file = rel(context.filename);
      if (!file.endsWith(".repository.ts")) return {};
      const domain = domainOf(context.filename, "modules");
      const owned = new Set(domain ? (modelOwnership[domain] ?? []) : []);
      return {
        MemberExpression(node) {
          if (node.computed || node.property.type !== "Identifier") return;
          const object = node.object;
          const isPrisma =
            (object.type === "Identifier" && object.name === "prisma") ||
            (object.type === "MemberExpression" &&
              !object.computed &&
              object.property.type === "Identifier" &&
              object.property.name === "prisma");
          if (!isPrisma) return;
          if (node.property.name.startsWith("$")) return;
          if (!owned.has(node.property.name)) report(context, node, "banned");
        },
      };
    },
  },
  "contracts-public-index": {
    meta: { type: "problem", docs: { description: CONTRACTS }, schema: [], messages: { banned: CONTRACTS } },
    create(context) {
      const fromDomain = contractDomain(context.filename);
      return {
        ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== "string") return;
          if (source.startsWith("@demo/contracts/")) {
            const rest = source.slice("@demo/contracts/".length);
            if (rest.includes("/")) report(context, node, "banned");
          }
          const target = resolvedFile(context.filename, source);
          if (!target) return;
          const toDomain = domainOf(target, "src");
          const inContracts = rel(context.filename).includes("/packages/contracts/");
          if (!inContracts || !fromDomain || !toDomain || fromDomain === toDomain) return;
          if (isPublicIndex(target)) return;
          report(context, node, "banned");
        },
      };
    },
  },
  "lazy-feature-routes": {
    meta: { type: "problem", docs: { description: LAZY_ROUTES }, schema: [], messages: { banned: LAZY_ROUTES } },
    create(context) {
      const file = rel(context.filename);
      const routed = file.endsWith("/app-router.tsx") || file.endsWith("/feature-routes.ts") || file.includes("/routes/");
      if (!routed) return {};
      return {
        ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source === "string" && source.includes("/features/")) report(context, node, "banned");
        },
      };
    },
  },
  "fetch-in-feature-data": {
    meta: { type: "problem", docs: { description: FETCH_PLACE }, schema: [], messages: { banned: FETCH_PLACE } },
    create(context) {
      const file = rel(context.filename);
      const allowed = file.includes("/features/") && (file.includes("/hooks/") || file.includes("/api/"));
      const watched =
        file.includes("/shell/") ||
        file.includes("/layout") ||
        (file.includes("/features/") && (file.includes("/components/") || file.includes("/routes/")));
      if (!watched || allowed) return {};
      return {
        CallExpression(node) {
          const callee = node.callee;
          const name =
            callee.type === "Identifier"
              ? callee.name
              : callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier"
                ? callee.property.name
                : "";
          if (name === "fetch") report(context, node, "banned");
        },
      };
    },
  },
  "module-layout": {
    meta: { type: "problem", docs: { description: LAYOUT }, schema: [], messages: { banned: LAYOUT } },
    create(context) {
      const file = rel(context.filename);
      if (file.includes("node_modules")) return {};
      const nest = file.match(/\/modules\/([^/]+)\/(.+)$/);
      const web = file.match(/\/features\/([^/]+)\/(.+)$/);
      if (!nest && !web) return {};
      return {
        Program(node) {
          if (nest) {
            const domain = nest[1] ?? "";
            const rest = nest[2] ?? "";
            if (!DOMAIN.test(domain) || rest.includes("/") || !NEST_FILE.test(path.basename(file))) {
              report(context, node, "banned");
              return;
            }
            const folder = path.dirname(context.filename);
            if (!existsSync(path.join(folder, "index.ts")) || !existsSync(path.join(folder, `${domain}.module.ts`))) {
              report(context, node, "banned");
            }
            return;
          }
          const feature = web?.[1] ?? "";
          const rest = web?.[2] ?? "";
          const folder = path.dirname(context.filename);
          const featureRoot = rest.includes("/")
            ? path.resolve(folder, ...Array(rest.split("/").length - 1).fill(".."))
            : folder;
          if (!DOMAIN.test(feature) || !existsSync(path.join(featureRoot, "index.ts"))) {
            report(context, node, "banned");
            return;
          }
          if (!rest.includes("/")) {
            if (path.basename(file) !== "index.ts" && !FEATURE_FILE.test(path.basename(file))) {
              report(context, node, "banned");
            }
            return;
          }
          const [dir, leaf] = [rest.split("/")[0] ?? "", path.basename(file)];
          if (!FEATURE_DIRS.has(dir) || rest.split("/").length !== 2 || !FEATURE_FILE.test(leaf)) {
            report(context, node, "banned");
          }
        },
      };
    },
  },
};
