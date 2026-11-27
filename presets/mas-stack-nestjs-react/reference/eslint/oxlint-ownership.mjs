/**
 * Rules that oxlint owns. ESLint turns the same ids off (eslint-plugin-oxlint
 * at the end of the flat config) unless HARNESS_ESLINT_FULL=1, which the
 * ratchet and the diff check set so coverage does not drop.
 * Both linters understand `eslint-disable-next-line <rule> -- reason`.
 * An oxlint-only disable leaves a gap when ESLint runs with the rules on.
 */

export const FULL_ESLINT_ENV = ["HARNESS", "ESLINT", "FULL"].join("_");

export const OXLINT_OWNED = [
  { oxlint: "max-params", eslint: "max-params", severity: "error" },
  { oxlint: "max-lines", eslint: "max-lines", severity: "error" },
  { oxlint: "complexity", eslint: "complexity", severity: "error" },
  { oxlint: "no-magic-numbers", eslint: "no-magic-numbers", severity: "warn" },
  { oxlint: "max-depth", eslint: "max-depth", severity: "error" },
  { oxlint: "typescript/no-explicit-any", eslint: "@typescript-eslint/no-explicit-any", severity: "error" },
  { oxlint: "react/rules-of-hooks", eslint: "react-hooks/rules-of-hooks", severity: "error" },
  { oxlint: "react/exhaustive-deps", eslint: "react-hooks/exhaustive-deps", severity: "error" },
  { oxlint: "import/no-cycle", eslint: "import-x/no-cycle", severity: "error" },
];

const DISABLE_RE = /(?:eslint|oxlint)-disable(?:-next-line|-line)?/;

export function ownedEslintIds() {
  return OXLINT_OWNED.map((rule) => rule.eslint);
}

export function disableCommentGap(text) {
  const value = text.startsWith("/*") || text.startsWith("//") ? text : `/*${text}*/`;
  const mentionsEslint = /\beslint-disable\b/.test(value);
  const mentionsOxlint = /\boxlint-disable\b/.test(value);
  if (!mentionsEslint && !mentionsOxlint) return null;
  if (mentionsOxlint && !mentionsEslint) {
    return "hueco: un oxlint-disable no apaga la regla cuando ESLint corre con HARNESS_ESLINT_FULL";
  }
  if (!DISABLE_RE.test(value)) return null;
  const after = value.replace(/^.*?eslint-disable(?:-next-line|-line)?/, "");
  const beforeReason = after.split("--")[0] ?? "";
  const ids = beforeReason
    .replace(/\*\//g, " ")
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.startsWith("@") || /^[a-z0-9-]+(?:\/[a-z0-9-]+)?$/i.test(part));
  if (ids.length === 0) {
    return "hueco: eslint-disable sin regla tapa el archivo entero";
  }
  return null;
}
