---
description: NestJS + React analysis checks on top of core analyze.
strategy: wrap
---

## NestJS + React Analysis Requirements

After the core analysis, read `.specify/memory/stack-context.md` and `tasks.md`.

Mark **CRITICAL** when the project has no `AuthModule` and `tasks.md` lacks a blocking auth phase covering login, HttpOnly cookies, CSRF, rotating refresh with reuse detection, roles, and a user seed.

Also mark **CRITICAL** when `tasks.md` has no tasks for `openapi:generate`, `api-client:generate`, or an AST-based CASL check in `pnpm verify`, or when it still requires `ensureQueryData`, `prisma/prisma.config.ts`, `MongoAbility` / `createMongoAbility` for Prisma queries, or gitignoring `routeTree.gen.ts`.

{CORE_TEMPLATE}
