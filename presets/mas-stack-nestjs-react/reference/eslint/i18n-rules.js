import { readFileSync } from "node:fs";

/** Teaching rules for i18n. The message is the fix. */

const MUTATIONS = new Set([
  "changeLanguage",
  "addResource",
  "addResourceBundle",
  "removeResourceBundle",
  "setDefaultNamespace",
]);

const RENDER_MESSAGE =
  "Do not call i18n.changeLanguage or other i18n mutations during render. Call them from an event handler or from an effect that returns early when i18n.language is already the resolved locale (preference, then the locale cookie, then the browser, then the organization default).";

const GUARD_MESSAGE =
  "changeLanguage inside an effect needs a guard: if (i18n.language !== next) before the call, so a later pass does not reapply the browser language over the cookie.";

const MODULE_T_MESSAGE =
  "Do not call t() or i18n.t() at module scope. Store the key and call t() inside the component or hook that renders it.";

const NAV_MESSAGE =
  "Navigation constants must store translation keys (labelKey), not visible copy and not t() results. Call t(labelKey) while rendering the menu.";

const COPY_MESSAGE =
  "Visible copy belongs in locales/*.json. Use t() for JSX text and for aria-label, title, placeholder, and alt. Punctuation, numbers, and apps/web/src/i18n/literal-allowlist.json are the only exceptions.";

const VISIBLE_PROPS = new Set(["aria-label", "title", "placeholder", "alt"]);
const NAV_NAMES = /(nav|menu|sidebar|navigation|links)/i;
const VISIBLE_FIELDS = new Set(["label", "title", "text", "heading", "description", "help", "caption"]);

function allowlist() {
  try {
    const raw = readFileSync("apps/web/src/i18n/literal-allowlist.json", "utf8");
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function isFunction(node) {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

function functionName(fn) {
  if (fn.id && fn.id.type === "Identifier") return fn.id.name;
  const parent = fn.parent;
  if (parent && parent.type === "VariableDeclarator" && parent.id.type === "Identifier") {
    return parent.id.name;
  }
  if (
    parent &&
    parent.type === "Property" &&
    !parent.computed &&
    parent.key.type === "Identifier"
  ) {
    return parent.key.name;
  }
  return "";
}

function innermostFunction(node) {
  let current = node.parent;
  while (current) {
    if (isFunction(current)) return current;
    current = current.parent;
  }
  return null;
}

function isComponentOrHook(fn) {
  const name = functionName(fn);
  return /^[A-Z]/.test(name) || /^use[A-Z]/.test(name);
}

function insideComponentOrHook(fn) {
  let current = fn;
  while (current) {
    if (isFunction(current) && isComponentOrHook(current)) return true;
    current = current.parent;
  }
  return false;
}

function isHandler(fn) {
  const name = functionName(fn);
  if (/^handle[A-Z0-9_]/.test(name)) return true;
  const parent = fn.parent;
  if (!parent) return false;
  if (parent.type === "JSXExpressionContainer" && parent.parent && parent.parent.type === "JSXAttribute") {
    const attr = parent.parent.name;
    return attr.type === "JSXIdentifier" && attr.name.startsWith("on");
  }
  if (parent.type === "Property" && !parent.computed && parent.key.type === "Identifier") {
    return parent.key.name.startsWith("on");
  }
  return false;
}

function isEffectCallback(fn) {
  const parent = fn.parent;
  if (!parent || parent.type !== "CallExpression") return false;
  const callee = parent.callee;
  const name =
    callee.type === "Identifier"
      ? callee.name
      : callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier"
        ? callee.property.name
        : "";
  return name === "useEffect" || name === "useLayoutEffect";
}

function hasGuard(node, stop) {
  let current = node.parent;
  while (current && current !== stop) {
    if (current.type === "IfStatement") return true;
    current = current.parent;
  }
  return false;
}

function mutationName(node) {
  const callee = node.callee;
  if (callee.type !== "MemberExpression" || callee.computed) return "";
  if (callee.property.type !== "Identifier") return "";
  return MUTATIONS.has(callee.property.name) ? callee.property.name : "";
}

function isTranslationCall(node) {
  const callee = node.callee;
  if (callee.type === "Identifier" && callee.name === "t") return true;
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  return callee.property.type === "Identifier" && callee.property.name === "t";
}

function moduleLevel(node) {
  let current = node.parent;
  while (current) {
    if (isFunction(current)) return false;
    current = current.parent;
  }
  return true;
}

function navVariable(node) {
  let current = node.parent;
  while (current) {
    if (current.type === "VariableDeclarator" && current.id.type === "Identifier") {
      return NAV_NAMES.test(current.id.name);
    }
    if (isFunction(current)) return false;
    current = current.parent;
  }
  return false;
}

function hasLetters(value) {
  return /\p{L}/u.test(value);
}

function reportCopy(context, node, allowed) {
  context.report({ node, messageId: "copy" });
  void allowed;
}

export const i18nRules = {
  "no-i18n-mutation-in-render": {
    meta: {
      type: "problem",
      docs: { description: RENDER_MESSAGE },
      schema: [],
      messages: { render: RENDER_MESSAGE, guard: GUARD_MESSAGE },
    },
    create(context) {
      return {
        CallExpression(node) {
          if (mutationName(node) === "") return;
          const fn = innermostFunction(node);
          if (fn == null) return;
          if (isHandler(fn)) return;
          if (isEffectCallback(fn)) {
            if (!hasGuard(node, fn)) context.report({ node, messageId: "guard" });
            return;
          }
          if (isComponentOrHook(fn) || insideComponentOrHook(fn)) {
            context.report({ node, messageId: "render" });
          }
        },
      };
    },
  },
  "no-module-translation": {
    meta: {
      type: "problem",
      docs: { description: MODULE_T_MESSAGE },
      schema: [],
      messages: { module: MODULE_T_MESSAGE, nav: NAV_MESSAGE },
    },
    create(context) {
      return {
        CallExpression(node) {
          if (!isTranslationCall(node)) return;
          if (moduleLevel(node) || navVariable(node)) {
            context.report({ node, messageId: "module" });
          }
        },
        Property(node) {
          if (node.computed || node.key.type !== "Identifier") return;
          if (!VISIBLE_FIELDS.has(node.key.name)) return;
          if (node.value.type !== "Literal" || typeof node.value.value !== "string") return;
          if (!hasLetters(node.value.value)) return;
          if (!navVariable(node)) return;
          context.report({ node, messageId: "nav" });
        },
      };
    },
  },
  "no-literal-copy": {
    meta: {
      type: "problem",
      docs: { description: COPY_MESSAGE },
      schema: [],
      messages: { copy: COPY_MESSAGE },
    },
    create(context) {
      const allowed = allowlist();
      return {
        JSXText(node) {
          const text = node.value.replace(/\s+/g, " ").trim();
          if (text === "" || !hasLetters(text) || allowed.has(text)) return;
          reportCopy(context, node, allowed);
        },
        JSXAttribute(node) {
          if (node.name.type !== "JSXIdentifier" || !VISIBLE_PROPS.has(node.name.name)) return;
          const value = node.value;
          if (!value || value.type !== "Literal" || typeof value.value !== "string") return;
          const text = value.value.trim();
          if (text === "" || !hasLetters(text) || allowed.has(text)) return;
          context.report({ node, messageId: "copy" });
        },
      };
    },
  },
};
