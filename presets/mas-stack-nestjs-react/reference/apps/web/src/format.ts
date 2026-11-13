export function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CL").format(value);
}
