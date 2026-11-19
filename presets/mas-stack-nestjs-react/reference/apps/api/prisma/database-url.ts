/**
 * Migrations always use DATABASE_URL.
 * A missing value and a blank string are unset. Migrate does not fall through to SEED_DATABASE_URL.
 *
 * Seed uses SEED_DATABASE_URL when that variable is set, and it must differ from DATABASE_URL.
 * When SEED_DATABASE_URL is unset, seed uses DATABASE_URL only if its host is loopback
 * (127.0.0.1, localhost, or ::1). Any other host is refused.
 */

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function migrationDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const value = env["DATABASE_URL"];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      "DATABASE_URL is required for prisma migrate. An empty value is unset and does not fall through to SEED_DATABASE_URL.",
    );
  }
  return value;
}

export function databaseHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isLoopbackDatabaseUrl(url: string): boolean {
  const host = databaseHost(url);
  return host !== null && LOOPBACK_HOSTS.has(host);
}

export function seedDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const seed = env["SEED_DATABASE_URL"];
  const database = env["DATABASE_URL"];
  const seedUnset = typeof seed !== "string" || seed.trim() === "";
  if (!seedUnset) {
    if (seed === database) {
      throw new Error("SEED_DATABASE_URL must differ from DATABASE_URL.");
    }
    return seed;
  }
  if (typeof database !== "string" || database.trim() === "") {
    throw new Error(
      "SEED_DATABASE_URL is unset and DATABASE_URL is unset. Refusing to seed.",
    );
  }
  const url = database.trim();
  if (!isLoopbackDatabaseUrl(url)) {
    throw new Error(
      "SEED_DATABASE_URL is unset. pnpm db:seed uses DATABASE_URL only when its host is 127.0.0.1, localhost, or ::1.",
    );
  }
  return url;
}
