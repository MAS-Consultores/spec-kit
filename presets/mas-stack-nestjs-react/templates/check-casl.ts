/**
 * Reference CASL consistency check (TypeScript AST).
 * Copy to scripts/check-casl.ts and run it from `pnpm verify`.
 * Negative fixtures must fail: a handler missing @Can and @Public, MCP scopes
 * that do not include the handler's @Can permission, and a manifest action
 * (other than reserved: true) that no @Can or @Tool scope uses.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

const ROOT = "apps/api/src";

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

function propName(name: ts.PropertyName, source: ts.SourceFile): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return name.getText(source);
}

function propertyInit(
  obj: ts.ObjectLiteralExpression,
  name: string,
  source: ts.SourceFile,
): ts.Expression | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (propName(prop.name, source) === name) return prop.initializer;
  }
  return undefined;
}

function stringList(expr: ts.Expression | undefined): string[] {
  if (!expr) return [];
  if (ts.isStringLiteral(expr)) return [expr.text];
  if (ts.isArrayLiteralExpression(expr)) {
    return expr.elements.flatMap((element) =>
      ts.isStringLiteral(element) ? [element.text] : [],
    );
  }
  return [];
}

function toolScopes(expr: ts.CallExpression, source: ts.SourceFile): string[] {
  const scopes: string[] = [];
  for (const index of [0, 1]) {
    const arg = expr.arguments[index];
    if (!arg || !ts.isObjectLiteralExpression(arg)) continue;
    scopes.push(...stringList(propertyInit(arg, "scopes", source)));
  }
  return scopes;
}

function callDecorator(
  node: ts.Node,
  name: string,
): ts.CallExpression | undefined {
  const decorators = ts.getDecorators(node) ?? [];
  for (const decorator of decorators) {
    const expr = decorator.expression;
    if (ts.isCallExpression(expr) && calleeName(expr.expression) === name) return expr;
  }
  return undefined;
}

interface ManifestAction {
  file: string;
  category: string;
  code: string;
  reserved: boolean;
}

function manifestActions(file: string, source: ts.SourceFile): ManifestAction[] {
  const found: ManifestAction[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const actions = propertyInit(node, "actions", source);
      const categoryExpr = propertyInit(node, "category", source);
      if (
        actions &&
        ts.isArrayLiteralExpression(actions) &&
        categoryExpr &&
        ts.isStringLiteral(categoryExpr)
      ) {
        for (const element of actions.elements) {
          if (!ts.isObjectLiteralExpression(element)) continue;
          const codeExpr = propertyInit(element, "code", source);
          if (!codeExpr || !ts.isStringLiteral(codeExpr)) continue;
          const reservedExpr = propertyInit(element, "reserved", source);
          const reserved =
            reservedExpr !== undefined &&
            reservedExpr.kind === ts.SyntaxKind.TrueKeyword;
          found.push({
            file,
            category: categoryExpr.text,
            code: codeExpr.text,
            reserved,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

const failures: string[] = [];
const declared = new Set<string>();
const used = new Set<string>();

if (!existsSync(ROOT)) {
  console.log("casl:check ok");
  process.exit(0);
}

for (const file of filesUnder(ROOT)) {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (file.endsWith(".permissions.ts")) {
    for (const action of manifestActions(file, source)) {
      const permission = `${action.category}:${action.code}`;
      declared.add(permission);
      if (!action.reserved) {
        const unusedLabel = `${file}: unused manifest action '${permission}'`;
        if (!failures.includes(unusedLabel)) failures.push(unusedLabel);
      }
    }
  }
  const visit = (node: ts.Node): void => {
    if (ts.isMethodDeclaration(node) && node.name) {
      const names = decoratorNames(node);
      const exposed = names.some((name) => HTTP.has(name) || name === "Tool");
      if (exposed && !names.includes("Can") && !names.includes("Public")) {
        failures.push(`${file}: handler ${node.name.getText(source)} lacks @Can or @Public`);
      }
      const canExpr = callDecorator(node, "Can");
      const toolExpr = callDecorator(node, "Tool");
      const permissions = canExpr ? stringList(canExpr.arguments[0]) : [];
      for (const permission of permissions) used.add(permission);
      if (toolExpr) {
        const scopes = toolScopes(toolExpr, source);
        for (const scope of scopes) used.add(scope);
        if (permissions.length > 0) {
          const missing = permissions.filter((permission) => !scopes.includes(permission));
          if (missing.length > 0) {
            failures.push(
              `${file}: @Tool scopes do not include @Can('${missing.join(", ")}')`,
            );
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

for (const failure of [...failures]) {
  if (!failure.includes("unused manifest action")) continue;
  const match = failure.match(/'([^']+)'/);
  if (match && used.has(match[1])) {
    const index = failures.indexOf(failure);
    if (index >= 0) failures.splice(index, 1);
  }
}

for (const permission of used) {
  if (permission.includes(":") && !declared.has(permission)) {
    failures.push(`undeclared permission '${permission}'`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log("casl:check ok");
