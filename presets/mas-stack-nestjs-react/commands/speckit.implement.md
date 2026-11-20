---
description: NestJS + React completion gate on top of MAS implement.
strategy: wrap
---

## Reference skeleton

Implement by copying `.specify/reference/` and adapting it to the feature.
Do not recreate auth, Prisma, MCP, shadcn, or the Playwright health check
from memory when that tree is present.

## NestJS + React completion gate

Do not declare the feature finished, and do not merge, until these suites have been executed and their output is in the report:

- API e2e: supertest against the SWC build (`start:e2e`) and real Postgres. At least one test per REST endpoint, including 401, CASL 403, refresh-token rotation, and throttling 429.
- MCP e2e: Bearer and scopes against that Postgres. At least one test per MCP tool.
- Playwright with axe-core: at least one spec per user story. `screenshot`, `video`, and `trace` stay `'off'`. When the feature adds login and more than one locale, run the spec copied from `.specify/reference/templates/i18n-login.spec.ts`.
- When the prototype repeats a settings card or a badge-and-switch row, the reusable component matches that structure and `pnpm test:fidelity` covers its computed border, radius, shadow, padding, typography, and colors. `pnpm lint` (`scripts/check-settings-card.mjs`, `mas/no-literal-color`) stays at 0.
- When `spec.md` ports an HTML prototype, follow **Prototype fidelity** in the stack constitution: tokens from `prototype-tokens.json`, copied brand assets (never a text logo), literal motion with `prefers-reduced-motion`, and the shell design (header, rail, widths, gradients, collapsed and mobile). Scaffolding (CDN, jQuery, icon CDN scripts, sim-bar, scripts) stays out. Use the prototype's icon library through `apps/web/ui.icons.json` and `apps/web/src/icons/index.ts`, with `data-icon` on each glyph. Do not substitute `lucide-react` when the prototype names another library. Keep literal colors out of components and out of CSS other than `apps/web/src/index.css`. `pnpm lint` is the primary gate. Run `pnpm test:fidelity` against `specs/<feature>/fidelity-map.json` (computed color, hover, active, `data-icon`, axe `color-contrast`). Do not finish while it fails. The command never takes a screenshot, video, or trace.
- Unit tests for each domain service, guard, and CASL policy.

A run that only has a few unit tests and a single Playwright spec does not meet the gate.

## Modularidad estricta

Follow **Bitácora de actividad** in the stack constitution. Each mutating handler uses `@Audit('event.key')` with a catalog key, or `@NoAudit('motivo')` when the spec records that exception. Do not finish while `mas/require-audit-on-mutations` fails.

Follow **Modularidad estricta** in the stack constitution. New domains come from `pnpm gen:module <dominio>`. Do not register a domain by editing another domain. `pnpm lint` must stay at 0.

Follow **Migraciones seguras sobre datos existentes**. Do not edit a migration that is already on the base branch. Add a new migration. Do not add `NOT NULL` without `DEFAULT` or a backfill, and do not `UPDATE` a column to NULL while it is still `NOT NULL`. Destructive SQL needs `-- mas:allow-destructive <motivo>`. `pnpm db:seed` does not deploy production.

## Lint the agent must keep green

`eslint.config.js` is flat config. Do not add `.eslintrc.cjs`.

- `eslint-plugin-boundaries`: `apps/api` and `apps/web` never import each other; `apps/api` does not import `@demo/ui`; `packages/contracts` imports no app. Shared types and schemas go in `packages/contracts`. Keep `madge` for cycles.
- Controllers and MCP tools never touch Prisma (`PrismaClient`, `@prisma/client`, the generated client, `PrismaService`). Queries go to the domain service.
- Read `process.env` and `requiredEnv` only in `apps/api/src/config` (Nest `ConfigModule` with Zod). Add the variable to that module and `.env.example`, then inject `ConfigService`. `prisma.config.ts`, `prisma/database-url.ts`, scripts, and e2e configs (including `vite.config.ts` for `API_PROXY_TARGET`) may still read the environment.
- Do not add `useEffect` outside `apps/web/src/shared/hooks/**`. Server state goes through TanStack Query.
- Do not add `eslint-disable` without a justification or ticket after `--`. Do not add `@ts-ignore` or `@ts-expect-error` without a description. Disabling `no-explicit-any` is forbidden outright.

{CORE_TEMPLATE}
