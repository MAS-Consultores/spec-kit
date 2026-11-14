/**
 * Migrations always use DATABASE_URL.
 * Seed always uses SEED_DATABASE_URL.
 * A missing value and a blank string are the same: unset. Neither falls through to the other.
 */

export function migrationDatabaseUrl(env) {
  const value = env.DATABASE_URL;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      "DATABASE_URL is required for prisma migrate. An empty value is unset and does not fall through to SEED_DATABASE_URL.",
    );
  }
  return value;
}

export function seedDatabaseUrl(env) {
  const value = env.SEED_DATABASE_URL;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      "SEED_DATABASE_URL is required. An empty value is unset. prisma db seed must not use DATABASE_URL.",
    );
  }
  if (value === env.DATABASE_URL) {
    throw new Error("SEED_DATABASE_URL must differ from DATABASE_URL.");
  }
  return value;
}
