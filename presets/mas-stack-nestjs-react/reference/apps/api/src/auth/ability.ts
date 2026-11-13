import { createPrismaAbility } from "@casl/prisma";

export function createAppAbility(scopes: readonly string[]) {
  return createPrismaAbility(
    scopes.map((scope) => ({ action: scope, subject: "Note" })),
  );
}

export type AppAbility = ReturnType<typeof createAppAbility>;
