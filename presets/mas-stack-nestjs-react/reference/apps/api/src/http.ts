export function readCookie(request: object, name: string): string | undefined {
  const bag: unknown = Reflect.get(request, "cookies");
  if (typeof bag !== "object" || bag === null) {
    return undefined;
  }
  const value: unknown = Reflect.get(bag, name);
  return typeof value === "string" ? value : undefined;
}

export function headerLines(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  return [];
}
