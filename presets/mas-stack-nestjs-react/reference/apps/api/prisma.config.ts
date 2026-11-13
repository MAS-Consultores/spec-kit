import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["SEED_DATABASE_URL"] ?? process.env["DATABASE_URL"],
  },
  migrations: {
    seed: "node --import tsx prisma/seed.ts",
  },
});
