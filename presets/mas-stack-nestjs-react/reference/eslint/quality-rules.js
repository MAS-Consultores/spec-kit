const USER_MESSAGE =
  "User-visible strings go through i18n. Nest HTTP exceptions and notify/toast/alert calls take a translation key, not a literal sentence. JSX copy stays on mas/no-literal-copy.";

const LOCALE_MESSAGE =
  "Do not pin a locale string in Intl formatters or toLocaleString. Pass the active locale (the resolved i18n language).";

const FETCH_CAST_MESSAGE =
  "Do not cast a fetch or Response.json() result with `as`. Read it as unknown and parse it with the Zod schema from the contract.";

const ZOD_STRICT_MESSAGE =
  "Zod schemas that write or accept input must end in .strict(). Response, query, and output schemas are the exception.";

const SWALLOW_MESSAGE =
  "A catch must rethrow or record the error (Logger or a logger method). An empty catch hides the failure. no-useless-catch already rejects a catch that only rethrows the same value.";

const BARREL_MESSAGE =
  "A module or feature index.ts only re-exports the public API (named exports). Do not export a repository, interceptor, or declare values in the barrel.";

const HTTP_EXCEPTIONS = new Set([
  "HttpException",
  "BadRequestException",
  "UnauthorizedException",
  "NotFoundException",
  "ForbiddenException",
  "ConflictException",
  "GoneException",
  "PayloadTooLargeException",
  "UnsupportedMediaTypeException",
  "UnprocessableEntityException",
  "InternalServerErrorException",
  "NotImplementedException",
  "BadGatewayException",
  "ServiceUnavailableException",
  "GatewayTimeoutException",
  "ImATeapotException",
]);

const NOTIFY = new Set(["toast", "alert", "enqueueSnackbar", "notify"]);
const FORMATTERS = new Set(["DateTimeFormat", "NumberFormat", "Collator", "RelativeTimeFormat", "ListFormat", "PluralRules", "DisplayNames", "Segmenter"]);
const LOCALE_METHODS = new Set(["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]);
const READ_SCHEMA = /(response|query|params|output|read)/i;
const PRIVATE_BARREL = /(repository|interceptor)/;

function calleeName(node) {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  return "";
}

function stringLiteral(node) {
  return node && node.type === "Literal" && typeof node.value === "string" ? node.value : null;
}

function hasLetters(value) {
  return /\p{L}/u.test(value);
}

function chainText(node, source) {
  return source.getText(node);
}

export const qualityRules = {
  "no-hardcoded-user-message": {
    meta: { type: "problem", docs: { description: USER_MESSAGE }, schema: [], messages: { banned: USER_MESSAGE } },
    create(context) {
      return {
        NewExpression(node) {
          if (!HTTP_EXCEPTIONS.has(calleeName(node.callee))) return;
          const text = stringLiteral(node.arguments[0]);
          if (text !== null && hasLetters(text)) context.report({ node, messageId: "banned" });
        },
        CallExpression(node) {
          if (!NOTIFY.has(calleeName(node.callee))) return;
          const text = stringLiteral(node.arguments[0]);
          if (text !== null && hasLetters(text)) context.report({ node, messageId: "banned" });
        },
      };
    },
  },
  "no-fixed-locale": {
    meta: { type: "problem", docs: { description: LOCALE_MESSAGE }, schema: [], messages: { banned: LOCALE_MESSAGE } },
    create(context) {
      return {
        NewExpression(node) {
          if (!FORMATTERS.has(calleeName(node.callee))) return;
          if (stringLiteral(node.arguments[0]) !== null) context.report({ node, messageId: "banned" });
        },
        CallExpression(node) {
          const name = calleeName(node.callee);
          if (FORMATTERS.has(name) || LOCALE_METHODS.has(name)) {
            if (stringLiteral(node.arguments[0]) !== null) context.report({ node, messageId: "banned" });
          }
        },
      };
    },
  },
  "no-cast-fetch-response": {
    meta: { type: "problem", docs: { description: FETCH_CAST_MESSAGE }, schema: [], messages: { banned: FETCH_CAST_MESSAGE } },
    create(context) {
      return {
        TSAsExpression(node) {
          const expr = node.expression;
          if (expr.type !== "CallExpression" && expr.type !== "AwaitExpression") return;
          const call = expr.type === "AwaitExpression" ? expr.argument : expr;
          if (call.type !== "CallExpression") return;
          const name = calleeName(call.callee);
          if (name === "json" || name === "fetch") context.report({ node, messageId: "banned" });
        },
      };
    },
  },
  "zod-strict-writes": {
    meta: { type: "problem", docs: { description: ZOD_STRICT_MESSAGE }, schema: [], messages: { banned: ZOD_STRICT_MESSAGE } },
    create(context) {
      const source = context.sourceCode;
      return {
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || !node.id.name.endsWith("Schema")) return;
          if (READ_SCHEMA.test(node.id.name)) return;
          if (node.init == null) return;
          const text = chainText(node.init, source);
          if (!text.includes("z.object") && !text.includes("zod")) return;
          if (!/\.strict\s*\(/.test(text)) context.report({ node, messageId: "banned" });
        },
      };
    },
  },
  "no-swallowed-catch": {
    meta: { type: "problem", docs: { description: SWALLOW_MESSAGE }, schema: [], messages: { banned: SWALLOW_MESSAGE } },
    create(context) {
      const source = context.sourceCode;
      return {
        CatchClause(node) {
          const body = source.getText(node.body);
          const rethrows = /\bthrow\b/.test(body);
          const recorded = /\b(Logger|logger|console)\b/.test(body);
          if (!rethrows && !recorded) context.report({ node, messageId: "banned" });
        },
      };
    },
  },
  "barrel-exports-only-public": {
    meta: { type: "problem", docs: { description: BARREL_MESSAGE }, schema: [], messages: { banned: BARREL_MESSAGE } },
    create(context) {
      const file = (context.filename ?? "").split("\\").join("/");
      const barrel = /\/modules\/[^/]+\/index\.ts$/.test(file) || /\/features\/[^/]+\/index\.ts$/.test(file);
      if (!barrel) return {};
      return {
        Program(node) {
          for (const statement of node.body) {
            if (statement.type === "ExportAllDeclaration") {
              context.report({ node: statement, messageId: "banned" });
              continue;
            }
            if (statement.type !== "ExportNamedDeclaration") {
              context.report({ node: statement, messageId: "banned" });
              continue;
            }
            const source = statement.source?.value;
            if (typeof source === "string" && PRIVATE_BARREL.test(source)) {
              context.report({ node: statement, messageId: "banned" });
            }
          }
        },
      };
    },
  },
};
