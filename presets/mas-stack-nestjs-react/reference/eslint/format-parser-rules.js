/** Ban hand-rolled parsers for standard formats. Approved libraries live in the preset. */

const XLSX_MESSAGE =
  "Do not import the npm package xlsx (SheetJS). It is frozen on npm and has known CVEs. Read xlsx in streaming mode and write xlsx with exceljs. See approved-libraries.md.";

const ZLIB_MESSAGE =
  "Do not inflate, inflateRaw, unzip, or gunzip (including Sync and stream variants) from zlib or node:zlib in app code. That is a hand-rolled ZIP reader. No ZIP library is approved yet: name one in the plan, or justify it, and do not invent an approval.";

const XML_MESSAGE =
  "Do not parse XML or spreadsheet XML with a regular expression (<row, <c, <sheetData, sheet1.xml). No XML library is approved yet: name one in the plan, or justify it. Read xlsx with exceljs.";

const CSV_MESSAGE =
  "Do not parse an uploaded CSV by splitting lines on ',' or ';'. Use csv-parse. See approved-libraries.md.";

const PDF_MESSAGE =
  "Do not hand-write a PDF (%PDF-, xref, trailer, startxref, obj/endobj). Generate from HTML with Playwright page.pdf(), merge or stamp with pdf-lib, and extract text with unpdf. See approved-libraries.md.";

const ZLIB_FUNCS = new Set([
  "inflate",
  "inflateSync",
  "inflateRaw",
  "inflateRawSync",
  "unzip",
  "unzipSync",
  "gunzip",
  "gunzipSync",
  "createInflate",
  "createInflateRaw",
  "createGunzip",
  "createUnzip",
  "Inflate",
  "InflateRaw",
  "Unzip",
  "Gunzip",
]);

const XML_MARKERS = ["<row", "<c ", "<c>", "<sheetData", "sheet1.xml"];

const CSV_RECEIVERS = new Set([
  "line",
  "lines",
  "row",
  "rows",
  "record",
  "records",
  "csvline",
  "csvrow",
  "fileline",
  "rawline",
  "csvtext",
  "filetext",
  "uploadedtext",
  "sheetxml",
]);

function normalizedName(filename) {
  return filename.replaceAll("\\", "/");
}

function isProductCode(filename) {
  const path = normalizedName(filename);
  if (path.includes("/node_modules/") || path.includes("/scripts/") || path.includes("/eslint/")) {
    return false;
  }
  if (/\.(spec|e2e|test)\.[cm]?[jt]sx?$/.test(path)) return false;
  return path.includes("/apps/") || path.includes("/packages/") || path.includes("/lint-fixtures/");
}

function isXlsxSource(source) {
  return source === "xlsx" || source.startsWith("xlsx/");
}

function isZlibSource(source) {
  return source === "zlib" || source === "node:zlib";
}

function importedName(specifier) {
  if (specifier.type === "Identifier") return specifier.name;
  if (specifier.type === "Literal" && typeof specifier.value === "string") return specifier.value;
  return "";
}

function calleeName(callee) {
  if (callee.type === "Identifier") return callee.name;
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }
  return "";
}

function stringValue(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
  }
  return null;
}

function regexPattern(node) {
  if (node.type === "Literal" && node.regex && typeof node.regex.pattern === "string") {
    return node.regex.pattern;
  }
  return null;
}

function looksLikeHandRolledPdf(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("%PDF-") || value.includes("startxref") || value.includes("endobj")) return true;
  if (/\d+\s+\d+\s+obj\b/.test(value)) return true;
  const trimmed = value.trim();
  if (trimmed === "xref" || trimmed === "trailer" || trimmed === "obj" || trimmed === "endobj") return true;
  return /(^|\n)\s*xref\s*(\n|$)/.test(value) || /(^|\n)\s*trailer\s*(\n|$)/.test(value);
}

function receiverName(call) {
  const callee = call.callee;
  if (callee.type !== "MemberExpression") return "";
  const object = callee.object;
  if (object.type === "Identifier") return object.name;
  if (
    object.type === "MemberExpression" &&
    !object.computed &&
    object.property.type === "Identifier"
  ) {
    return object.property.name;
  }
  return "";
}

function isCsvSplit(call) {
  const callee = call.callee;
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  if (callee.property.type !== "Identifier" || callee.property.name !== "split") return false;
  const separator = stringValue(call.arguments[0]);
  if (separator !== "," && separator !== ";") return false;
  return CSV_RECEIVERS.has(receiverName(call).toLowerCase());
}

export const formatParserRules = {
  "no-handrolled-format-parsers": {
    meta: {
      type: "problem",
      docs: { description: XLSX_MESSAGE },
      schema: [],
      messages: {
        xlsx: XLSX_MESSAGE,
        zlib: ZLIB_MESSAGE,
        xml: XML_MESSAGE,
        csv: CSV_MESSAGE,
        pdf: PDF_MESSAGE,
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename();
      if (!isProductCode(filename)) return {};

      const zlibNamespaces = new Set();
      const zlibLocals = new Set();

      function noteZlibImport(node) {
        for (const spec of node.specifiers) {
          if (spec.type === "ImportSpecifier") {
            if (ZLIB_FUNCS.has(importedName(spec.imported))) zlibLocals.add(spec.local.name);
            continue;
          }
          zlibNamespaces.add(spec.local.name);
        }
      }

      function noteZlibRequire(call, source) {
        if (!isZlibSource(source)) return;
        const parent = call.parent;
        if (!parent || parent.type !== "VariableDeclarator") {
          return;
        }
        if (parent.id.type === "Identifier") zlibNamespaces.add(parent.id.name);
        if (parent.id.type !== "ObjectPattern") return;
        for (const property of parent.id.properties) {
          if (property.type !== "Property") continue;
          const key = importedName(property.key);
          const local = property.value.type === "Identifier" ? property.value.name : "";
          if (ZLIB_FUNCS.has(key) && local) zlibLocals.add(local);
        }
      }

      function reportZlib(node) {
        context.report({ node, messageId: "zlib" });
      }

      return {
        ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== "string") return;
          if (isXlsxSource(source)) context.report({ node, messageId: "xlsx" });
          if (isZlibSource(source)) noteZlibImport(node);
        },
        ImportExpression(node) {
          const source = stringValue(node.source);
          if (source && isXlsxSource(source)) context.report({ node, messageId: "xlsx" });
        },
        CallExpression(node) {
          if (node.callee.type === "Identifier" && node.callee.name === "require") {
            const source = stringValue(node.arguments[0]);
            if (source && isXlsxSource(source)) context.report({ node, messageId: "xlsx" });
            if (source) noteZlibRequire(node, source);
          }
          if (node.callee.type === "Identifier" && zlibLocals.has(node.callee.name)) {
            reportZlib(node);
          }
          if (
            node.callee.type === "MemberExpression" &&
            !node.callee.computed &&
            node.callee.property.type === "Identifier" &&
            ZLIB_FUNCS.has(node.callee.property.name)
          ) {
            const object = node.callee.object;
            const required = object.type === "CallExpression" ? stringValue(object.arguments?.[0]) : null;
            const named = object.type === "Identifier" && zlibNamespaces.has(object.name);
            if (named || (required && isZlibSource(required))) reportZlib(node);
          }
          if (isCsvSplit(node)) context.report({ node, messageId: "csv" });
        },
        NewExpression(node) {
          if (calleeName(node.callee) !== "RegExp") return;
          const pattern = stringValue(node.arguments[0]);
          if (pattern && XML_MARKERS.some((marker) => pattern.includes(marker))) {
            context.report({ node, messageId: "xml" });
          }
        },
        Literal(node) {
          const pattern = regexPattern(node);
          if (pattern && XML_MARKERS.some((marker) => pattern.includes(marker))) {
            context.report({ node, messageId: "xml" });
          }
          if (typeof node.value === "string" && looksLikeHandRolledPdf(node.value)) {
            context.report({ node, messageId: "pdf" });
          }
        },
        TemplateElement(node) {
          const cooked = node.value.cooked ?? node.value.raw;
          if (looksLikeHandRolledPdf(cooked)) context.report({ node, messageId: "pdf" });
        },
      };
    },
  },
};
