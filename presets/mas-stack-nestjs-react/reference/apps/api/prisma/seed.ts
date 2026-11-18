import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { seedDatabaseUrl } from "./database-url.js";

let url: string;
try {
  url = seedDatabaseUrl(process.env);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "SEED_DATABASE_URL is required";
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: url })) });
await prisma.$disconnect();
console.log("seed ok");
