declare module "../../scripts/e2e-ports.mjs" {
  export function choosePorts(options: {
    file: string;
    freshMs?: number;
    now?: number;
  }): Promise<{ api: number; web: number }>;
}
