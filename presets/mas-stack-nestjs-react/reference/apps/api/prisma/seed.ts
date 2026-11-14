import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { seedDatabaseUrl } from "./database-url.mjs";
import { seedSlice } from "./slice-seed.js";

let url: string;
try {
  url = seedDatabaseUrl(process.env);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "SEED_DATABASE_URL is required";
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: url })) });

const password = await argon2.hash("password123", { type: argon2.argon2id });

async function user(email: string): Promise<void> {
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: password, deletedAt: null },
    create: { email, passwordHash: password },
  });
}

await user("admin@example.com");
await user("reader@example.com");
await seedSlice(prisma);
await prisma.$disconnect();
console.log("seed ok");
