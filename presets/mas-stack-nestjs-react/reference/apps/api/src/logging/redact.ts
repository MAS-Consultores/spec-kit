const SENSITIVE = [
  "password",
  "token",
  "authorization",
  "cookie",
  "set-cookie",
  "rut",
  "email",
  "refreshtoken",
] as const;

export const REDACTED = "[Redacted]";

function isSensitiveKey(key: string): boolean {
  return (SENSITIVE as readonly string[]).includes(key.toLowerCase());
}

/** Oculta los campos sensibles en cualquier nivel. No incluye el valor en claro. */
export function redactSensitive(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (typeof value !== "object" || value === null) return value;
  if (seen.has(value)) return REDACTED;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, seen));
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redactSensitive(item, seen);
  }
  return output;
}
