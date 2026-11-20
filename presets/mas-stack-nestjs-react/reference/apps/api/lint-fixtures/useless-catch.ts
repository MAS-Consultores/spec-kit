export function pass(parse: () => string): string {
  try {
    return parse();
  } catch (error) {
    throw error;
  }
}
