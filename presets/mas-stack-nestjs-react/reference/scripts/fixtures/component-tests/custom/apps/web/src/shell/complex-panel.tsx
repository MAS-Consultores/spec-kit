export function ComplexPanel(value: number): string {
  if (value > 0) {
    if (value > 10) return "high";
    return "mid";
  }
  if (value < 0) return "low";
  return "zero";
}
