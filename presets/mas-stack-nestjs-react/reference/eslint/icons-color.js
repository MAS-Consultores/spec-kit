import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

/**
 * Icon library and literal colors. pnpm lint is the primary gate.
 * The library in apps/web/ui.icons.json is the only one allowed, and only
 * the central module may import it. lucide-react is the fallback when the
 * prototype names no icon library: change the JSON, do not add a second import.
 */

const ICON_MESSAGE =
  "Import icons only from the central module declared in apps/web/ui.icons.json. A feature file must not import the icon package. Per-icon imports stay in that module (no CDN).";

const LIBRARY_MESSAGE =
  "apps/web/ui.icons.json names the only icon package. Importing another library is forbidden. When the prototype uses Font Awesome, Material Symbols, Lucide, or another set, set library to that official npm package. lucide-react is only the fallback when the prototype defines no icons.";

const COLOR_MESSAGE =
  "No literal colors in components. Use a token from apps/web/src/index.css. Hex, rgb/rgba, hsl/hsla, oklch, white, black, and Tailwind classes such as text-[#fff], bg-white, or text-black belong only in that theme file.";

const KNOWN_LIBRARIES = [
  "lucide-react",
  "react-icons",
  "react-feather",
  "@mui/icons-material",
  "@fortawesome/react-fontawesome",
  "@fortawesome/fontawesome-svg-core",
  "@fortawesome/free-solid-svg-icons",
  "@fortawesome/free-regular-svg-icons",
  "@fortawesome/free-brands-svg-icons",
  "@phosphor-icons/react",
  "@heroicons/react",
  "@tabler/icons-react",
];

const COLOR_IN_TEXT =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\(|(?:text|bg|border|fill|stroke|from|to|via|ring|outline|caret|accent|decoration|divide|placeholder|shadow)-(?:white|black)\b|(?:text|bg|border|fill|stroke|from|to|via)-\[[^\]]*(?:#[0-9a-fA-F]{3,8}|white|black|rgb|hsl)/;

let cachedConfig;

function loadIconConfig(cwd) {
  const path = join(cwd, "apps/web/ui.icons.json");
  if (!existsSync(path)) {
    return { library: "lucide-react", module: "apps/web/src/icons/index.ts" };
  }
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  return {
    library: typeof parsed.library === "string" ? parsed.library : "lucide-react",
    module: typeof parsed.module === "string" ? parsed.module : "apps/web/src/icons/index.ts",
  };
}

function iconConfig(cwd) {
  if (!cachedConfig) cachedConfig = loadIconConfig(cwd);
  return cachedConfig;
}

function isKnownIconSource(source) {
  if (source.startsWith("@fortawesome/")) return true;
  if (source.startsWith("react-icons/") || source.startsWith("@mui/icons-material")) return true;
  return KNOWN_LIBRARIES.some((name) => source === name || source.startsWith(`${name}/`));
}

function sameLibrary(source, library) {
  return source === library || source.startsWith(`${library}/`);
}

function isCentralModule(filename, modulePath) {
  const file = normalize(filename).replaceAll("\\", "/");
  const expected = modulePath.replaceAll("\\", "/");
  return file.endsWith(expected);
}

function isCentralImport(source) {
  return (
    source === "@/icons" ||
    source.endsWith("/icons") ||
    source.endsWith("/icons/index") ||
    source.endsWith("/icons/index.ts") ||
    source.endsWith("/icons/index.js")
  );
}

export const iconColorRules = {
  "icon-library": {
    meta: {
      type: "problem",
      docs: { description: LIBRARY_MESSAGE },
      schema: [],
      messages: { direct: ICON_MESSAGE, library: LIBRARY_MESSAGE },
    },
    create(context) {
      const config = iconConfig(context.cwd ?? process.cwd());
      const central = isCentralModule(context.filename ?? "", config.module);
      return {
        ImportDeclaration(node) {
          const source = node.source.value;
          if (typeof source !== "string") return;
          if (isCentralImport(source)) return;
          if (!isKnownIconSource(source) && !sameLibrary(source, config.library)) return;
          if (!sameLibrary(source, config.library)) {
            context.report({ node, messageId: "library" });
            return;
          }
          if (!central) context.report({ node, messageId: "direct" });
        },
      };
    },
  },
  "no-literal-color": {
    meta: {
      type: "problem",
      docs: { description: COLOR_MESSAGE },
      schema: [],
      messages: { color: COLOR_MESSAGE },
    },
    create(context) {
      const filename = context.filename ?? "";
      if (!filename.endsWith(".tsx") && !filename.endsWith(".jsx")) return {};
      function check(node, value) {
        if (typeof value === "string" && COLOR_IN_TEXT.test(value)) {
          context.report({ node, messageId: "color" });
        }
      }
      return {
        Literal(node) {
          check(node, node.value);
        },
        TemplateElement(node) {
          check(node, node.value.cooked ?? node.value.raw);
        },
      };
    },
  },
};
