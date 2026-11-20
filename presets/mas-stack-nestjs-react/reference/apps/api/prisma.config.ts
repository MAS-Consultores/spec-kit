import path from "node:path";
import { defineConfig } from "prisma/config";
import { migrationDatabaseUrl } from "./prisma/database-url.js";

const apiRoot = import.meta.dirname;

export default defineConfig({
  schema: path.join(apiRoot, "prisma", "schema"),
  datasource: {
    url: migrationDatabaseUrl(process.env),
  },
  migrations: {
    path: path.join(apiRoot, "prisma", "migrations"),
    seed: "node --import tsx prisma/seed.ts",
  },
});
