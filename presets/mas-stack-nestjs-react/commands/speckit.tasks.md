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
- `apps/api` devDependency `@modelcontextprotocol/client` at the latest stable (note: `@nestjs/mcp/testing` imports it and does not declare it)
- `nest-cli.json` `builder: swc` plus `typeCheck: true`, scripts `start:e2e` (`nest build && node dist/main.js`) and `openapi:generate` that sets `OPENAPI_GENERATE=1` before importing compiled `main` (never `tsx src/main.ts`)
- compiled `exports` for `packages/contracts` (`@demo/contracts`)
- `ThrottlerGuard` via `{ provide: APP_GUARD, useClass: ThrottlerGuard }` next to `ThrottlerModule`, not `new ThrottlerGuard()`
- `createPrismaAbility`, `accessibleBy(...).ofType(...)`, and `@casl/prisma/runtime` when the Prisma output is custom
- source-only `packages/ui`, workspace `components.json` aliases, `cn` import check, and `radix-ui`
- dependency `shadcn` (the CSS imports `shadcn/tailwind.css`; `shadcn init` does not add primitives) and a non-interactive `shadcn add` for button, input, table, dialog, form, label, card, badge, select, dropdown-menu, and skeleton
- `@theme inline`, `tw-animate-css`, `shadcn/tailwind.css`, and `@source` in `apps/web/src/index.css`
- committed `routeTree.gen.ts` (ESLint-ignored, not gitignored)
- Playwright chromium install, dedicated e2e database via `migrate deploy` + truncate + seed, `storageState` per role, and private webServer ports
- loaders that call `queryClient.query(options)`
- `allowBuilds` in `pnpm-workspace.yaml`: `true` for prisma, `@prisma/engines`, argon2, esbuild, `@swc/core`, and msw; `false` for `@scarf/scarf`. A package with an install script that is missing from the map fails pnpm 12; add it explicitly (`true` only when the script is required) instead of `pnpm approve-builds --all`
- mandatory `.nvmrc` with the exact Active LTS from `https://nodejs.org/dist/index.json` (first entry whose `lts` is not false), the same major in `engines.node` (`>=<major>`), `@types/node`, CI, Docker, and the README, and Corepack setup `npm i -g corepack@latest && corepack enable` (Node 25+ does not bundle Corepack; exact global `pnpm@X.Y.Z` is the alternative). Do not copy a Node version from memory. Example as of 2026-11-13: `26.13.1` / `>=26`

{CORE_TEMPLATE}
