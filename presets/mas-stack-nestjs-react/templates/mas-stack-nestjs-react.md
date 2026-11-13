# MAS Stack Scaffold: NestJS + React (API + SPA)

This document defines the mandatory structure and checklist for NestJS + React
monorepo projects. The stack produces a decoupled architecture with `apps/api`
(NestJS + Prisma + PostgreSQL) and `apps/web` (React + Vite + TypeScript)
communicating over HTTP.

## Getting Started

Initialize a new project with the NestJS + React stack. You MUST specify the
`--integration` flag — without it, your coding tool is not configured.

### Cursor

```bash
specify init . --stack nestjs-react --integration cursor-agent
```

- **Key**: `cursor-agent` (not `cursor`)
- **Skills location**: `.cursor/skills/speckit-*/SKILL.md`
- **Invocation**: `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, etc.
- Run commands from Cursor's chat panel, not the terminal.

### Codex CLI

```bash
specify init . --stack nestjs-react --integration codex
```

- **Key**: `codex`
- **Skills location**: `.agents/skills/speckit-*/SKILL.md`
- **Invocation**: `$speckit-specify`, `$speckit-plan`, `$speckit-tasks`, etc.
  (dollar prefix)
- Run commands from Codex's chat interface.

### Claude Code

```bash
specify init . --stack nestjs-react --integration claude
```

- **Key**: `claude`
- **Skills location**: `.claude/skills/speckit-*/SKILL.md`
- **Invocation**: `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, etc.
- Run commands from Claude Code's chat panel.

## Architecture Overview

- **`apps/api`**: NestJS backend with Prisma ORM, PostgreSQL database, REST API
  with OpenAPI documentation
- **`apps/web`**: React SPA built with Vite, consuming typed API clients
  generated from OpenAPI
- **`packages/contracts`**: Shared Zod schemas and types; the single source of
  truth for validation and the only coupling between `apps/api` and `apps/web`
- **`packages/ui`**: Shared Tailwind CSS + shadcn/ui primitives consumed by
  `apps/web`

## Key Differences from Laravel + Inertia + React

This stack is a **decoupled API + SPA** architecture, not a server-rendered
monolith. The API and frontend are independent applications with explicit HTTP
contracts, enabling independent deployment and scaling.

## Mandatory Structure Checklist

The following structure MUST be present for a valid `nestjs-react` project:

### Monorepo Root (Required)

- [ ] `pnpm-workspace.yaml` with `apps/*` and `packages/*`
- [ ] `pnpm-lock.yaml` committed (NOT `package-lock.json` or `yarn.lock`)
- [ ] Root `package.json` with:
  - `packageManager: 'pnpm@X.Y.Z'` (exact version for Corepack)
  - `engines: { node: '>=<LTS>' }`
  - `scripts.verify` (chains all offline checks)
- [ ] `.nvmrc` with Node LTS version
- [ ] `tsconfig.base.json` (shared TypeScript config)
- [ ] `.eslintrc.cjs` with `eslint-plugin-boundaries` rules
- [ ] `.swcrc` with `legacyDecorator: true` and `decoratorMetadata: true`

### apps/api (Required)

- [ ] `package.json` with `"type": "module"` (NestJS 12 ESM)
- [ ] `src/main.ts` — NestJS bootstrap with:
  - Global prefix `/api` with health exclude
  - Swagger setup at `/docs`
  - Helmet, CORS, cookie-parser
  - `app.enableShutdownHooks()`
- [ ] `src/app.module.ts` — Root module importing all feature modules
- [ ] `src/modules/` — Domain modules (one per bounded context)
- [ ] `src/common/` — Infrastructure modules:
  - `PrismaModule` (exports `ExtendedPrismaClient`)
  - `ConfigModule` (Zod env validation)
  - `AuthModule` (`@nestjs/passport` + `@nestjs/jwt`)
  - `AuthzModule` (custom `@Can()` + `PermissionsGuard`)
  - `AuditModule` (append-only logging)
  - `ClsModule` (`nestjs-cls` for context)
  - `I18nModule` (`nestjs-i18n`)
  - `HealthModule` (`@nestjs/terminus`)
- [ ] `prisma/schema.prisma` with Prisma 7.x config:
  - `generator client { provider = "prisma-client" output = "../src/generated/prisma" moduleFormat = "esm" importFileExtension = "js" }`
  - `datasource db { provider = "postgresql" }` (no url; use prisma.config.ts)
- [ ] `prisma/prisma.config.ts` — Prisma 7.x config with `defineConfig({ schema, datasource: { url }, migrate: { adapter } })`
- [ ] `prisma/migrations/` — Migration files (run `prisma migrate deploy` pre-deploy)
- [ ] `src/generated/prisma/` — Generated Prisma client (gitignored, SWC compiles to dist)
- [ ] `vitest.config.ts` (Vitest for NestJS 12 ESM)
- [ ] `.env.example` documenting all required variables

### apps/web (Required)

- [ ] `package.json` with `"type": "module"`
- [ ] `src/main.tsx` — React entry point with providers
- [ ] `src/routes/` — TanStack Router file-based routes
- [ ] `src/features/` — Feature modules (one per domain)
- [ ] `src/shared/` — App shell and layout only
- [ ] `vite.config.ts` with TanStack Router plugin
- [ ] `vitest.config.ts` for component tests
- [ ] `e2e/` — Playwright E2E tests
- [ ] `playwright.config.ts` with `screenshot: 'off'`, `video: 'off'` or
  `'retain-on-failure'`, `trace: 'off'` or `'retain-on-failure'` (no screenshots
  in tests: no `page.screenshot()`, no `toHaveScreenshot()`)
- [ ] AI agents MUST NOT take, generate, or save ad hoc screenshots during
  `/speckit.implement`, demos, or pilots—not with Playwright, not with a
  browser, and not with scripts. Visual review is performed by a human
  (revisión visual humana). Playwright + axe-core gates, including computed
  Tailwind style verification, remain mandatory and MUST run without
  screenshots (`screenshot: 'off'`; no `toHaveScreenshot()`; no
  `page.screenshot()`)
- [ ] `tailwind.config.ts`

### packages/contracts (Required)

- [ ] `src/` — Shared Zod schemas
- [ ] `src/pagination.schema.ts` — Standard pagination
- [ ] `src/rfc9457.schema.ts` — RFC 9457 error schema
- [ ] `src/index.ts` — Barrel export
- [ ] `package.json` with TypeScript build

### packages/ui (Required)

- [ ] `src/components/` — shadcn/ui components
- [ ] `tailwind.config.ts` — Shared Tailwind config
- [ ] `package.json`

### scripts/ (Required)

- [ ] `scripts/permissions-sync.ts` — `pnpm permissions:sync`
- [ ] `scripts/openapi-generate.ts` — `pnpm openapi:generate`

### docker/ (Recommended)

- [ ] `Dockerfile` — Multi-stage, non-root user
- [ ] `docker-compose.yml` — Local PostgreSQL + Mailpit
