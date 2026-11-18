import { createPrismaAbility } from "@casl/prisma";

/** `audits:ver` -> subject `Audit`. Scope resource, singular, PascalCase. */
export function subjectFor(scope: string): string {
  const resource = scope.split(":")[0] ?? "";
  const singular = resource.endsWith("s") ? resource.slice(0, -1) : resource;
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

export function createAppAbility(scopes: readonly string[]) {
  return createPrismaAbility(
    scopes.map((scope) => ({ action: scope, subject: subjectFor(scope) })),
  );
}

export type AppAbility = ReturnType<typeof createAppAbility>;
