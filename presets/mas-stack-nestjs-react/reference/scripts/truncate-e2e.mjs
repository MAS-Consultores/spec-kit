import { createRequire } from "node:module";

const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const pg = require("pg");
const url = process.env.SEED_DATABASE_URL;
if (!url) {
  console.error("ERROR: SEED_DATABASE_URL is required to truncate the e2e database");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(
  'TRUNCATE TABLE "AuditLog", "Note", "RefreshToken", "UserPermission", "Permission", "User" RESTART IDENTITY CASCADE',
);
await client.end();
console.log("truncated e2e database");
