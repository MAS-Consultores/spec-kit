---
description: NestJS + React task requirements on top of MAS task generation.
strategy: wrap
---

## Reference skeleton

Tasks that create the monorepo MUST start from `.specify/reference/` and adapt
it. Do not schedule a from-scratch rewrite of patterns that directory already
contains.

## NestJS + React Task Requirements

Read `.specify/memory/stack-context.md` and apply every item under "Mandatory Auth Phase", "pnpm verify tasks", and "Mandatory Setup Tasks".

When `apps/api` has no `AuthModule`, `tasks.md` MUST contain a blocking auth phase before user stories: login, HttpOnly cookies, CSRF, rotating refresh tokens with reuse detection, roles, and a user seed.

When the feature includes authentication (login, account recovery, one-time passwords or tokens, session issuance, password change, or mail that carries auth secrets), `tasks.md` MUST include a task for each authentication security rule, including the test that covers it. Mark a rule not applicable only with a reason. The rules are:

- [ ] One-time passwords and tokens are single-use: consumed atomically on first success and invalidated by any later successful login or password change
- [ ] Account recovery and login never reveal account existence or why a login was rejected: same status, body, and similar latency; every rejection path pays the Argon2 cost (stored Argon2id hash when one exists, otherwise a fixed dummy Argon2id hash with the same parameters as real hashes, including missing account, missing credential, inactive, locked or blocked, and any other 401 that does not verify a real hash); hashing, database writes, and email cannot change the response
- [ ] Lockout and rate-limit counters update in one transaction (per-key lock or atomic upsert-increment): never read-then-write, never count-then-insert, reject inside the transaction, purge expired rows in that transaction, and include a concurrency test
- [ ] Client IP for audit and rate limits comes from `request.ip`; `X-Forwarded-For` is trusted only through an explicit configured trust-proxy setting, and values are validated
- [ ] A session that must change its password, or is otherwise restricted, carries no business scopes; guards allow only change-password, logout, and me; refresh does not reissue scopes
- [ ] Outbound SMTP that carries secrets requires TLS (`secure` or `requireTLS`); plaintext only for a loopback dev mail catcher
- [ ] Password change and session revocation invalidate existing access tokens and refresh tokens (reject tokens issued before `passwordChangedAt` or an older token version; refresh checks before issuing)
- [ ] Guard bypasses compare the parsed path only and never use `originalUrl.includes` or `url.includes`
- [ ] Tests cover every rule that applies

Do not add a task that restores a notes or widgets example, a demonstration screen, or an `example.com` account. The skeleton seed inserts no rows. A feature that needs accounts owns that seed and uses addresses from the spec.

Also require tasks for:

- `apps/api/prisma.config.ts` at the API package root with `schema: 'prisma/schema'` and `migrations.path` pointing at `prisma/migrations`, both absolute via `import.meta.dirname` (one file per domain; generator only in `base.prisma`)
- Prisma models in English, PascalCase, and singular, with `@@map` to English snake_case plural tables and `@map` to snake_case columns. No Spanglish and no Spanish persisted enum codes. A 1:1 external-source field may keep its source name on the model; the task still maps the column to snake_case and documents the exception
- dependency versions copied from the tested `.specify/reference/` `package.json` files and `pnpm-lock.yaml` (latest stable already proven in CI, no prereleases). Do not run `npm view` to choose them. TypeScript stays the pin in that lockfile (the typescript-eslint peer exception)
- `openapi:generate`, `api-client:generate`, and an AST-based `scripts/check-casl.ts` inside `pnpm verify`. HTTP handlers use `@Public()` (no session: login, refresh, health), `@Authenticated()` (valid session, no CASL permission: logout, me, and session-only feature reads), or `@Can('category:action')` (permission-gated feature routes). A handler with none of the three fails the check. MCP tools still require `@Can` and matching `scopes`; `@Authenticated` does not replace a tool scope
- `apps/api` devDependency `@modelcontextprotocol/client` at the latest stable (note: `@nestjs/mcp/testing` imports it and does not declare it)
- `nest-cli.json` `builder: swc` plus `typeCheck: true`, scripts `start:e2e` (`nest build && node dist/main.js`) and `openapi:generate` that sets `OPENAPI_GENERATE=1` before importing compiled `main` (never `tsx src/main.ts`)
- compiled `exports` for `packages/contracts` (`@demo/contracts`)
- `ThrottlerGuard` via `{ provide: APP_GUARD, useClass: ThrottlerGuard }` next to `ThrottlerModule`, not `new ThrottlerGuard()`
- `createPrismaAbility`, `accessibleBy(...).ofType(...)`, and `@casl/prisma/runtime` when the Prisma output is custom
- source-only `packages/ui`, workspace `components.json` aliases, `cn` import check, and `radix-ui`
- dependency `shadcn` (the CSS imports `shadcn/tailwind.css`; `shadcn init` does not add primitives) and a non-interactive `shadcn add` for button, input, table, dialog, form, label, card, badge, select, dropdown-menu, and skeleton
- `@theme inline`, `tw-animate-css`, `shadcn/tailwind.css`, and `@source` in `apps/web/src/index.css`
- committed `routeTree.gen.ts` (ESLint-ignored, not gitignored)
- Playwright chromium install, dedicated e2e database via `migrate deploy` + truncate + seed, `storageState` per role, and private webServer ports. Vite proxies `/api` in dev and preview to the API port. Playwright uses the web origin and calls `/api` through that proxy (same-origin cookies and CSRF). `CORS_ORIGIN` stays empty unless the browser calls the API host directly, in which case CORS is explicit and credentialed
- when the spec ports an HTML prototype, tasks for **Prototype fidelity** in the stack constitution: extract tokens into `prototype-tokens.json` and theme from that file, copy brand assets with a manifest (no text logo), self-host the same font weights, copy keyframes and transitions with `prefers-reduced-motion`, port shell design (header, rail, widths, gradients, collapsed and mobile) without porting CDN, jQuery, sim-bar, or scripts, and run `pnpm test:fidelity` on `specs/<feature>/fidelity-map.json`. When the prototype uses an icon library, tasks install that official npm package, set `apps/web/ui.icons.json`, import each glyph from the central module `apps/web/src/icons/index.ts` (no CDN, no second library, no direct import from a feature), and set `data-icon`. Do not assign `lucide-react` when the prototype names another library. Include `pnpm lint` as the primary icon and color gate (`mas/icon-library`, `mas/no-literal-color`, `scripts/check-colors.mjs`) and `pnpm test:fidelity` as the backup that compares computed color, font-family, hover (`hover()`), active, `data-icon`, and axe `color-contrast`
- mandatory test tasks (analyze marks CRITICAL if any are absent): at least one supertest e2e per REST endpoint against real Postgres, including 401, CASL 403, refresh rotation, and throttling 429; at least one MCP e2e per tool (Bearer 401, scope denial, success) against that Postgres; at least one Playwright spec with axe per user story (`screenshot`/`video`/`trace` `'off'`); unit tests for every domain service, guard, and CASL policy. Implement cannot finish without running those suites
- loaders that call `queryClient.query(options)`
- `allowBuilds` in `pnpm-workspace.yaml`: `true` for prisma, `@prisma/engines`, argon2, esbuild, `@swc/core`, and msw; `false` for `@scarf/scarf`. A package with an install script that is missing from the map fails pnpm 12; add it explicitly (`true` only when the script is required) instead of `pnpm approve-builds --all`
- **Modularidad estricta** from the stack constitution, including `pnpm gen:module` for a new domain and `pnpm lint` (ESLint + dependency-cruiser + negative fixtures + `scripts/lint-migrations.mjs`)
- **Migraciones seguras sobre datos existentes**: a new migration file for every schema change (never edit one already applied), expand/contract for destructive changes, `-- mas:allow-destructive <motivo>` on `DROP` and renames, and a CI job `upgrade-on-data` copied from `.specify/reference/.github/workflows/upgrade-on-data.yml` (base migrations, seed, then `prisma migrate deploy`). Local `pnpm db:setup` uses one loopback database when `SEED_DATABASE_URL` is unset; CI keeps a separate `SEED_DATABASE_URL`
- flat `eslint.config.js` (not `.eslintrc.cjs`) with `eslint-plugin-boundaries` (`apps/api` and `apps/web` do not import each other; `apps/api` does not import `@demo/ui`; `packages/contracts` imports no app; shared types and schemas go in `packages/contracts`; `madge` stays for cycles), no Prisma in controllers or MCP tools (the domain service owns the query), `process.env` / `requiredEnv` only in `apps/api/src/config` (Nest `ConfigModule` + Zod) plus `prisma.config.ts`, `prisma/database-url.ts`, scripts, and e2e configs, no `useEffect` outside `apps/web/src/shared/hooks/**` (server state uses TanStack Query), `eslint-disable` only with a justification or ticket after `--`, and `@ts-ignore` / `@ts-expect-error` only with a description. Disabling `no-explicit-any` is forbidden outright. `pnpm verify` runs `pnpm lint` and `pnpm lint:fixtures`
- mandatory `.nvmrc` with the exact Active LTS from `https://nodejs.org/dist/index.json` (first entry whose `lts` is not false), the same major in `engines.node` (`>=<major>`), `@types/node`, CI, Docker, and the README, and Corepack setup `npm i -g corepack@latest && corepack enable` (Node 25+ does not bundle Corepack; exact global `pnpm@X.Y.Z` is the alternative). Do not copy a Node version from memory. Example as of 2026-11-13: `26.13.1` / `>=26`

{CORE_TEMPLATE}
