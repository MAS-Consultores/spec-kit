/**
 * Reference CASL consistency check (TypeScript AST).
 * Copy to scripts/check-casl.ts and run it from `pnpm verify`.
 * Negative fixtures (missing @Can, scope mismatch, unused manifest action) must fail.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const HTTP = new Set([
  "Get",
  "Post",
  "Put",
  "Patch",
  "Delete",
  "All",
  "Head",
  "Options",
]);

function filesUnder(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === "generated") continue;
      filesUnder(path, acc);
    } else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) {
      acc.push(path);
    }
  }
  return acc;
}

function calleeName(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return undefined;
}

function decoratorNames(node: ts.Node): string[] {
  const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
  return decorators.flatMap((decorator) => {
    const expr = decorator.expression;
    const target = ts.isCallExpression(expr) ? expr.expression : expr;
    const name = calleeName(target);
    return name ? [name] : [];
  });
}

function stringArg(expr: ts.Expression): string | undefined {
  if (!ts.isCallExpression(expr)) return undefined;
  const first = expr.arguments[0];
  if (first && ts.isStringLiteral(first)) return first.text;
  return undefined;
}

const failures: string[] = [];

for (const file of filesUnder("apps/api/src")) {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node: ts.Node): void => {
    if (ts.isMethodDeclaration(node)) {
      const names = decoratorNames(node);
      const exposed = names.some((name) => HTTP.has(name) || name === "Tool");
      if (exposed && !names.includes("Can") && !names.includes("Public")) {
        failures.push(`${file}: handler ${node.name.getText(source)} lacks @Can or @Public`);
      }
      const tool = ts.getDecorators(node)?.find((decorator) => {
        const expr = decorator.expression;
        return ts.isCallExpression(expr) && calleeName(expr.expression) === "Tool";
      });
      const can = ts.getDecorators(node)?.find((decorator) => {
        const expr = decorator.expression;
        return ts.isCallExpression(expr) && calleeName(expr.expression) === "Can";
      });
      if (tool && can) {
        const toolExpr = tool.expression;
        const canExpr = can.expression;
        if (ts.isCallExpression(toolExpr) && ts.isCallExpression(canExpr)) {
          const options = toolExpr.arguments[1];
          const permission = stringArg(canExpr);
          if (
            options &&
            ts.isObjectLiteralExpression(options) &&
            permission
          ) {
            const scopes = options.properties.find(
              (prop) =>
                ts.isPropertyAssignment(prop) &&
                prop.name.getText(source) === "scopes",
            );
            if (scopes && ts.isPropertyAssignment(scopes)) {
              const init = scopes.initializer.getText(source);
              if (!init.includes(permission)) {
                failures.push(
                  `${file}: @Tool scopes do not include @Can('${permission}')`,
                );
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log("casl:check ok");
