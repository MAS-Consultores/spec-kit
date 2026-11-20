/**
 * Second library package: dates, charts, HTML, mail, jobs, uploads, LLM, forms.
 * Messages name the approved replacement. Justified eslint-disable still works.
 */

/** setTimeout at or above this delay is scheduling. Shorter delays stay for protocol timing. */
const LONG_TIMER_MS = 1000;

const DAY_MS = 86_400_000;

const SANITIZE_HTML =
  "Sanitize HTML with DOMPurify in the web app, or with isomorphic-dompurify or sanitize-html in the API. A regex or replace that strips tags is not a sanitizer.";

const DANGEROUS_HTML =
  "dangerouslySetInnerHTML must receive DOMPurify.sanitize (or isomorphic-dompurify / sanitize-html). Do not pass a raw string.";

const EMAIL_HTML =
  "Do not hand-build email HTML (<html, <table, <body) or use an unescaped triple-stash {{{ }}}. Compile a .mjml template with mjml (mjml2html) at validationLevel 'strict', and interpolate with Handlebars {{ }} so values are escaped. A {{{ }}} exception needs a justified eslint-disable.";

const TIMER =
  "Do not schedule work with setInterval or with setTimeout of 1000ms or more. Queues, cron, and background jobs are pending a decision (see approved-libraries.md: BullMQ+Redis or pg-boss on Postgres). Justify the mechanism in the plan. A setTimeout under 1000ms may stay for protocol timing.";

const CHARTS =
  "Do not draw charts with a calculated <svg> path/rect or canvas getContext('2d'). Use Recharts. A Sankey may use d3-sankey. A heatmap is an accessible <table>. Static icon paths may stay.";

const DATE_MATH =
  "Do not add or subtract 86400000 (or 24 * 60 * 60 * 1000) from getTime(), and do not call setDate(getDate() + n). Use date-fns with @date-fns/tz.";

const FILE_TYPE =
  "Do not trust file.originalname or file.mimetype. Detect the type with file-type (magic bytes). mas/multipart-upload-limits still requires limits.fileSize and a validator; this rule only flags the client-supplied name or MIME.";

const LLM_FETCH =
  "Do not call fetch, axios, or got against /chat/completions, /v1/messages, /completions, or /embeddings. Use the Vercel AI SDK or the provider's official SDK, and validate the output with zod.";

const SECRET_CLIENT =
  "Do not put KEY, SECRET, or TOKEN in a VITE_* variable inside apps/web. The browser bundle can read it. Keep the secret in the API config module.";

const RAW_ENV =
  "Read process.env and requiredEnv only in apps/api/src/config (the Nest ConfigModule validated with Zod). Add the variable to that module and to .env.example, then inject ConfigService. prisma.config.ts, the prisma database-url helper, scripts, and e2e configs are the other allowed readers.";

const THROTTLE =
  "Auth, account recovery, AI, and upload handlers need @Throttle or the skeleton equivalent SensitiveThrottle. The global ThrottlerGuard still applies LOGIN_THROTTLE_LIMIT from the Zod config.";

const HELMET =
  "apps/api/src/main.ts must register helmet (app.use(helmet())) before the app listens.";

const FORM_ERRORS =
  "Do not keep per-field form errors in useState. Use react-hook-form and @hookform/resolvers/zod.";

const MOTION =
  "Confetti and chart animations must honor prefers-reduced-motion. Skip canvas-confetti when matchMedia('(prefers-reduced-motion: reduce)') matches, and set Recharts isAnimationActive={false} in that case.";

const RESTRICTED_ALT = {
  moment: "Use date-fns and @date-fns/tz. moment is forbidden, including moment/*.",
  dayjs: "Use date-fns and @date-fns/tz. dayjs is forbidden, including dayjs/*.",
  "chart.js": "Use Recharts. chart.js is forbidden, including chart.js/*.",
  "react-chartjs-2": "Use Recharts. react-chartjs-2 is forbidden.",
  echarts:
    "Use Recharts. echarts is forbidden, including echarts/*, unless a justified eslint-disable explains why Recharts cannot do it.",
  "socket.io":
    "Do not add socket.io. A real requirement may use a justified eslint-disable. There is no second realtime stack by default.",
  "socket.io-client":
    "Do not add socket.io-client. A real requirement may use a justified eslint-disable.",
  ws: "Do not add ws. A real requirement may use a justified eslint-disable.",
  xlsx: "The npm package xlsx (SheetJS) is forbidden. Read and write xlsx with exceljs. See approved-libraries.md.",
};

function restrictedEntry(name) {
  const message = RESTRICTED_ALT[name];
  return { name, message };
}

function restrictedPattern(group, name) {
  return { group: [group, `${group.slice(0, -2)}/**`], message: RESTRICTED_ALT[name] };
}

export const restrictedImports = {
  paths: [
    restrictedEntry("moment"),
    restrictedEntry("dayjs"),
    restrictedEntry("chart.js"),
    restrictedEntry("react-chartjs-2"),
    restrictedEntry("echarts"),
    restrictedEntry("socket.io"),
    restrictedEntry("socket.io-client"),
    restrictedEntry("ws"),
    restrictedEntry("xlsx"),
  ],
  patterns: [
    restrictedPattern("moment/*", "moment"),
    restrictedPattern("dayjs/*", "dayjs"),
    restrictedPattern("chart.js/*", "chart.js"),
    restrictedPattern("echarts/*", "echarts"),
    restrictedPattern("socket.io/*", "socket.io"),
    restrictedPattern("socket.io-client/*", "socket.io-client"),
    restrictedPattern("ws/*", "ws"),
    restrictedPattern("xlsx/*", "xlsx"),
  ],
};

function rule(description, create) {
  return {
    meta: { type: "problem", docs: { description }, schema: [], messages: { banned: description } },
    create,
  };
}

function filePath(context) {
  return (context.filename ?? "").replaceAll("\\", "/");
}

function isApiProduct(filename) {
  return filename.includes("/apps/api/") && !filename.endsWith(".spec.ts") && !filename.endsWith(".e2e.ts") && !filename.includes("/test/");
}

function isApiMain(filename) {
  return filename.endsWith("/apps/api/src/main.ts") || filename.endsWith("/lint-fixtures/api-main.ts");
}

function calleeName(node) {
  if (node.type === "Identifier") return node.name;
  if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier"
  ) {
    return node.property.name;
  }
  return "";
}

function foldedNumber(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "number") return node.value;
  if (node.type === "UnaryExpression" && node.operator === "-" ) {
    const inner = foldedNumber(node.argument);
    return inner === null ? null : -inner;
  }
  if (node.type === "BinaryExpression" && (node.operator === "*" || node.operator === "+")) {
    const left = foldedNumber(node.left);
    const right = foldedNumber(node.right);
    if (left === null || right === null) return null;
    return node.operator === "*" ? left * right : left + right;
  }
  return null;
}

function isDayMultiple(node) {
  const value = foldedNumber(node);
  return value !== null && value !== 0 && value % DAY_MS === 0;
}

function patternSource(node) {
  if (!node) return "";
  if (node.type === "Literal" && node.regex && typeof node.regex.pattern === "string") {
    return node.regex.pattern;
  }
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (
    node.type === "NewExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "RegExp" &&
    node.arguments[0] &&
    node.arguments[0].type === "Literal" &&
    typeof node.arguments[0].value === "string"
  ) {
    return node.arguments[0].value;
  }
  return "";
}

function looksLikeTagStrip(pattern) {
  if (!pattern.includes("<")) return false;
  return (
    pattern.includes("<[^") ||
    pattern.includes("</") ||
    /<\\?\??\/?[a-zA-Z][^>]*>/.test(pattern) ||
    /script|iframe|onerror|onload/i.test(pattern)
  );
}

function literalText(node) {
  if (!node) return "";
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral") {
    return node.quasis.map((part) => part.value.cooked ?? "").join("");
  }
  return "";
}

function emailMarkup(text) {
  return /<(html|table|body)\b/i.test(text) || text.includes("{{{");
}

function isEmailFile(filename) {
  return /(^|\/)(emails?|mailers?|correo)(\/|\.)/.test(filename);
}

function decoratorExprName(decorator) {
  const expr = decorator.expression;
  return calleeName(expr.type === "CallExpression" ? expr.callee : expr);
}

function decoratorString(decorator) {
  const expr = decorator.expression;
  if (expr.type !== "CallExpression") return "";
  const arg = expr.arguments[0];
  return arg && arg.type === "Literal" && typeof arg.value === "string" ? arg.value : "";
}

const HTTP_DECORATORS = new Set(["Get", "Post", "Put", "Patch", "Delete", "All"]);
const SENSITIVE = /auth|login|sign-?in|logout|refresh|recover|forgot|reset|password|otp|upload|files|\/ai\b|\bai\b|llm|chat|completion|embedding/i;

function classDecorators(node) {
  const body = node.parent;
  if (!body || body.type !== "ClassBody") return [];
  const klass = body.parent;
  if (!klass || (klass.type !== "ClassDeclaration" && klass.type !== "ClassExpression")) return [];
  return klass.decorators ?? [];
}

function isSanitizeCall(node) {
  if (node.type !== "CallExpression") return false;
  const name = calleeName(node.callee);
  if (name === "sanitize" || name === "sanitizeHtml") return true;
  return false;
}

function jsxName(node) {
  if (!node || node.type !== "JSXOpeningElement") return "";
  const name = node.name;
  if (name.type === "JSXIdentifier") return name.name;
  return "";
}

function jsxAttr(opening, attrName) {
  return opening.attributes.find(
    (attr) => attr.type === "JSXAttribute" && attr.name.type === "JSXIdentifier" && attr.name.name === attrName,
  );
}

function isCalculatedAttr(attr) {
  if (!attr || attr.type !== "JSXAttribute") return false;
  const value = attr.value;
  if (!value || value.type !== "JSXExpressionContainer") return false;
  const expr = value.expression;
  if (expr.type === "Literal") return false;
  return true;
}

function elementHasCalculatedShape(node) {
  const name = jsxName(node.openingElement);
  if (name !== "path" && name !== "rect" && name !== "circle" && name !== "line") return false;
  const attrs = ["d", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "cx", "cy", "r"];
  return attrs.some((attrName) => isCalculatedAttr(jsxAttr(node.openingElement, attrName)));
}

function walkJsx(node, visit) {
  if (!node || typeof node !== "object") return;
  if (node.type === "JSXElement") visit(node);
  for (const child of node.children ?? []) walkJsx(child, visit);
}

function callTouchesLlm(node) {
  const name = calleeName(node.callee);
  const root =
    node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier"
      ? node.callee.object.name
      : name;
  if (name !== "fetch" && root !== "axios" && root !== "got" && name !== "axios" && name !== "got") {
    return false;
  }
  const llm = /\/chat\/completions|\/v1\/messages|\/completions|\/embeddings/;
  return node.arguments.some((arg) => llm.test(literalText(arg)) || nestedUrl(arg, llm));
}

function nestedUrl(node, llm) {
  if (!node || node.type !== "ObjectExpression") return false;
  return node.properties.some((prop) => {
    if (prop.type !== "Property") return false;
    return llm.test(literalText(prop.value));
  });
}

function secretName(name) {
  return typeof name === "string" && /^VITE_/.test(name) && /(KEY|SECRET|TOKEN)/.test(name);
}

function isProcessEnv(node) {
  if (node.type !== "MemberExpression") return false;
  if (node.object.type !== "Identifier" || node.object.name !== "process") return false;
  if (!node.computed && node.property.type === "Identifier" && node.property.name === "env") return true;
  return node.computed && node.property.type === "Literal" && node.property.value === "env";
}

function fileMentionsMagicBytes(context) {
  const text = context.sourceCode.getText();
  return /file-type|fileTypeFromBuffer|fileTypeFromFile|fileTypeFromBlob/.test(text);
}

function fileHasReducedMotion(context) {
  return context.sourceCode.getText().includes("prefers-reduced-motion");
}

function isFormFile(context) {
  const text = context.sourceCode.getText();
  return text.includes("<form") || text.includes("onSubmit");
}

export const package2Rules = {
  "no-regex-html-sanitize": rule(SANITIZE_HTML, (context) => ({
    CallExpression(node) {
      if (calleeName(node.callee) !== "replace" && calleeName(node.callee) !== "replaceAll") return;
      const pattern = patternSource(node.arguments[0]);
      if (looksLikeTagStrip(pattern)) context.report({ node, messageId: "banned" });
    },
  })),
  "no-dangerous-html-unsanitized": rule(DANGEROUS_HTML, (context) => ({
    JSXAttribute(node) {
      if (node.name.type !== "JSXIdentifier" || node.name.name !== "dangerouslySetInnerHTML") return;
      const value = node.value;
      if (!value || value.type !== "JSXExpressionContainer") {
        context.report({ node, messageId: "banned" });
        return;
      }
      const expr = value.expression;
      if (expr.type !== "ObjectExpression") {
        context.report({ node, messageId: "banned" });
        return;
      }
      const htmlProp = expr.properties.find(
        (prop) =>
          prop.type === "Property" &&
          !prop.computed &&
          ((prop.key.type === "Identifier" && prop.key.name === "__html") ||
            (prop.key.type === "Literal" && prop.key.value === "__html")),
      );
      if (!htmlProp || htmlProp.type !== "Property" || !isSanitizeCall(htmlProp.value)) {
        context.report({ node, messageId: "banned" });
      }
    },
  })),
  "no-handmade-email-html": rule(EMAIL_HTML, (context) => {
    const filename = filePath(context);
    if (!isEmailFile(filename)) return {};
    function reportIfEmail(node, text) {
      if (emailMarkup(text)) context.report({ node, messageId: "banned" });
    }
    return {
      Literal(node) {
        if (typeof node.value === "string") reportIfEmail(node, node.value);
      },
      TemplateLiteral(node) {
        reportIfEmail(node, literalText(node));
      },
    };
  }),
  "no-timer-scheduling": rule(TIMER, (context) => {
    if (!isApiProduct(filePath(context))) return {};
    return {
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (name === "setInterval") {
          context.report({ node, messageId: "banned" });
          return;
        }
        if (name !== "setTimeout") return;
        const delay = foldedNumber(node.arguments[1]);
        if (delay !== null && delay >= LONG_TIMER_MS) context.report({ node, messageId: "banned" });
      },
    };
  }),
  "no-handmade-charts": rule(CHARTS, (context) => {
    const filename = filePath(context);
    if (filename.includes("/icons/")) return {};
    return {
      CallExpression(node) {
        if (calleeName(node.callee) !== "getContext") return;
        const arg = node.arguments[0];
        if (arg && arg.type === "Literal" && arg.value === "2d") context.report({ node, messageId: "banned" });
      },
      JSXElement(node) {
        if (jsxName(node.openingElement) !== "svg") return;
        walkJsx(node, (child) => {
          if (child !== node && elementHasCalculatedShape(child)) {
            context.report({ node: child, messageId: "banned" });
          }
        });
      },
    };
  }),
  "no-manual-date-math": rule(DATE_MATH, (context) => ({
    BinaryExpression(node) {
      if (node.operator !== "+" && node.operator !== "-") return;
      const leftTime = node.left.type === "CallExpression" && calleeName(node.left.callee) === "getTime";
      const rightTime = node.right.type === "CallExpression" && calleeName(node.right.callee) === "getTime";
      if (leftTime && isDayMultiple(node.right)) context.report({ node, messageId: "banned" });
      if (rightTime && isDayMultiple(node.left)) context.report({ node, messageId: "banned" });
    },
    CallExpression(node) {
      const name = calleeName(node.callee);
      if (name !== "setDate" && name !== "setUTCDate") return;
      const arg = node.arguments[0];
      if (!arg || arg.type !== "BinaryExpression" || (arg.operator !== "+" && arg.operator !== "-")) return;
      const shiftsDate =
        (arg.left.type === "CallExpression" &&
          (calleeName(arg.left.callee) === "getDate" || calleeName(arg.left.callee) === "getUTCDate")) ||
        (arg.right.type === "CallExpression" &&
          (calleeName(arg.right.callee) === "getDate" || calleeName(arg.right.callee) === "getUTCDate"));
      if (shiftsDate) context.report({ node, messageId: "banned" });
    },
  })),
  "no-client-file-type-trust": rule(FILE_TYPE, (context) => {
    if (fileMentionsMagicBytes(context)) return {};
    return {
      MemberExpression(node) {
        if (node.computed) return;
        if (node.property.type !== "Identifier") return;
        if (node.property.name !== "originalname" && node.property.name !== "mimetype") return;
        context.report({ node, messageId: "banned" });
      },
    };
  }),
  "no-direct-llm-fetch": rule(LLM_FETCH, (context) => ({
    CallExpression(node) {
      if (callTouchesLlm(node)) context.report({ node, messageId: "banned" });
    },
  })),
  "no-secret-in-client": rule(SECRET_CLIENT, (context) => {
    if (!filePath(context).includes("/apps/web/")) return {};
    return {
      MemberExpression(node) {
        const name = !node.computed && node.property.type === "Identifier" ? node.property.name : "";
        const computed = node.computed && node.property.type === "Literal" ? node.property.value : "";
        if (secretName(name) || secretName(computed)) context.report({ node, messageId: "banned" });
      },
    };
  }),
  "no-raw-process-env": rule(RAW_ENV, (context) => ({
    MemberExpression(node) {
      if (isProcessEnv(node)) context.report({ node, messageId: "banned" });
    },
    CallExpression(node) {
      if (node.callee.type === "Identifier" && node.callee.name === "requiredEnv") {
        context.report({ node, messageId: "banned" });
      }
    },
  })),
  "require-throttle-sensitive": rule(THROTTLE, (context) => ({
    MethodDefinition(node) {
      if (node.kind !== "method") return;
      const decorators = node.decorators ?? [];
      const http = decorators.filter((decorator) => HTTP_DECORATORS.has(decoratorExprName(decorator)));
      if (http.length === 0) return;
      const methodName = node.key.type === "Identifier" ? node.key.name : "";
      const routeBits = [
        methodName,
        ...http.map((decorator) => decoratorString(decorator)),
        ...classDecorators(node).map((decorator) => decoratorString(decorator)),
      ].join(" ");
      if (!SENSITIVE.test(routeBits)) return;
      const throttled = decorators.some((decorator) => /Throttle$/.test(decoratorExprName(decorator)));
      if (!throttled) context.report({ node: node.key, messageId: "banned" });
    },
  })),
  "require-helmet": rule(HELMET, (context) => {
    if (!isApiMain(filePath(context))) return {};
    let seen = false;
    return {
      CallExpression(node) {
        if (calleeName(node.callee) === "helmet") seen = true;
      },
      "Program:exit"(node) {
        if (!seen) context.report({ node, messageId: "banned" });
      },
    };
  }),
  "no-manual-form-errors": rule(FORM_ERRORS, (context) => {
    if (!isFormFile(context)) return {};
    return {
      CallExpression(node) {
        if (calleeName(node.callee) !== "useState") return;
        const parent = node.parent;
        if (!parent || parent.type !== "VariableDeclarator") return;
        const id = parent.id;
        const name =
          id.type === "ArrayPattern" && id.elements[0] && id.elements[0].type === "Identifier"
            ? id.elements[0].name
            : "";
        if (/^(is|has|can|should)/.test(name)) return;
        if (name === "errors" || /Errors?$/.test(name)) context.report({ node, messageId: "banned" });
      },
    };
  }),
  "reduced-motion-animations": rule(MOTION, (context) => {
    if (fileHasReducedMotion(context)) return {};
    return {
      ImportDeclaration(node) {
        if (node.source.type === "Literal" && node.source.value === "canvas-confetti") {
          context.report({ node, messageId: "banned" });
        }
      },
      CallExpression(node) {
        if (calleeName(node.callee) === "confetti") context.report({ node, messageId: "banned" });
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "isAnimationActive") return;
        const value = node.value;
        const isFalse =
          value &&
          value.type === "JSXExpressionContainer" &&
          value.expression.type === "Literal" &&
          value.expression.value === false;
        if (!isFalse) context.report({ node, messageId: "banned" });
      },
    };
  }),
};
