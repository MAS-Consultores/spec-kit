export function tomorrow(value: Date): Date {
  return new Date(value.getTime() + 86_400_000);
}

export function shift(value: Date): void {
  value.setDate(value.getDate() + 1);
}

export function nextDay(value: Date): Date {
  return new Date(value.getTime() + 24 * 60 * 60 * 1000);
}
