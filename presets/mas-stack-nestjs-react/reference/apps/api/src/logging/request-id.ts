import { randomUUID } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveRequestId(header: unknown): string {
  if (typeof header === "string" && UUID.test(header.trim())) return header.trim();
  return randomUUID();
}

export function assignRequestId(
  header: unknown,
  setHeader: (name: string, value: string) => void,
): string {
  const id = resolveRequestId(header);
  setHeader("X-Request-Id", id);
  return id;
}
