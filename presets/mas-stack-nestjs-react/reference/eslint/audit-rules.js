import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MESSAGE =
  "A controller method with @Post, @Put, @Patch, or @Delete must declare @Audit('event.key') or @NoAudit('reason'). Register the key in packages/contracts/src/audit/index.ts (i18n key in every locale, tone) before using it. The catalog feeds the Actividad type filter.";

const HTTP = new Set(["Post", "Put", "Patch", "Delete"]);

function catalogKeys() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const text = readFileSync(join(root, "packages/contracts/src/audit/index.ts"), "utf8");
  const block = text.match(/AUDIT_CATALOG\s*=\s*\{([\s\S]*?)\}\s*as const/);
  const body = block?.[1] ?? "";
  return new Set(
    [...body.matchAll(/["']([a-z][a-z0-9]*(?:\.[a-z0-9_]+)*)["']\s*:/g)].map((match) => match[1]),
  );
}

function callName(node) {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  return "";
}

function decoratorCall(decorator) {
  const expr = decorator.expression ?? decorator;
  if (!expr || expr.type !== "CallExpression") return null;
  return { name: callName(expr.callee), args: expr.arguments ?? [] };
}

function stringArg(args) {
  const first = args[0];
  if (!first || first.type !== "Literal" || typeof first.value !== "string") return null;
  return first.value;
}

export const auditRules = {
  "require-audit-on-mutations": {
    meta: {
      type: "problem",
      docs: { description: MESSAGE },
      schema: [],
      messages: { banned: MESSAGE },
    },
    create(context) {
      const filename = context.filename ?? "";
      if (!filename.endsWith(".controller.ts")) return {};
      const keys = catalogKeys();
      return {
        MethodDefinition(node) {
          const decorators = node.decorators ?? [];
          const calls = decorators.map(decoratorCall).filter((call) => call !== null);
          if (!calls.some((call) => HTTP.has(call.name))) return;
          const audit = calls.find((call) => call.name === "Audit");
          const skip = calls.find((call) => call.name === "NoAudit");
          if (audit && skip) {
            context.report({ node, messageId: "banned" });
            return;
          }
          if (skip) {
            const reason = stringArg(skip.args);
            if (reason === null || reason.trim() === "") context.report({ node, messageId: "banned" });
            return;
          }
          const eventKey = audit ? stringArg(audit.args) : null;
          if (eventKey === null || !keys.has(eventKey)) context.report({ node, messageId: "banned" });
        },
      };
    },
  },
};
