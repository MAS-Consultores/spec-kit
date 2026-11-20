export async function main(): Promise<void> {
  const app = {
    use(_middleware: unknown): void {
      return undefined;
    },
    listen(port: number): Promise<void> {
      void port;
      return Promise.resolve();
    },
  };
  await app.listen(3001);
}
