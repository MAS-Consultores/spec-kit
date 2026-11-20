export function label(value: Date): string {
  return new Intl.DateTimeFormat("es-CL").format(value);
}
