---
description: NestJS + React task requirements on top of MAS task generation.
strategy: wrap
---

## NestJS + React Task Requirements

Read `.specify/memory/stack-context.md` and apply every item under "Mandatory Auth Phase", "pnpm verify tasks", and "Mandatory Setup Tasks".

When `apps/api` has no `AuthModule`, `tasks.md` MUST contain a blocking auth phase before user stories: login, HttpOnly cookies, CSRF, rotating refresh tokens with reuse detection, roles, and a user seed.

Also require tasks for:

- `apps/api/prisma.config.ts` at the API package root with `schema: 'prisma/schema.prisma'`
- dependency versions resolved with `npm view` (latest stable, no prereleases; TypeScript limited by the typescript-eslint peer)
- `openapi:generate`, `api-client:generate`, and an AST-based `scripts/check-casl.ts` inside `pnpm verify`
- `createPrismaAbility`, `accessibleBy(...).ofType(...)`, and `@casl/prisma/runtime` when the Prisma output is custom
- source-only `packages/ui`, workspace `components.json` aliases, `cn` import check, and `radix-ui`
- `@theme inline`, `tw-animate-css`, `shadcn/tailwind.css`, and `@source` in `apps/web/src/index.css`
- committed `routeTree.gen.ts` (ESLint-ignored, not gitignored)
- Playwright chromium install, dedicated e2e database via `migrate deploy` + truncate + seed, `storageState` per role, and private webServer ports
- loaders that call `queryClient.query(options)`
- `allowBuilds: true` for prisma, `@prisma/engines`, argon2, esbuild, `@swc/core`, and msw

{CORE_TEMPLATE}
