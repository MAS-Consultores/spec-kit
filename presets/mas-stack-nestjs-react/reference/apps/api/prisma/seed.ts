import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const url = process.env["SEED_DATABASE_URL"];
if (!url) {
  console.error(
    "ERROR: SEED_DATABASE_URL is required. prisma db seed reads DATABASE_URL from .env; this seed refuses that value so the e2e database stays separate.",
  );
  process.exit(1);
}
if (url === process.env["DATABASE_URL"]) {
  console.error("ERROR: SEED_DATABASE_URL must differ from DATABASE_URL.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: url })) });

const password = await argon2.hash("password123", { type: argon2.argon2id });

async function user(email: string, codes: string[]): Promise<void> {
  const saved = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: password, deletedAt: null },
    create: { email, passwordHash: password },
  });
  for (const code of codes) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code },
    });
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: saved.id, permissionId: permission.id } },
      update: {},
      create: { userId: saved.id, permissionId: permission.id },
    });
  }
}

await user("admin@example.com", ["notes:ver", "notes:crear", "notes:eliminar"]);
await user("reader@example.com", ["notes:ver"]);
await prisma.$disconnect();
console.log("seed ok");
