export function clean(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
