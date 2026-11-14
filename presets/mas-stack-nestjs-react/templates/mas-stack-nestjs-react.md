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
- **Skills location**: `.cursor/skills/speckit-*/SKILL.md` (not `.cursor/commands`)
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

- [ ] `pnpm-workspace.yaml` with `packages: [apps/*, packages/*]` and an explicit `allowBuilds` map: `true` for `prisma`, `@prisma/engines`, `argon2`, `esbuild`, `@swc/core`, and `msw`; `false` for `@scarf/scarf`. pnpm 12 fails when an install script is omitted. Add new packages by hand (`true` only if the script is required). `pnpm approve-builds --all` writes `false`; do not use it as the source of truth.
- [ ] Copy `package.json` and `pnpm-lock.yaml` from `.specify/reference/`. Do not run `npm view` to pick versions. TypeScript stays the lockfile pin (typescript-eslint peer exception).
- [ ] `pnpm-lock.yaml` committed (NOT `package-lock.json` or `yarn.lock`)
- [ ] Root `package.json` with:
  - `packageManager: 'pnpm@X.Y.Z'` (exact pnpm pin)
  - `engines: { node: '>=<Active LTS major>' }` (example as of 2026-11-13: `>=26`; the major comes from the index, not from memory)
  - `scripts.verify` (chains all offline checks)
- [ ] `.nvmrc` is mandatory and contains the exact Active LTS version (example as of 2026-11-13: `26.13.1`, codename Lithium). Node 22 is Maintenance, not Active.
- [ ] Node version resolved only from `https://nodejs.org/dist/index.json`: first entry whose `lts` is not `false` (the file is newest-first; that entry is the highest Active LTS semver). Never Current, odd, or alpha/beta/rc, and never a version from memory or from nodejs.org prose pages. Same major in `@types/node`, CI, Docker (`node:<major>-alpine@sha256:<digest>`), and the README.
- [ ] One-liner (prints exact version, then major): `curl -s https://nodejs.org/dist/index.json | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const hit=JSON.parse(s).find(e=>e.lts!==false);if(!hit){console.error("no Active LTS");process.exit(1)}const exact=hit.version.replace(/^v/,"");console.log(exact);console.log(exact.split(".")[0])})'`
- [ ] Corepack is not bundled on Node 25+ (the `node-v26.13.1` tarball has no `bin/corepack`; Node 24 still does). Enable pnpm with `npm i -g corepack@latest && corepack enable`, or install the exact `pnpm@X.Y.Z` globally.
- [ ] Prisma 7.x stable `engines.node` includes the Active LTS major (`>=24.0` on 7.10.1). The CLI warning for majors above 24 is expected and must not fail the build. Do not install Prisma 8 prereleases.
- [ ] `tsconfig.base.json` (shared TypeScript config)
- [ ] `.eslintrc.cjs` with `eslint-plugin-boundaries` rules
- [ ] `.swcrc` with `legacyDecorator: true` and `decoratorMetadata: true`
- [ ] `apps/api/nest-cli.json` with `compilerOptions.builder: "swc"` and `compilerOptions.typeCheck: true`
- [ ] API scripts: `dev` is `nest start --watch`; `build` is `nest build`; `start:e2e` is `nest build && node dist/main.js`; `openapi:generate` builds with SWC and sets `OPENAPI_GENERATE=1` before importing compiled `main`. Never `tsx src/main.ts` for the Nest process (`tsx` is only for `prisma.seed`)

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
- [ ] `apps/api/prisma.config.ts` (package root, not `prisma/prisma.config.ts`) with `schema: 'prisma/schema.prisma'`
- [ ] `tsconfig.json` includes src and tests (editor + ESLint `projectService`); `tsconfig.build.json` includes only `src` for `nest build` (`rootDir: src` → `dist/generated/prisma/client.js`)
- [ ] Seed script: `node --import tsx prisma/seed.ts` (`tsx` dependency). Do not use `node --experimental-strip-types` for the seed.
- [ ] Test DB reset: `prisma migrate deploy` + `TRUNCATE`, never `prisma migrate reset`
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
- [ ] `playwright.config.ts` with `screenshot: 'off'`, `video: 'off'`, and
  `trace: 'off'` (no screenshots in tests: no `page.screenshot()`, no
  `toHaveScreenshot()`)
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
- [ ] `package.json` with a real build and `exports` pointing at compiled `.js` (not `.ts`). Specifiers inside the package use `.js`. `dev`, `start:e2e`, and `openapi:generate` build this package before the API process starts

### packages/ui (Required)

- [ ] Source-only package: `exports` map `./components/*` → `./src/components/*.tsx` (no `dist` build)
- [ ] `components.json` aliases use the workspace package name (not the npm package `cn`)
- [ ] Direct dependency `radix-ui`; `cn` imported from the local utils module
- [ ] `apps/web/src/index.css` has `@theme inline`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, and `@source` for `packages/ui/src`
- [ ] `--destructive` meets WCAG 2.1 AA; sonner does not use `richColors`
- [ ] `apps/web/src/routeTree.gen.ts` is committed (excluded from ESLint only, not from git)

### scripts/ (Required)

- [ ] `scripts/permissions-sync.ts` — `pnpm permissions:sync`
- [ ] `scripts/openapi-generate.ts` — `pnpm openapi:generate`
- [ ] `scripts/check-casl.ts` — copy `templates/check-casl.ts` from this preset (TypeScript AST, not regex) and wire it into `pnpm verify` with `openapi:generate` and `api-client:generate`
- [ ] `pnpm verify` and quickstart commands use `pnpm --filter` with the `name` from each `package.json` (for example `@demo/api`), not the directory name alone

### docker/ (Recommended)

- [ ] `Dockerfile` — Multi-stage, non-root user
- [ ] `docker-compose.yml` — Local PostgreSQL + Mailpit
