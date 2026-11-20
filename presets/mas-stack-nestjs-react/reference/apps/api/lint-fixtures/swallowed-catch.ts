export function read(parse: () => string): string {
  try {
    return parse();
  } catch {
    return "";
  }
}
