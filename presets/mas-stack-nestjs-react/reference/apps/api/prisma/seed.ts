import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { seedDatabaseUrl } from "./database-url.js";

function readSeedUrl(): string {
  try {
    return seedDatabaseUrl(process.env);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "SEED_DATABASE_URL is required";
    process.stderr.write(`ERROR: ${message}\n`);
    throw error;
  }
}

const url = readSeedUrl();

const prisma = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: url })) });
await prisma.$disconnect();
process.stdout.write("seed ok\n");
