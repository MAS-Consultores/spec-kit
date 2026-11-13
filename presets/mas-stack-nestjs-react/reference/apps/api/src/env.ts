export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in the environment. This process has no fallback value.`,
    );
  }
  return value;
}
