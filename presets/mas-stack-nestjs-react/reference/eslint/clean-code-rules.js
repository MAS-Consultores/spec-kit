const PARAMS_MESSAGE =
  "F1: a function takes at most 3 parameters. Pass a typed object instead. NestJS constructors that only receive DI stay exempt. A justified eslint-disable may name the external contract.";

const COMMENTED_MESSAGE =
  "C5: delete commented-out code. Git keeps the history. A comment that explains a decision may stay; a comment that is a statement may not.";

const HIDDEN_MESSAGE =
  "A service must not call Date.now(), new Date() with no argument, or Math.random(), and must not construct an effectful class. Inject Clock and IdGenerator (apps/api/src/modules/platform).";

const EFFECT_CLASS = /(Service|Client|Repository|Logger|Pool|Socket|Server|Agent|Connection|Clock|Generator)$/;

const VALUE_CLASS = new Set([
  "Date",
  "URL",
  "URLSearchParams",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "RegExp",
  "Headers",
  "FormData",
  "Blob",
  "File",
  "AbortController",
  "TextEncoder",
  "TextDecoder",
  "Uint8Array",
  "Uint16Array",
  "Uint32Array",
  "Int8Array",
  "Int16Array",
  "Int32Array",
  "Float64Array",
  "ArrayBuffer",
  "DataView",
  "Buffer",
  "Promise",
  "Error",
  "AggregateError",
  "TypeError",
  "RangeError",
]);

function isConstructor(node) {
  return (
    node.parent &&
    node.parent.type === "MethodDefinition" &&
    node.parent.kind === "constructor"
  );
}

function isServiceFile(filename) {
  return filename.endsWith(".service.ts");
}

function isAllowedHiddenFile(filename) {
  return filename.includes("/modules/platform/");
}

function commentedStatement(value) {
  return /^\s*(const|let|var|function|return|if|for|while|import|export|class)\b/.test(value);
}

export const cleanCodeRules = {
  "max-callable-params": {
    meta: {
      type: "problem",
      docs: { description: PARAMS_MESSAGE },
      schema: [{ type: "object", properties: { max: { type: "integer" } }, additionalProperties: false }],
      messages: { banned: PARAMS_MESSAGE },
    },
    create(context) {
      const max = context.options[0]?.max ?? 3;
      function check(node) {
        if (isConstructor(node)) return;
        if (node.params.length > max) context.report({ node, messageId: "banned" });
      }
      return {
        FunctionDeclaration: check,
        FunctionExpression: check,
        ArrowFunctionExpression: check,
      };
    },
  },
  "no-commented-code": {
    meta: {
      type: "suggestion",
      docs: { description: COMMENTED_MESSAGE },
      schema: [],
      messages: { banned: COMMENTED_MESSAGE },
    },
    create(context) {
      return {
        Program() {
          const comments = context.sourceCode.getAllComments();
          for (const comment of comments) {
            if (commentedStatement(comment.value)) context.report({ loc: comment.loc, messageId: "banned" });
          }
        },
      };
    },
  },
  "no-hidden-service-deps": {
    meta: {
      type: "problem",
      docs: { description: HIDDEN_MESSAGE },
      schema: [],
      messages: { banned: HIDDEN_MESSAGE },
    },
    create(context) {
      const filename = context.filename.replaceAll("\\", "/");
      if (!isServiceFile(filename) || isAllowedHiddenFile(filename)) return {};
      return {
        CallExpression(node) {
          const callee = node.callee;
          if (callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier") {
            if (callee.property.name === "now" && callee.object.type === "Identifier" && callee.object.name === "Date") {
              context.report({ node, messageId: "banned" });
            }
            if (
              callee.property.name === "random" &&
              callee.object.type === "Identifier" &&
              callee.object.name === "Math"
            ) {
              context.report({ node, messageId: "banned" });
            }
          }
        },
        NewExpression(node) {
          if (node.callee.type !== "Identifier") return;
          const name = node.callee.name;
          if (name === "Date" && node.arguments.length === 0) {
            context.report({ node, messageId: "banned" });
            return;
          }
          if (VALUE_CLASS.has(name) || name.endsWith("Exception") || name.endsWith("Error")) return;
          if (EFFECT_CLASS.test(name)) context.report({ node, messageId: "banned" });
        },
      };
    },
  },
};
