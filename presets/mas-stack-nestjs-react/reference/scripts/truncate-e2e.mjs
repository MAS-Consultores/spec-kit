import { createRequire } from "node:module";

const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const pg = require("pg");
const url = process.env.SEED_DATABASE_URL;
if (typeof url !== "string" || url.trim() === "") {
  console.error("ERROR: SEED_DATABASE_URL is required to truncate the e2e database");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
const found = await client.query(
  `SELECT table_name
   FROM information_schema.tables
   WHERE table_type = 'BASE TABLE'
     AND table_schema = current_schema()
     AND table_name <> '_prisma_migrations'`,
);
const tables = found.rows.map((row) => `"${String(row.table_name).replace(/"/g, '""')}"`);
if (tables.length === 0) {
  console.log("no application tables to truncate");
} else {
  await client.query(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`);
  console.log(`truncated ${String(tables.length)} tables`);
}
await client.end();
