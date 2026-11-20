/** File upload teaching rules. Multipart is the default; JSON base64 is a sized exception. */

const ONE_MIB = 1024 * 1024;

const BASE64_MESSAGE =
  "Send file bytes as multipart/form-data with FileInterceptor or FilesInterceptor, not as JSON base64, a data: URI, or Buffer.from(..., 'base64'). A payload of at most 1 MiB may keep JSON only with an exception on this line: // eslint-disable-next-line mas/no-base64-file-upload -- <why JSON is required>.";

const SIZE_MESSAGE =
  "A base64 file field must set an explicit ceiling of at most 1 MiB (1_048_576 characters) on that string, for example @MaxLength(1048576) or z.string().max(1048576). A missing or larger cap does not count. The JSON exception still needs a justified mas/no-base64-file-upload suppression.";

const LIMITS_MESSAGE =
  "FileInterceptor, FilesInterceptor, FileFieldsInterceptor, and AnyFilesInterceptor must set limits.fileSize to a positive number in the options object on this call.";

const TYPE_MESSAGE =
  "This upload must validate the file type with a multer fileFilter or with ParseFilePipe validators that include FileTypeValidator or a magic-byte validator. MaxFileSizeValidator alone does not check the type.";

const INTERCEPTORS = new Set([
  "FileInterceptor",
  "FilesInterceptor",
  "FileFieldsInterceptor",
  "AnyFilesInterceptor",
]);

const SIZE_ONLY_VALIDATORS = new Set(["MaxFileSizeValidator"]);

function normalizedName(filename) {
  return filename.replaceAll("\\", "/");
}

function isUploadSurface(filename) {
  const path = normalizedName(filename);
  if (path.endsWith(".spec.ts") || path.endsWith(".e2e.ts")) return false;
  return path.endsWith(".dto.ts") || path.endsWith(".controller.ts") || path.endsWith(".service.ts");
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

function propertyName(node) {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  return "";
}

function isBase64FileName(name) {
  if (!name) return false;
  if (/base64url/i.test(name)) return false;
  return /base64|filecontent|filedata|dataurl|datauri/i.test(name);
}

function looksLikeFileBytes(node) {
  if (!node) return false;
  if (node.type === "Identifier") return /file|content|dataurl|payload|attachment|document|image|blob|upload/i.test(node.name);
  if (node.type === "MemberExpression") return looksLikeFileBytes(node.property) || looksLikeFileBytes(node.object);
  return false;
}

function decoratorCalleeName(decorator) {
  const expression = decorator.expression;
  const callee = expression.type === "CallExpression" ? expression.callee : expression;
  return calleeName(callee);
}

function numericValue(node, seen = new Set()) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "number") return node.value;
  if (node.type === "UnaryExpression" && node.operator === "-" && node.prefix) {
    const inner = numericValue(node.argument, seen);
    return inner === null ? null : -inner;
  }
  if (node.type === "BinaryExpression" && (node.operator === "*" || node.operator === "+")) {
    const left = numericValue(node.left, seen);
    const right = numericValue(node.right, seen);
    if (left === null || right === null) return null;
    return node.operator === "*" ? left * right : left + right;
  }
  if (node.type === "Identifier") {
    if (seen.has(node.name)) return null;
    seen.add(node.name);
    const resolved = resolveInit(node.name, node.parent);
    return resolved ? numericValue(resolved, seen) : null;
  }
  return null;
}

function resolveInit(name, fromNode) {
  let scopeNode = fromNode;
  while (scopeNode) {
    const body = blockBody(scopeNode);
    if (body) {
      for (const statement of body) {
        if (statement.type !== "VariableDeclaration") continue;
        for (const declarator of statement.declarations) {
          if (declarator.id.type === "Identifier" && declarator.id.name === name && declarator.init) {
            return declarator.init;
          }
        }
      }
    }
    scopeNode = scopeNode.parent ?? null;
  }
  return null;
}

function blockBody(node) {
  if (!node) return null;
  if (node.type === "Program" || node.type === "BlockStatement" || node.type === "StaticBlock") {
    return node.body;
  }
  if (node.body && (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression")) {
    return Array.isArray(node.body.body) ? node.body.body : null;
  }
  return null;
}

function resolveObject(node) {
  let current = node;
  const seen = new Set();
  while (current && current.type === "Identifier") {
    if (seen.has(current.name)) return null;
    seen.add(current.name);
    current = resolveInit(current.name, current.parent);
  }
  return current && current.type === "ObjectExpression" ? current : null;
}

function objectProperty(objectNode, name) {
  const object = resolveObject(objectNode) ?? (objectNode && objectNode.type === "ObjectExpression" ? objectNode : null);
  if (!object) return undefined;
  for (const property of object.properties) {
    if (property.type !== "Property") continue;
    if (propertyName(property.key) === name) return property.value;
  }
  return undefined;
}

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (!node.type) return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const value = node[key];
    if (value && typeof value === "object") walk(value, visit);
  }
}

function hasTypeValidation(root) {
  if (!root) return false;
  let found = false;
  walk(root, (node) => {
    if (found) return;
    if (node.type === "Identifier") {
      if (SIZE_ONLY_VALIDATORS.has(node.name)) return;
      if (node.name === "FileTypeValidator" || node.name === "ParseFilePipeBuilder") return;
      if (
        /Validator|Pipe/.test(node.name) &&
        /magic|mime|fileType|signature|contentType/i.test(node.name)
      ) {
        found = true;
      }
      return;
    }
    if (node.type === "NewExpression") {
      const name = calleeName(node.callee);
      if (name && !SIZE_ONLY_VALIDATORS.has(name) && name !== "ParseFilePipe" && name !== "ParseFilePipeBuilder") {
        const parent = node.parent;
        const insideValidators =
          parent &&
          parent.type === "ArrayExpression" &&
          parent.parent &&
          parent.parent.type === "Property" &&
          propertyName(parent.parent.key) === "validators";
        if (insideValidators) found = true;
      }
    }
    if (node.type === "CallExpression") {
      const name = calleeName(node.callee);
      if (
        name === "addFileTypeValidator" ||
        name === "addMagicBytesValidator" ||
        name === "fileFilter"
      ) {
        found = true;
      }
    }
    if (node.type === "Property" && propertyName(node.key) === "fileFilter") {
      found = true;
    }
  });
  if (found) return true;
  let mentionsFileType = false;
  walk(root, (node) => {
    if (node.type === "Identifier" && (node.name === "FileTypeValidator" || node.name === "addFileTypeValidator")) {
      mentionsFileType = true;
    }
  });
  return mentionsFileType;
}

function enclosingMethod(node) {
  let current = node.parent;
  while (current) {
    if (current.type === "MethodDefinition" || (current.type === "Property" && current.method)) {
      return current;
    }
    if (current.type === "FunctionDeclaration" || current.type === "FunctionExpression" || current.type === "ArrowFunctionExpression") {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function optionsNode(name, args) {
  if (name === "AnyFilesInterceptor") return args[0] ?? null;
  if (name === "FileInterceptor" || name === "FileFieldsInterceptor") return args[1] ?? null;
  const second = args[1];
  if (!second) return null;
  if (second.type === "ObjectExpression") return second;
  if (second.type === "Identifier" && /opt|limit|multer|config/i.test(second.name)) return second;
  return args[2] ?? null;
}

function positiveFileSize(valueNode) {
  if (!valueNode) return false;
  if (valueNode.type === "Identifier" && valueNode.name !== "undefined") {
    const resolved = numericValue(valueNode);
    if (resolved === null) return true;
    return resolved > 0;
  }
  const amount = numericValue(valueNode);
  if (amount === null) return valueNode.type !== "Literal";
  return amount > 0;
}

function isBase64Call(node) {
  return node.type === "CallExpression" && calleeName(node.callee) === "base64";
}

function hasIsBase64(node) {
  const decorators = node.decorators ?? [];
  if (decorators.some((decorator) => decoratorCalleeName(decorator) === "IsBase64")) return true;
  let found = false;
  if (node.value) walk(node.value, (child) => {
    if (isBase64Call(child)) found = true;
  });
  if (node.typeAnnotation) {
    walk(node.typeAnnotation, (child) => {
      if (isBase64Call(child)) found = true;
    });
  }
  return found;
}

function isBase64Field(node) {
  const name = propertyName(node.key);
  return isBase64FileName(name) || hasIsBase64(node);
}

function maxLengthAmount(node) {
  const amounts = [];
  const decorators = node.decorators ?? [];
  for (const decorator of decorators) {
    const expression = decorator.expression;
    if (expression.type !== "CallExpression") continue;
    const name = calleeName(expression.callee);
    if (name === "MaxLength" || name === "maxLength") {
      amounts.push(numericValue(expression.arguments[0]));
    }
    if (name === "Length" && expression.arguments.length >= 2) {
      amounts.push(numericValue(expression.arguments[1]));
    }
  }
  const pieces = [node.value, node.typeAnnotation].filter(Boolean);
  for (const piece of pieces) {
    walk(piece, (child) => {
      if (child.type !== "CallExpression") return;
      const name = calleeName(child.callee);
      if (name === "max" || name === "maxLength") amounts.push(numericValue(child.arguments[0]));
    });
  }
  const known = amounts.filter((amount) => typeof amount === "number");
  if (known.length === 0) return null;
  return Math.min(...known);
}

function reportField(context, node, messageId) {
  const target = node.key ?? node;
  context.report({ node: target, messageId });
}

function isDataUri(value) {
  return typeof value === "string" && /^data:[^;,]+;base64,/i.test(value);
}

export const uploadRules = {
  "no-base64-file-upload": {
    meta: {
      type: "problem",
      docs: { description: BASE64_MESSAGE },
      schema: [],
      messages: { banned: BASE64_MESSAGE },
    },
    create(context) {
      const filename = context.filename ?? "";
      if (!isUploadSurface(filename)) return {};
      return {
        "PropertyDefinition, Property, TSPropertySignature"(node) {
          if (!node.key || node.type === "Property" && node.method) return;
          if (node.type === "Property" && node.parent && node.parent.type !== "ObjectExpression" && node.parent.type !== "TSTypeLiteral") {
            return;
          }
          if (!isBase64Field(node)) return;
          reportField(context, node, "banned");
        },
        Literal(node) {
          if (isDataUri(node.value)) context.report({ node, messageId: "banned" });
        },
        TemplateLiteral(node) {
          const raw = node.quasis.map((quasi) => quasi.value.cooked ?? "").join("");
          if (node.expressions.length === 0 && isDataUri(raw)) context.report({ node, messageId: "banned" });
        },
        CallExpression(node) {
          if (calleeName(node.callee) !== "from") return;
          const object = node.callee.type === "MemberExpression" ? node.callee.object : null;
          if (!object || object.type !== "Identifier" || object.name !== "Buffer") return;
          const encoding = node.arguments[1];
          if (!encoding || encoding.type !== "Literal" || encoding.value !== "base64") return;
          if (!looksLikeFileBytes(node.arguments[0])) return;
          context.report({ node, messageId: "banned" });
        },
      };
    },
  },
  "base64-upload-max-length": {
    meta: {
      type: "problem",
      docs: { description: SIZE_MESSAGE },
      schema: [],
      messages: { size: SIZE_MESSAGE },
    },
    create(context) {
      const filename = context.filename ?? "";
      if (!isUploadSurface(filename)) return {};
      return {
        "PropertyDefinition, Property, TSPropertySignature"(node) {
          if (!node.key) return;
          if (!isBase64Field(node)) return;
          const cap = maxLengthAmount(node);
          if (cap !== null && cap <= ONE_MIB && cap > 0) return;
          reportField(context, node, "size");
        },
      };
    },
  },
  "multipart-upload-limits": {
    meta: {
      type: "problem",
      docs: { description: LIMITS_MESSAGE },
      schema: [],
      messages: { limits: LIMITS_MESSAGE, type: TYPE_MESSAGE },
    },
    create(context) {
      return {
        CallExpression(node) {
          const name = calleeName(node.callee);
          if (!INTERCEPTORS.has(name)) return;
          const options = optionsNode(name, node.arguments);
          const limits = options ? objectProperty(options, "limits") : undefined;
          const fileSize = limits ? objectProperty(limits, "fileSize") : undefined;
          if (!positiveFileSize(fileSize)) {
            context.report({ node, messageId: "limits" });
          }
          const method = enclosingMethod(node);
          const typeRoot = method ?? options;
          const filter = options ? objectProperty(options, "fileFilter") : undefined;
          const typed = Boolean(filter) || hasTypeValidation(typeRoot);
          if (!typed) context.report({ node, messageId: "type" });
        },
      };
    },
  },
};
