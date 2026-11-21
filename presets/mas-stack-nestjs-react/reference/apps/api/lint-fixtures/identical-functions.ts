export function left(value: number): number {
  const doubled = value + value;
  const shifted = doubled + value;
  return shifted + doubled;
}

export function right(value: number): number {
  const doubled = value + value;
  const shifted = doubled + value;
  return shifted + doubled;
}
