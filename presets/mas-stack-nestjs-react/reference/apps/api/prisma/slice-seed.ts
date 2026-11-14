import type { PrismaClient } from "../src/generated/prisma/client.js";

export async function seedSlice(prisma: PrismaClient): Promise<void> {
  async function grant(email: string, codes: string[]): Promise<void> {
    const saved = await prisma.user.findUniqueOrThrow({ where: { email } });
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

  await grant("admin@example.com", ["notes:ver", "notes:crear", "notes:eliminar"]);
  await grant("reader@example.com", ["notes:ver"]);
}
