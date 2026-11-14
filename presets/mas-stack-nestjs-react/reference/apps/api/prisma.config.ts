import { defineConfig } from "prisma/config";
import { migrationDatabaseUrl } from "./prisma/database-url.mjs";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: migrationDatabaseUrl(process.env),
  },
  migrations: {
    seed: "node --import tsx prisma/seed.ts",
  },
});
